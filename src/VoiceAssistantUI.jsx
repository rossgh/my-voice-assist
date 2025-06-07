import React, { useRef, useEffect, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

const AZURE_SPEECH_KEY = "CvfyBJcFIkwFoTa7OS23Rcbmp8s1Z8kuunMmoff7YC3GTKHo4MzGJQQJ99BFACHYHv6XJ3w3AAAYACOGIfBa";
const AZURE_REGION = "eastus2";
const API_URL = "https://copilot-voice-api-d8cue9bah3ezaegb.centralus-01.azurewebsites.net";

// Minimal button for mic (no svg, just text)
function AnimatedMic({ active, onClick, disabled }) {
  return (
    <button
      className={`w-32 h-16 rounded-full shadow-lg font-bold text-lg focus:outline-none transition-all
        ${active ? "bg-blue-600 text-white" : "bg-blue-500 text-white hover:bg-blue-600"} 
        ${disabled ? "opacity-60" : ""}`}
      onClick={onClick}
      disabled={disabled}
      style={{ zIndex: 2 }}
      aria-label="Mic"
      type="button"
    >
      {active ? "Stop Listening" : "Start Talking"}
    </button>
  );
}

export default function VoiceAssistantUI() {
  const initialBotMsg = "How can I help you today?";
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [interimText, setInterimText] = useState("");
  const recognizerRef = useRef(null);
  const audioRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  // Azure Speech SDK recognition logic
  const startRecognition = () => {
    setInterimText("");
    setListening(true);

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = "en-US";
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (_s, e) => {
      setInterimText(e.result.text);
    };
    recognizer.recognized = (_s, e) => {
      if (e.result.text) {
        setInterimText("");
        handleSend(e.result.text);
      }
    };
    recognizer.sessionStopped = () => {
      setListening(false);
      recognizer.close();
    };
    recognizer.canceled = () => {
      setListening(false);
      recognizer.close();
    };

    recognizerRef.current = recognizer;
    recognizer.startContinuousRecognitionAsync();
  };

  const stopRecognition = () => {
    recognizerRef.current && recognizerRef.current.stopContinuousRecognitionAsync();
    setListening(false);
  };

  function stripEmojis(text) {
    return text.replace(/([\u231A-\u231B]|\u23E9|\u23EA|\u23EB|\u23EC|\u23F0|\u23F3|\u25FD|\u25FE|\u2614|\u2615|\u2648-\u2653|\u267F|\u2693|\u26A1|\u26AA|\u26AB|\u26BD|\u26BE|\u26C4|\u26C5|\u26CE|\u26D4|\u26EA|\u26F2|\u26F3|\u26F5|\u26FA|\u26FD|\u2705|\u270A|\u270B|\u2728|\u274C|\u274E|\u2753-\u2755|\u2757|\u2795-\u2797|\u27B0|\u27BF|\u2B1B|\u2B1C|\u2B50|\u2B55|\u1F004|\u1F0CF|\u1F18E|\u1F191-\u1F19A|\u1F1E6-\u1F1FF|\u1F201-\u1F202|\u1F21A|\u1F22F|\u1F232-\u1F23A|\u1F250-\u1F251|\u1F300-\u1F320|\u1F32D-\u1F335|\u1F337-\u1F37C|\u1F37E-\u1F393|\u1F3A0-\u1F3CA|\u1F3CF-\u1F3D3|\u1F3E0-\u1F3F0|\u1F3F4|\u1F3F8-\u1F43E|\u1F440|\u1F442-\u1F4FC|\u1F4FF-\u1F53D|\u1F54B-\u1F54E|\u1F550-\u1F567|\u1F57A|\u1F595-\u1F596|\u1F5A4|\u1F5FB-\u1F64F|\u1F680-\u1F6C5|\u1F6CB-\u1F6D2|\u1F6E0-\u1F6E5|\u1F6F0-\u1F6F3|\u1F910-\u1F93A|\u1F93C-\u1F93E|\u1F940-\u1F945|\u1F947-\u1F94C|\u1F950-\u1F96B|\u1F980-\u1F997|\u1F9C0|\u1F9D0-\u1F9E6|\u200D|\u2640|\u2642|\u2600-\u26FF|\u2700-\u27BF]+|[\uD83C-\uDBFF\uDC00-\uDFFF]+)/g, "");
  }

  async function playTTS(text, voice = "en-US-AndrewMultilingualNeural", onEnd) {
    const cleanText = stripEmojis(text.replace(/[#*]+/g, ""));
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' name='${voice}'>
          ${cleanText}
        </voice>
      </speak>
    `;
    try {
      setSpeaking(true);
      const ttsResponse = await fetch(`${API_URL}/speak?voice=${voice}`, {
        method: "POST",
        headers: { "Content-Type": "application/ssml+xml" },
        body: ssml
      });
      if (!ttsResponse.ok) throw new Error("TTS failed");
      const blob = await ttsResponse.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        if (onEnd) onEnd();
      };
      audio.play();
    } catch (e) {
      setSpeaking(false);
      if (onEnd) onEnd();
    }
  }

  const handleMicClick = () => {
    if (!started) {
      setStarted(true);
      setMessages([{ sender: "assistant", text: initialBotMsg }]);
      playTTS(initialBotMsg, "en-US-AndrewMultilingualNeural", () => {
        setTimeout(() => startRecognition(), 350);
      });
    } else if (!listening) {
      startRecognition();
    }
  };

  const handlePauseListening = () => {
    if (started && listening) {
      stopRecognition();
    }
  };

  const handleSend = async (input) => {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { sender: "user", text: input }]);
    stopRecognition();

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      let reply = data.response || data.reply || "No response from server.";
      setMessages((msgs) => [...msgs, { sender: "assistant", text: reply }]);
      playTTS(reply, "en-US-AndrewMultilingualNeural", () => {
        setTimeout(() => startRecognition(), 400);
      });
    } catch {
      setMessages((msgs) => [...msgs, { sender: "assistant", text: "Sorry, there was an error." }]);
      setTimeout(() => startRecognition(), 400);
    }
  };

  const handleEnd = () => {
    setStarted(false);
    setMessages([]);
    setInterimText("");
    setListening(false);
    setSpeaking(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopRecognition();
  };

  // Landing UI (just text and mic)
  if (!started) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-2xl font-bold text-center mb-2 mt-14">Just say the word</h1>
        <p className="text-gray-600 text-lg text-center max-w-xl mb-12">
          Try speaking out loud, just like you would converse with a real person, and hear the responses you get back.
        </p>
        <div className="fixed bottom-7 left-0 right-0 flex justify-center z-10">
          <AnimatedMic active={false} onClick={handleMicClick} />
        </div>
      </div>
    );
  }

  // Chat UI
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-2">
      <div className="w-full max-w-xl min-h-[80vh] flex flex-col pt-8 pb-4 relative">
        <button
          onClick={handleEnd}
          className="absolute top-0 right-0 m-4 bg-gray-100 hover:bg-red-500 hover:text-white text-gray-900 px-6 py-2 rounded-full font-semibold shadow transition-all"
        >
          End
        </button>
        <div className="flex-1 flex flex-col gap-3 px-2 sm:px-6" style={{overflowY: 'auto'}}>
          {messages.map((msg, idx) => (
            <div key={idx} className="flex flex-row items-start my-2">
              {msg.sender === "assistant" ? (
                <div className="w-full">
                  <div className="bg-gray-100 rounded-xl p-4 text-gray-800 shadow-sm text-base max-w-[80%] animate-fade-in">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div className="flex flex-row-reverse w-full">
                  <div className="bg-blue-50 text-blue-900 rounded-xl p-4 shadow-sm ml-auto text-base max-w-[80%] animate-fade-in">
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Only show interimText as plain text */}
          {interimText && (
            <div className="flex flex-row-reverse w-full opacity-70">
              <div className="bg-blue-100 border border-blue-200 text-blue-900 rounded-xl p-4 shadow-sm ml-auto text-base max-w-[80%] animate-fade-in">
                <span>{interimText}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="fixed bottom-7 left-0 right-0 flex justify-center z-10">
          <AnimatedMic
            active={listening || speaking}
            onClick={listening ? handlePauseListening : handleMicClick}
            disabled={speaking}
          />
          <div className="text-center text-gray-600 text-lg mt-2" style={{minHeight: 28}}>
            {listening && "Listening..."}
            {speaking && "Speaking..."}
          </div>
        </div>
      </div>
    </div>
  );
}
