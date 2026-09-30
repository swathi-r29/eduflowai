import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ChevronLeft, ChevronRight, Shuffle, Sparkles, CheckCircle } from 'lucide-react';

export interface Flashcard {
  id?: string | number;
  front: string;
  back: string;
  concept?: string;
}

interface FlashcardViewerProps {
  cards: Flashcard[];
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export default function FlashcardViewer({ cards, onRegenerate, isGenerating }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

  if (!cards || cards.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-400 text-sm mb-3">No flashcards available yet.</p>
        {onRegenerate && (
          <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={onRegenerate} disabled={isGenerating}>
            <Sparkles size={16} /> {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </button>
        )}
      </div>
    );
  }

  const currentCard = cards[currentIndex] || cards[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const toggleMastered = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKnownCards((prev) => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-center text-sm border-b border-base-700 pb-3">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="text-brand-indigo" size={18} />
          <span>Interactive Flashcards</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Card {currentIndex + 1} of {cards.length}</span>
          <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
            {knownCards.size}/{cards.length} Mastered
          </span>
        </div>
      </div>

      {/* Flashcard container with 3D perspective flip */}
      <div className="perspective-1000 min-h-[220px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${isFlipped}`}
            initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`w-full min-h-[220px] rounded-xl p-6 flex flex-col justify-between shadow-lg transition-colors border ${
              isFlipped
                ? 'bg-gradient-to-br from-brand-indigo/30 via-base-800 to-base-900 border-brand-indigo/50'
                : 'bg-gradient-to-br from-base-800 via-base-800 to-base-900 border-base-700 hover:border-slate-500'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-xs px-2.5 py-1 rounded font-semibold uppercase tracking-wider ${isFlipped ? 'bg-brand-indigo/30 text-indigo-300' : 'bg-base-700 text-slate-300'}`}>
                {isFlipped ? 'Answer / Explanation' : 'Question / Concept'}
              </span>
              <button
                type="button"
                onClick={toggleMastered}
                className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                  knownCards.has(currentIndex)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-base-700/50 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle size={14} />
                {knownCards.has(currentIndex) ? 'Mastered' : 'Mark Mastered'}
              </button>
            </div>

            <div className="my-auto py-4 text-center">
              <p className={`text-lg font-medium leading-relaxed ${isFlipped ? 'text-indigo-100' : 'text-slate-100'}`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="flex items-center gap-1 text-slate-500">
                <RotateCw size={12} /> Click card to flip
              </span>
              {currentCard.concept && (
                <span className="text-slate-400 italic">Topic: {currentCard.concept}</span>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <button className="btn-secondary text-xs flex items-center gap-1" onClick={handlePrev}>
          <ChevronLeft size={16} /> Previous
        </button>

        <div className="flex gap-2">
          {onRegenerate && (
            <button className="btn-secondary text-xs flex items-center gap-1" onClick={onRegenerate} disabled={isGenerating}>
              <RotateCw size={14} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>

        <button className="btn-primary text-xs flex items-center gap-1" onClick={handleNext}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
