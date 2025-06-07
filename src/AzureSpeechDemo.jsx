import React, { useRef, useState } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

// TODO: Replace these with your own Azure keys!
const AZURE_SPEECH_KEY = "CvfyBJcFIkwFoTa7OS23Rcbmp8s1Z8kuunMmoff7YC3GTKHo4MzGJQQJ99BFACHYHv6XJ3w3AAAYACOGIfBa";
const AZURE_REGION = "eastus2"; // e.g. "eastus"

export default function AzureSpeechDemo() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState([]);
  const recognizerRef = useRef(null);

  const startRecognition = () => {
    setFinalText([]);
    setInterim("");
    setListening(true);

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_REGION);
    speechConfig.speechRecognitionLanguage = "en-US";
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizing = (_s, e) => {
      setInterim(e.result.text);
    };
    recognizer.recognized = (_s, e) => {
      if (e.result.text) setFinalText((txt) => [...txt, e.result.text]);
      setInterim("");
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl mb-4 font-bold">Azure Speech SDK Live Demo</h2>
      <button
        className={`px-8 py-3 rounded-full font-semibold shadow-lg text-lg ${listening ? "bg-red-500 text-white" : "bg-blue-600 text-white"}`}
        onClick={listening ? stopRecognition : startRecognition}
      >
        {listening ? "Stop Listening" : "Start Listening"}
      </button>
      <div className="w-full max-w-lg mt-6">
        <div className="text-gray-500 min-h-8">{interim}</div>
        <div className="mt-3 text-black">
          {finalText.map((txt, i) => (
            <div key={i} className="py-1">{txt}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
