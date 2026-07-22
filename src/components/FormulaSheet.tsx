import React, { useState } from "react";
import { Table, Sparkles, BookOpen, AlertCircle, HelpCircle, Loader2, ListCollapse } from "lucide-react";
import { FormulaSheet as FormulaSheetType, StudentLevel } from "../types";
import MathText from "./MathText";
import { saveHistoryItem } from "../historyUtils";

interface FormulaSheetProps {
  level: StudentLevel;
}

const FALLBACK_FORMULAS: FormulaSheetType = {
  title: "Classical Mechanics Formula Sheet",
  formulas: [
    {
      name: "Newton's Second Law",
      equation: "F = m * a",
      variables: "F = Force (Newtons, N); m = mass (kilograms, kg); a = acceleration (meters per second squared, m/s²)",
      realLifeExample: "It takes more force to accelerate a heavy school bus than a light bicycle at the same rate.",
      commonMistake: "Forgetting that F represents the net sum of all forces acting on the object, not just a single force."
    },
    {
      name: "Kinetic Energy",
      equation: "KE = 0.5 * m * v²",
      variables: "KE = Kinetic Energy (Joules, J); m = mass (kilograms, kg); v = velocity (meters per second, m/s)",
      realLifeExample: "Doubling your driving speed quadruples the braking distance needed because kinetic energy is proportional to velocity squared.",
      commonMistake: "Forgetting to square the velocity (v) when calculating the energy."
    },
    {
      name: "Work Done",
      equation: "W = F * d * cos(θ)",
      variables: "W = Work (Joules, J); F = Force (Newtons, N); d = displacement (meters, m); θ = angle between force and displacement vectors",
      realLifeExample: "Carrying a heavy backpack while walking horizontally on a flat floor does no work on the backpack because the walking motion is perpendicular to gravity.",
      commonMistake: "Failing to check the angle θ; work is zero if force is applied perpendicular to displacement."
    },
    {
      name: "Gravitational Potential Energy",
      equation: "PE = m * g * h",
      variables: "PE = Potential Energy (Joules, J); m = mass (kg); g = gravity constant (approx. 9.81 m/s²); h = height (meters, m)",
      realLifeExample: "A rollercoaster sitting at the peak of the highest drop has maximum gravitational potential energy.",
      commonMistake: "Forgetting that height (h) is relative to a reference level; ensure the reference baseline is consistent."
    }
  ]
};

export default function FormulaSheet({ level }: FormulaSheetProps) {
  const [sheet, setSheet] = useState<FormulaSheetType>(FALLBACK_FORMULAS);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/formula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          level
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: FormulaSheetType = await response.json();
      setSheet(data);

      saveHistoryItem({
        type: "formula",
        title: `Formula Sheet: ${data.title || topic}`,
        subtitle: `${data.formulas?.length || 0} Equations & Variables`,
        data: { sheet: data }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate formula sheet. Please try another topic.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Generator Control Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <Table className="text-emerald-600 dark:text-emerald-400" size={24} /> STEM Formula & Variable Library
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Generate interactive formula sheets with LaTeX equations, variable definitions, real-world examples, and common traps.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Thermodynamics, Calculus Derivatives, Electromagnetism..."
            className="flex-1 border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden transition-all min-h-[48px]"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px] font-display"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating Formulas...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Formula Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formula Sheet Display Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full uppercase tracking-wider font-display">
            Active Formula Reference
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-2">
            {sheet.title}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {sheet.formulas.map((item, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
                  {idx + 1}. {item.name}
                </h4>
                <div className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 shadow-2xs self-start sm:self-auto">
                  <MathText text={item.equation} />
                </div>
              </div>

              {/* Variables breakdown */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
                  Variable Definitions
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans mt-0.5">
                  <MathText text={item.variables} />
                </p>
              </div>

              {/* Real life example & common mistake */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1 font-display">
                    <BookOpen size={12} /> Real-World Intuition
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    <MathText text={item.realLifeExample} />
                  </p>
                </div>

                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1 font-display">
                    <AlertCircle size={12} /> Common Exam Trap
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    <MathText text={item.commonMistake} />
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
