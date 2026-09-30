import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Square } from 'lucide-react';

interface AIVoiceTutorProps {
  text: string;
  language?: string; // English, Tamil, Hindi, Telugu
  className?: string;
}

export const AIVoiceTutor: React.FC<AIVoiceTutorProps> = ({ text, language = 'English', className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSupported(false);
    }
  }, []);

  const getLangCode = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('tamil')) return 'ta-IN';
    if (l.includes('hindi')) return 'hi-IN';
    if (l.includes('telugu')) return 'te-IN';
    return 'en-US';
  };

  const speak = () => {
    if (!supported || !text) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel(); // Clear existing

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(language);
    utterance.rate = rate;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isPlaying) {
      stop();
      setTimeout(() => speak(), 100);
    }
  };

  if (!supported) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-indigo-500/20 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 font-medium text-xs text-indigo-700 dark:text-indigo-300">
        <Volume2 className="w-4 h-4 text-indigo-500 animate-pulse" />
        <span>AI Voice Tutor ({language})</span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        {!isPlaying ? (
          <button
            type="button"
            onClick={speak}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? 'Resume' : 'Listen Feedback'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {(isPlaying || isPaused) && (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        )}

        <div className="flex items-center gap-1 ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Speed:</span>
          {[1.0, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleRateChange(speed)}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-all ${
                rate === speed
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIVoiceTutor;
