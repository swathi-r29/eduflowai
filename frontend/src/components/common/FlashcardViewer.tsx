import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, ChevronLeft, ChevronRight, Sparkles, Clock } from 'lucide-react';
import { api } from '../../api/client';

export interface Flashcard {
  id?: string | number;
  _id?: string;
  front: string;
  back: string;
  concept?: string;
  interval?: number;
  repetition?: number;
  dueDate?: string;
}

interface FlashcardViewerProps {
  workspaceId?: string;
  cards: Flashcard[];
  onRegenerate?: () => void;
  isGenerating?: boolean;
}

export default function FlashcardViewer({ workspaceId, cards, onRegenerate, isGenerating }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardList, setCardList] = useState<Flashcard[]>(cards);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!cardList || cardList.length === 0) {
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

  const currentCard = cardList[currentIndex] || cardList[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cardList.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cardList.length) % cardList.length);
  };

  // Submit SuperMemo-2 Quality Score (1 = Again, 3 = Hard, 4 = Good, 5 = Easy)
  const handleSM2Rating = async (quality: number) => {
    if (!workspaceId || (!currentCard._id && !currentCard.id)) {
      handleNext();
      return;
    }

    const cardId = currentCard._id || currentCard.id;
    setIsSubmitting(true);
    try {
      const res = await api.post('/study/flashcard-review', {
        workspaceId,
        cardId,
        quality
      });

      // Update card in local state with returned interval
      setCardList((prev) =>
        prev.map((c, idx) =>
          idx === currentIndex ? { ...c, interval: res.data?.card?.interval, repetition: res.data?.card?.repetition } : c
        )
      );
    } catch (e) {
      console.error('Failed to submit SM-2 card rating:', e);
    } finally {
      setIsSubmitting(false);
      handleNext();
    }
  };

  return (
    <div className="card space-y-4">
      <div className="flex justify-between items-center text-sm border-b border-base-700 pb-3">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="text-brand-indigo" size={18} />
          <span>Interactive Spaced Repetition Flashcards</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Card {currentIndex + 1} of {cardList.length}</span>
          {currentCard.interval !== undefined && currentCard.interval > 0 && (
            <span className="flex items-center gap-1 bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded font-mono">
              <Clock size={12} /> Interval: {currentCard.interval}d
            </span>
          )}
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

      {/* SM-2 Recall Rating Controls (Visible after flipped) */}
      {isFlipped ? (
        <div className="space-y-2 pt-2">
          <p className="text-xs text-center text-slate-400">How well did you know this concept?</p>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleSM2Rating(1)}
              disabled={isSubmitting}
              className="btn-secondary text-xs border-red-500/40 text-red-300 hover:bg-red-500/20 py-2 rounded"
            >
              Again (1d)
            </button>
            <button
              onClick={() => handleSM2Rating(3)}
              disabled={isSubmitting}
              className="btn-secondary text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/20 py-2 rounded"
            >
              Hard ({Math.max(1, Math.round((currentCard.interval || 1) * 1.2))}d)
            </button>
            <button
              onClick={() => handleSM2Rating(4)}
              disabled={isSubmitting}
              className="btn-secondary text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 py-2 rounded"
            >
              Good ({Math.max(1, Math.round((currentCard.interval || 1) * (currentCard.repetition ? 2.5 : 1)))}d)
            </button>
            <button
              onClick={() => handleSM2Rating(5)}
              disabled={isSubmitting}
              className="btn-primary text-xs bg-brand-indigo hover:bg-brand-indigo/80 py-2 rounded"
            >
              Easy ({Math.max(2, Math.round((currentCard.interval || 1) * 3))}d)
            </button>
          </div>
        </div>
      ) : (
        /* Navigation Controls */
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
      )}
    </div>
  );
}