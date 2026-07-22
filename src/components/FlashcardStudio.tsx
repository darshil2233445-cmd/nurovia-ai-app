import React, { useState, useEffect } from "react";
import { BookOpen, HelpCircle, Plus, RefreshCw, Check, AlertCircle, ArrowLeft, ArrowRight, Award, X } from "lucide-react";
import { Flashcard } from "../types";
import MathText from "./MathText";

interface FlashcardStudioProps {
  generatedCards: Flashcard[];
  topicName?: string;
}

const FALLBACK_DECK: Flashcard[] = [
  {
    front: "What is an Ecosystem?",
    back: "A biological community of interacting organisms and their physical environment."
  },
  {
    front: "What are Mitochondria?",
    back: "The powerhouse of the cell: organelles responsible for generating energy (ATP) through cellular respiration."
  },
  {
    front: "What is Newton's Third Law?",
    back: "For every action, there is an equal and opposite reaction."
  },
  {
    front: "What is the Big O complexity of Binary Search?",
    back: "O(log n) because the search space is divided in half at each step."
  },
  {
    front: "What is the difference between compiler and interpreter?",
    back: "A compiler translates the entire source code into machine code at once, whereas an interpreter translates it line-by-line during runtime."
  }
];

export default function FlashcardStudio({ generatedCards, topicName }: FlashcardStudioProps) {
  const [deck, setDeck] = useState<Flashcard[]>(FALLBACK_DECK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [customFront, setCustomFront] = useState("");
  const [customBack, setCustomBack] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Learning statistics state
  const [scores, setScores] = useState<{ [index: number]: "correct" | "incorrect" }>({});

  // Sync with note generator deck if it changes
  useEffect(() => {
    if (generatedCards && generatedCards.length > 0) {
      setDeck(generatedCards);
      setCurrentIndex(0);
      setFlipped(false);
      setScores({});
    }
  }, [generatedCards]);

  const handleNext = () => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleMarkScore = (type: "correct" | "incorrect") => {
    setScores(prev => ({ ...prev, [currentIndex]: type }));
    handleNext();
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFront.trim() || !customBack.trim()) return;
    const newCard: Flashcard = {
      front: customFront.trim(),
      back: customBack.trim()
    };
    setDeck(prev => [...prev, newCard]);
    setCustomFront("");
    setCustomBack("");
    setShowAddForm(false);
  };

  const currentCard = deck[currentIndex];
  const correctCount = Object.values(scores).filter(s => s === "correct").length;
  const progressPercent = Math.round(((currentIndex + 1) / deck.length) * 100);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Studio Header & Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full uppercase tracking-wider font-display">
            {topicName ? `Deck: ${topicName}` : "Interactive Flashcard Studio"}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display mt-2">
            Spaced Repetition Practice
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Card {currentIndex + 1} of {deck.length} • {correctCount} Mastered
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
          >
            <Plus size={16} /> Add Custom Card
          </button>
        </div>
      </div>

      {/* Add Custom Card Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCard}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-md space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">Create Custom Flashcard</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1">
                Question / Term (Front)
              </label>
              <input
                type="text"
                value={customFront}
                onChange={(e) => setCustomFront(e.target.value)}
                placeholder="e.g., What is Newton's Second Law?"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-blue-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1">
                Answer / Definition (Back)
              </label>
              <textarea
                rows={3}
                value={customBack}
                onChange={(e) => setCustomBack(e.target.value)}
                placeholder="e.g., F = ma (Force equals mass times acceleration)."
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all cursor-pointer min-h-[44px]"
            >
              Save Card to Deck
            </button>
          </div>
        </form>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Interactive 3D Flip Card Container */}
      {currentCard && (
        <div className="perspective-1000 w-full min-h-[300px] sm:min-h-[340px]">
          <div
            onClick={() => setFlipped(!flipped)}
            className={`w-full min-h-[300px] sm:min-h-[340px] rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-lg cursor-pointer flex flex-col justify-between transition-all duration-500 preserve-3d relative ${
              flipped ? "rotate-y-180 bg-blue-50/40 dark:bg-slate-800/80 border-blue-300 dark:border-blue-700" : "hover:border-blue-400"
            }`}
          >
            {/* Front Side */}
            <div className={`backface-hidden flex flex-col justify-between h-full space-y-6 ${flipped ? "hidden" : "block"}`}>
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider font-display">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <HelpCircle size={16} /> Question / Term
                </span>
                <span>Click or tap card to flip</span>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 text-center font-display leading-snug my-auto">
                <MathText text={currentCard.front} />
              </div>

              <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                Flip card to verify answer →
              </p>
            </div>

            {/* Back Side */}
            <div className={`rotate-y-180 backface-hidden flex flex-col justify-between h-full space-y-6 ${flipped ? "block" : "hidden"}`}>
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider font-display">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Check size={16} /> Solution / Explanation
                </span>
                <span>Click to flip back</span>
              </div>

              <div className="text-base sm:text-lg text-slate-800 dark:text-slate-100 text-center font-sans leading-relaxed my-auto">
                <MathText text={currentCard.back} />
              </div>

              <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                Rate your confidence below
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls & Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-40 min-h-[48px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={16} /> Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === deck.length - 1}
            className="flex-1 sm:flex-none px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all disabled:opacity-40 min-h-[48px] flex items-center justify-center gap-1 cursor-pointer"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>

        {/* Self-Rating Response Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleMarkScore("incorrect")}
            className="flex-1 sm:flex-none px-4 py-3 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl transition-all min-h-[48px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <AlertCircle size={16} /> Needs Review
          </button>
          <button
            onClick={() => handleMarkScore("correct")}
            className="flex-1 sm:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all min-h-[48px] flex items-center justify-center gap-1 cursor-pointer"
          >
            <Check size={16} /> Got It Right
          </button>
        </div>
      </div>
    </div>
  );
}
