import React, { useState } from "react";
import { Calendar, Sparkles, CheckCircle2, Clock, AlertTriangle, BookOpen, Loader2, Award, HeartHandshake } from "lucide-react";
import { RevisionPlan, StudentLevel, RevisionDay } from "../types";
import MathText from "./MathText";
import { saveHistoryItem } from "../historyUtils";

interface RevisionPlannerProps {
  level: StudentLevel;
}

const FALLBACK_PLAN: RevisionPlan = {
  generalStrategy: "Focus on active recall and spaced repetition for maximum retention.",
  revisionPlan: [
    {
      day: "Day 1",
      topic: "Core Fundamentals & Core Equations",
      subtopics: ["Key Definitions", "Basic Equations", "Diagnostic Practice Test"],
      frequentlyAskedQuestions: ["Define the principal variables in classical kinematics.", "What is the physical interpretation of work done?"],
      estimatedHours: 3,
      tips: "Take a short 5-minute break every 25 minutes using the Pomodoro technique. Today is about finding gaps.",
      completed: false
    },
    {
      day: "Day 2",
      topic: "Advanced Dynamics & Force Systems",
      subtopics: ["Friction coefficient calculation", "Inclined planes and pulley systems", "Free-body diagrams"],
      frequentlyAskedQuestions: ["Calculate acceleration for an object on a 30-degree frictional incline.", "Explain how tension forces scale across a dual-pulley framework."],
      estimatedHours: 3,
      tips: "Draw out all free-body diagrams in large scales. Visualizing force vectors prevents arithmetic sign errors.",
      completed: false
    },
    {
      day: "Day 3",
      topic: "Energy, Power & Conservative Forces",
      subtopics: ["Work-Energy Theorem", "Potential energy curves", "Power conversions"],
      frequentlyAskedQuestions: ["What is a conservative force? Give 2 examples.", "Prove the Work-Energy Theorem for a variable force system."],
      estimatedHours: 3.5,
      tips: "Practice translating Joules to Watts. Power is simply the time-derivative of energy transfer.",
      completed: false
    },
    {
      day: "Day 4",
      topic: "Mid-Plan Active Recall Quiz",
      subtopics: ["Spaced repetition review of Days 1-3", "Solving challenging past-paper problems", "Flashcard drilling"],
      frequentlyAskedQuestions: ["Solve Midterm Exam Question 4 regarding elastic collisions.", "Review previous mistake logs."],
      estimatedHours: 2.5,
      tips: "Don't reread! Use active recall by explaining these concepts out loud to a blank wall or a friend.",
      completed: false
    },
    {
      day: "Day 5",
      topic: "Linear Momentum & Collisions",
      subtopics: ["Conservation of linear momentum", "Elastic vs. Inelastic collisions", "Impulse calculations"],
      frequentlyAskedQuestions: ["Derive the final velocity expressions for a completely elastic head-on collision.", "What is impulse? How does it relate to airbags in cars?"],
      estimatedHours: 3,
      tips: "Remember: Momentum is always conserved in all collisions, but kinetic energy is only conserved in elastic ones.",
      completed: false
    },
    {
      day: "Day 6",
      topic: "Rotational Dynamics Basics",
      subtopics: ["Torque and angular acceleration", "Moment of inertia for standard geometries", "Rotational kinetic energy"],
      frequentlyAskedQuestions: ["Why does a solid cylinder roll down an incline faster than a hollow ring of equal mass?", "State Newton's Second Law for Rotation."],
      estimatedHours: 3,
      tips: "Match rotational variables directly to linear equivalents: Torque = Force, Inertia = Mass, Omega = Velocity.",
      completed: false
    },
    {
      day: "Day 7",
      topic: "Comprehensive Mock Exam & Final Review",
      subtopics: ["Timed 2-hour practice exam under test conditions", "Grading with rubric", "Targeted weak-point review"],
      frequentlyAskedQuestions: ["Review all past incorrect quiz items.", "Final check of formula memory sheet."],
      estimatedHours: 4,
      tips: "Simulate real exam conditions: no distractions, strict timer, closed notes. Get a good night's sleep afterwards!",
      completed: false
    }
  ]
};

export default function RevisionPlanner({ level }: RevisionPlannerProps) {
  const [planData, setPlanData] = useState<RevisionPlan>(FALLBACK_PLAN);
  const [subject, setSubject] = useState("");
  const [days, setDays] = useState(7);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject or exam name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          days,
          hoursPerDay,
          level
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: RevisionPlan = await response.json();
      setPlanData(data);

      saveHistoryItem({
        type: "planner",
        title: `Revision Schedule: ${subject}`,
        subtitle: `${days} Days • ${hoursPerDay} hrs/day (${level})`,
        data: { plan: data }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate timetable. Please try another query.");
    } finally {
      setLoading(false);
    }
  };

  const toggleDayCompletion = (index: number) => {
    setPlanData(prev => {
      const updated = [...prev.revisionPlan];
      updated[index] = {
        ...updated[index],
        completed: !updated[index].completed
      };
      return { ...prev, revisionPlan: updated };
    });
  };

  const completedCount = planData.revisionPlan.filter(d => d.completed).length;
  const progressPercent = Math.round((completedCount / planData.revisionPlan.length) * 100);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Timetable Configuration Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <Calendar className="text-amber-600 dark:text-amber-400" size={24} /> AI Study Timetable & Exam Planner
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Generate a personalized day-by-day revision roadmap with topic heatmaps and exam prep tips.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Subject or Exam Name *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. AP Physics 1 Midterm, Organic Chemistry Final, SAT Math..."
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden transition-all min-h-[48px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Available Days
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:border-blue-500 cursor-pointer min-h-[48px]"
            >
              <option value={3}>3 Days (Crash Course)</option>
              <option value={5}>5 Days (Sprint)</option>
              <option value={7}>7 Days (1 Week Standard)</option>
              <option value={14}>14 Days (2 Weeks Deep Revision)</option>
              <option value={30}>30 Days (1 Month Complete)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Study Hours / Day
            </label>
            <select
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:border-blue-500 cursor-pointer min-h-[48px]"
            >
              <option value={1}>1 Hour / Day (Light)</option>
              <option value={2}>2 Hours / Day (Moderate)</option>
              <option value={3}>3 Hours / Day (Balanced)</option>
              <option value={4}>4 Hours / Day (Intense)</option>
              <option value={6}>6 Hours / Day (Full Day Marathon)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px] font-display"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Planning Schedule...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Revision Schedule List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full uppercase tracking-wider font-display">
              Active Revision Roadmap
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-2">
              {completedCount} of {planData.revisionPlan.length} Days Completed ({progressPercent}%)
            </h3>
          </div>

          <div className="w-full sm:w-48 bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden self-center">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {planData.revisionPlan.map((day, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border transition-all ${
                day.completed
                  ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 opacity-80"
                  : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDayCompletion(idx)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      day.completed
                        ? "bg-emerald-600 text-white"
                        : "bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500"
                    }`}
                  >
                    <CheckCircle2 size={18} className={day.completed ? "text-white" : "opacity-0"} />
                  </button>
                  <div className="text-left">
                    <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-display">
                      {day.day}
                    </span>
                    <h4 className={`text-base font-bold font-display ${
                      day.completed ? "line-through text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"
                    }`}>
                      <MathText text={day.topic} />
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-display bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-xl self-start sm:self-auto">
                  <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>{day.estimatedHours} Hours</span>
                </div>
              </div>

              {/* Subtopics */}
              <div className="pt-3 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
                  Subtopics & Tasks
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {day.subtopics.map((st, stIdx) => (
                    <span
                      key={stIdx}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-sans"
                    >
                      • <MathText text={st} />
                    </span>
                  ))}
                </div>
              </div>

              {/* Study Tip */}
              {day.tips && (
                <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span><MathText text={day.tips} /></span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
