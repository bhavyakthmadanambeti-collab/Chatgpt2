import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Volume2, Sparkles, PhoneOff } from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  token?: string | null;
}

type VoiceState = 'listening' | 'thinking' | 'speaking' | 'idle';

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  selectedModel,
  token,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (isOpen) {
      initSpeechRecognition();
      setVoiceState('listening');
    } else {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setVoiceState('idle');
    setTranscript('');
    setAiResponse('');
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser.');
      onClose();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      setTranscript(finalTranscript);
    };

    recognition.onerror = () => {
      if (voiceState === 'listening') {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (transcript.trim() && voiceState === 'listening') {
        handleUserSpoke(transcript.trim());
      } else if (voiceState === 'listening' && !isMuted) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
  };

  const handleUserSpoke = async (userText: string) => {
    setVoiceState('thinking');
    setTranscript(userText);

    try {
      // Call chat endpoint
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          content: userText,
          model: selectedModel,
          webSearch: false,
        }),
      });

      if (!res.ok) {
        throw new Error('AI request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  fullText += data.text;
                  setAiResponse(fullText);
                }
              } catch {}
            }
          }
        }
      }

      // Now speak the answer
      speakAnswer(fullText || 'I heard you, how else can I assist?');
    } catch (err: any) {
      speakAnswer("Sorry, I had trouble processing that. Please try again.");
    }
  };

  const speakAnswer = (textToSpeak: string) => {
    setVoiceState('speaking');
    if (!('speechSynthesis' in window)) {
      setVoiceState('listening');
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown before speaking
    const cleanText = textToSpeak.replace(/[*#`_\[\]()]/g, '').slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setVoiceState('listening');
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch {}
    };

    utterance.onerror = () => {
      setVoiceState('listening');
      try {
        recognitionRef.current?.start();
      } catch {}
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
      setVoiceState('idle');
    } else {
      setVoiceState('listening');
      try {
        recognitionRef.current?.start();
      } catch {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#111] via-[#161616] to-[#0a0a0a] text-white animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="w-full max-w-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            ChatGPT Voice Mode
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Middle Animated Orb */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          {/* Outer Pulsing Glow */}
          <div
            className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full transition-all duration-700 blur-2xl ${
              voiceState === 'listening'
                ? 'bg-emerald-500/30 scale-110 animate-pulse'
                : voiceState === 'thinking'
                ? 'bg-blue-500/30 scale-125 animate-spin-slow'
                : voiceState === 'speaking'
                ? 'bg-purple-500/35 scale-120 animate-pulse'
                : 'bg-gray-700/20 scale-90'
            }`}
          />

          {/* Core Orb */}
          <div
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 border border-white/20 ${
              voiceState === 'listening'
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 shadow-emerald-500/50 scale-105'
                : voiceState === 'thinking'
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 shadow-blue-500/50 scale-100 rotate-180 animate-spin-slow'
                : voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-500 shadow-purple-500/50 scale-110'
                : 'bg-gray-800 scale-95'
            }`}
          >
            <Sparkles size={38} className="text-white/90 drop-shadow-md" />
          </div>
        </div>

        {/* State Label */}
        <div className="mt-8 text-center space-y-2 max-w-md">
          <p className="text-sm font-semibold tracking-wide uppercase text-gray-400">
            {voiceState === 'listening'
              ? 'Listening...'
              : voiceState === 'thinking'
              ? 'Thinking...'
              : voiceState === 'speaking'
              ? 'ChatGPT is speaking...'
              : 'Muted'}
          </p>

          {/* Real-time speech caption */}
          {transcript && (
            <p className="text-base sm:text-lg font-medium text-white/90 animate-in fade-in duration-200">
              "{transcript}"
            </p>
          )}

          {voiceState === 'speaking' && aiResponse && (
            <p className="text-xs text-gray-400 line-clamp-2 px-4">
              {aiResponse}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-xs flex items-center justify-around py-4">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all cursor-pointer ${
            isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button
          onClick={onClose}
          className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition-all cursor-pointer"
          title="End voice conversation"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
};
