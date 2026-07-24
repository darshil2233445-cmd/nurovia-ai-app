import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  FileText, 
  BookOpen, 
  Award, 
  Table, 
  Calendar, 
  ArrowRight, 
  Flame, 
  Target, 
  CheckCircle2, 
  TrendingUp,
  Zap,
  Clock,
  Shield,
  Activity
} from "lucide-react";
import { TargetLevel, DifficultyLevel, StudySuite } from "../types";
import AnimatedRocket from "./AnimatedRocket";
import { getRealAnalytics, RealAnalytics } from "../utils/guestStorage";

interface DashboardViewProps {
  targetLevel: TargetLevel;
  difficulty: DifficultyLevel;
  currentSuite: StudySuite | null;
  onNavigate: (tab: "chat" | "notes" | "cards" | "quiz" | "formulas" | "planner" | "history" | "settings") => void;
  onClearSuite: () => void;
}

export default function DashboardView({
  targetLevel,
  difficulty,
  currentSuite,
  onNavigate,
}: DashboardViewProps) {
  const [analytics, setAnalytics] = useState<RealAnalytics>(getRealAnalytics());

  useEffect(() => {
    setAnalytics(getRealAnalytics());
  }, []);

  // Weekly goal stats
  const goalHours = analytics.goalHours;
  const completedHours = analytics.completedHours;
  const percentage = Math.min(100, Math.round((completedHours / goalHours) * 100));

  // SVG Circular progress math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Hero Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 sm:p-10 text-white shadow-xl shadow-blue-500/10 border border-blue-400/20"
      >
        {/* Background Glow Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-indigo-400/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
              <Sparkles size={14} className="text-cyan-300 animate-pulse" />
              <span>Local Offline Engine • ID: {analytics.guestId}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display text-white">
              Welcome back, Scholar 👋
            </h1>
            <p className="text-blue-100 text-xs sm:text-base leading-relaxed font-normal opacity-90">
              Your local AI study platform is ready. Operating in direct mode for{" "}
              <span className="font-semibold text-white underline decoration-cyan-300 decoration-2 underline-offset-4">
                {targetLevel} ({difficulty})
              </span>.
            </p>
            
            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate("chat")}
                className="px-5 py-3 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-black/10 hover:bg-blue-50 transition-all flex items-center gap-2 cursor-pointer min-h-[48px]"
              >
                <AnimatedRocket size={20} showGlow={false} />
                <span>Ask AI Doubt Solver</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate("notes")}
                className="px-5 py-3 bg-blue-500/30 hover:bg-blue-500/40 text-white font-semibold text-xs sm:text-sm rounded-2xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer min-h-[48px]"
              >
                <FileText size={18} />
                <span>Simplify Notes</span>
              </motion.button>
            </div>
          </div>

          {/* Animated Circular Progress Ring Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 flex items-center gap-5 shrink-0 self-start lg:self-center shadow-inner">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="text-blue-900/30"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="text-cyan-300"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-base sm:text-lg font-black font-display text-white leading-none">{percentage}%</span>
                <span className="text-[9px] uppercase tracking-wider text-blue-200 font-semibold mt-0.5">Goal</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 font-display uppercase tracking-wider">
                <Target size={14} />
                <span>Weekly Progress</span>
              </div>
              <p className="text-lg sm:text-xl font-bold font-display text-white">
                {completedHours} / {goalHours} hrs
              </p>
              <p className="text-xs text-blue-200">
                {completedHours >= goalHours ? "Goal reached!" : `${Math.round((goalHours - completedHours) * 10) / 10} hrs remaining`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Study Suite Banner if present */}
      {currentSuite && (
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-slate-800/80 dark:to-slate-900/80 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Active Study Deck
                </span>
                <span className="text-xs text-slate-400">• Saved locally</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display mt-0.5">
                {currentSuite.topic || "Current Topic Deck"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {currentSuite.flashcards?.length || 0} Flashcards ready • {currentSuite.quiz?.length || 0} Practice Questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("cards")}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex-1 sm:flex-none text-center cursor-pointer min-h-[44px]"
            >
              Study Flashcards
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate("quiz")}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex-1 sm:flex-none text-center cursor-pointer min-h-[44px]"
            >
              Take Quiz
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Quick Metrics Bento Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display uppercase tracking-wider">Problems Solved</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AnimatedRocket size={18} showGlow={false} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display">{analytics.problemsSolved}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              <TrendingUp size={12} /> Real Data
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Quiz & Doubt questions</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display uppercase tracking-wider">Notes Mastered</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display">{analytics.notesMastered}</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={12} /> Simplified
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Notes & summaries</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display uppercase tracking-wider">Quiz Accuracy</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display">{analytics.quizAccuracy}%</span>
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full">
              <Zap size={12} /> Level {analytics.level}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Calculated from quiz scores</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display uppercase tracking-wider">Study Streak</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Flame size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-display">{analytics.streakDays} {analytics.streakDays === 1 ? 'Day' : 'Days'}</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              🔥 Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Device activity tracking</p>
        </div>

      </motion.div>

      {/* Local XP & Achievements Section */}
      <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-display flex items-center gap-1.5">
              <Zap size={14} /> Level {analytics.level} Scholar
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
              {analytics.totalXp} Total Experience Points (XP)
            </h3>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Earn XP by asking questions, solving practice quizzes, and simplifying notes!
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {analytics.achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                ach.unlocked
                  ? "bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80"
                  : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold font-display text-slate-900 dark:text-slate-100">{ach.title}</span>
                {ach.unlocked ? (
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-200/60 dark:bg-amber-900/80 px-2 py-0.5 rounded-full">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">{ach.progress}%</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {ach.description}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Feature Launchers Bento Section */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display tracking-tight">
            Study Tools & Features
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">Select a tool to begin</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Card 1: AI Doubt Solver */}
          <div
            onClick={() => onNavigate("chat")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AnimatedRocket size={22} showGlow={false} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">AI Doubt Solver</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Step-by-step problem solver with specialized AI personalities and file attachment support.
              </p>
            </div>
          </div>

          {/* Card 2: Note Simplifier */}
          <div
            onClick={() => onNavigate("notes")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">Note Simplifier</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Transform messy lecture notes or PDFs into structured summaries, flashcards, and quizzes.
              </p>
            </div>
          </div>

          {/* Card 3: Flashcard Studio */}
          <div
            onClick={() => onNavigate("cards")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={20} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">Flashcard Studio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                3D flip cards with spaced repetition memory rating to lock in long-term concept recall.
              </p>
            </div>
          </div>

          {/* Card 4: Practice Quiz */}
          <div
            onClick={() => onNavigate("quiz")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Award size={20} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">Practice Quiz Hub</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Interactive multiple-choice tests with immediate solution breakdowns and score reports.
              </p>
            </div>
          </div>

          {/* Card 5: STEM Formula Library */}
          <div
            onClick={() => onNavigate("formulas")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Table size={20} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">Formula Library</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Searchable repository of STEM formulas with interactive variable calculators and LaTeX rendering.
              </p>
            </div>
          </div>

          {/* Card 6: Study Timetable */}
          <div
            onClick={() => onNavigate("planner")}
            className="bento-card group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 min-h-[160px]"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">Study Timetable</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                AI-optimized revision schedules with priority topic heatmaps and exam countdowns.
              </p>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
