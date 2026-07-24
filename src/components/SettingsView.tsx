import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Settings,
  GraduationCap,
  Shield,
  Trash2,
  Check,
  Database,
  HardDrive,
  Cpu,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { TargetLevel, DifficultyLevel, StudyMode } from "../types";
import { getOrCreateGuestId } from "../utils/guestStorage";

interface SettingsViewProps {
  targetLevel: TargetLevel;
  setTargetLevel: (lvl: TargetLevel) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (diff: DifficultyLevel) => void;
  activeMode: StudyMode;
  setActiveMode: (mode: StudyMode) => void;
  onClearData: () => void;
}

export default function SettingsView({
  targetLevel,
  setTargetLevel,
  difficulty,
  setDifficulty,
  activeMode,
  setActiveMode,
  onClearData,
}: SettingsViewProps) {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const guestId = getOrCreateGuestId();

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Settings Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
            <Settings className="text-blue-600 dark:text-blue-400" size={24} /> Preferences & Local Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure academic difficulty levels, active local device profile, and memory maintenance.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1 font-display">
            <Check size={14} /> Saved
          </span>
        )}
      </div>

      {/* Academic Profile Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <GraduationCap size={18} className="text-blue-600 dark:text-blue-400" /> Academic Level & Pedagogy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Education Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display">
              Target Academic Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["School", "College"] as TargetLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setTargetLevel(lvl);
                    handleSaveSettings();
                  }}
                  className={`p-3.5 rounded-2xl border text-xs font-bold font-display transition-all cursor-pointer min-h-[48px] ${
                    targetLevel === lvl
                      ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20"
                      : "bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {lvl} Level
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              School focuses on foundational K-12 concepts; College applies rigorous proofs and technical depth.
            </p>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display">
              Explanation Difficulty
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["Beginner", "Advanced"] as DifficultyLevel[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => {
                    setDifficulty(diff);
                    handleSaveSettings();
                  }}
                  className={`p-3.5 rounded-2xl border text-xs font-bold font-display transition-all cursor-pointer min-h-[48px] ${
                    difficulty === diff
                      ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-sm"
                      : "bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Beginner uses intuitive analogies; Advanced provides mathematical formulas and formal terminology.
            </p>
          </div>
        </div>
      </div>

      {/* Local Device Identity Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <HardDrive size={18} className="text-emerald-600 dark:text-emerald-400" /> Device Storage & Identity
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 font-display shadow-md shadow-emerald-500/20">
              <Cpu size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">
                Device Guest ID: <span className="font-mono text-emerald-600 dark:text-emerald-400">{guestId}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Local-first mode active. All chats, notes, flashcards, and quizzes persist strictly on this device.
              </p>
            </div>
          </div>

          <span className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 font-bold font-display shrink-0">
            100% Private
          </span>
        </div>
      </div>

      {/* Data Maintenance & Cache Control */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Database size={18} className="text-rose-600 dark:text-rose-400" /> Memory Maintenance
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/60">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display">Reset Local Storage Cache</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clears saved active decks, preferences, and offline message history stored in your browser.
            </p>
          </div>

          <button
            onClick={onClearData}
            className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] shrink-0 font-display"
          >
            <Trash2 size={16} /> Clear Local Cache
          </button>
        </div>
      </div>
    </motion.div>
  );
}
