import React, { useState, useEffect, useRef } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Trophy,
  ArrowRight,
  BookOpen,
  Clock,
  Sparkles,
  Zap,
  Target,
  Brain,
  Layers,
  ChevronRight,
  Sliders,
  Send,
  BarChart3,
  Lightbulb,
  Check
} from "lucide-react";
import { QuizQuestion, TargetLevel, DifficultyLevel } from "../types";
import MathText from "./MathText";
import { saveHistoryItem } from "../historyUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface QuizHubProps {
  generatedQuiz?: QuizQuestion[];
  topicName?: string;
  targetLevel?: TargetLevel;
  difficulty?: DifficultyLevel;
}

const POPULAR_TOPICS = [
  "Vectors",
  "Recursion",
  "Organic Chemistry",
  "Newton's Laws",
  "Calculus",
  "Data Structures",
  "Cellular Biology",
  "Thermodynamics",
];

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    question: "If vector A = 3i + 4j, what is its magnitude |A|?",
    type: "numerical",
    correctAnswerText: "5",
    explanation: "The magnitude of a 2D vector A = xi + yj is given by |A| = sqrt(x² + y²). For A = 3i + 4j: |A| = sqrt(3² + 4²) = sqrt(9 + 16) = sqrt(25) = 5.",
    difficultyBadge: "Easy",
    estimatedTimeSeconds: 45,
    topicTag: "Vectors • Magnitude"
  },
  {
    question: "Which of the following statements about recursion base cases is TRUE?",
    type: "mcq",
    options: [
      "Base cases are optional in recursive algorithms.",
      "Without a base case, recursion causes stack overflow.",
      "Base cases must call the function recursively.",
      "A recursive function can only have one base case."
    ],
    correctAnswerIndex: 1,
    explanation: "A base case specifies the condition that halts further recursive execution. Without a base case, recursive calls continue indefinitely until memory space on the call stack is exhausted, triggering a stack overflow error.",
    difficultyBadge: "Medium",
    estimatedTimeSeconds: 60,
    topicTag: "Recursion • Stack Memory"
  },
  {
    question: "Assertion (A): Alkanes undergo substitution reactions rather than addition reactions.\nReason (R): Alkanes contain saturated single C-C bonds with high stability.",
    type: "assertion_reason",
    options: [
      "Both A and R are true, and R is the correct explanation for A",
      "Both A and R are true, but R is NOT the correct explanation for A",
      "A is true, but R is false",
      "A is false, but R is true"
    ],
    correctAnswerIndex: 0,
    explanation: "Alkanes are saturated hydrocarbons containing strong C-C and C-H single sigma bonds. Because they have no pi bonds to open up, they cannot undergo addition reactions and instead undergo substitution reactions.",
    difficultyBadge: "Hard",
    estimatedTimeSeconds: 90,
    topicTag: "Organic Chemistry • Reactions"
  }
];

export default function QuizHub({
  generatedQuiz,
  topicName = "",
  targetLevel = "College",
  difficulty = "Beginner"
}: QuizHubProps) {
  // Topic input state
  const [activeTopic, setActiveTopic] = useState<string>(topicName || "Vectors");
  const [customTopicInput, setCustomTopicInput] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>(DEFAULT_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // User responses
  const [selectedAnswers, setSelectedAnswers] = useState<{ [index: number]: any }>({});
  const [multiSelections, setMultiSelections] = useState<{ [qIndex: number]: number[] }>({});
  const [textAnswers, setTextAnswers] = useState<{ [index: number]: string }>({});

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (generatedQuiz && generatedQuiz.length > 0) {
      setQuestions(generatedQuiz);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setMultiSelections({});
      setTextAnswers({});
      setSubmitted(false);
      setElapsedSeconds(0);
      if (topicName) setActiveTopic(topicName);
    }
  }, [generatedQuiz, topicName]);

  // Start / Reset Timer during active quiz
  useEffect(() => {
    if (!submitted && !isLoading && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted, isLoading, questions]);

  // Fetch Fresh Generated Quiz from Server
  const handleGenerateFreshQuiz = async (selectedTopicToUse?: string) => {
    const topicToFetch = (selectedTopicToUse || customTopicInput || activeTopic || "Vectors").trim();
    if (!topicToFetch) return;

    setIsLoading(true);
    setSubmitted(false);
    setSelectedAnswers({});
    setMultiSelections({});
    setTextAnswers({});
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setActiveTopic(topicToFetch);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicToFetch,
          numQuestions,
          targetLevel,
          difficulty,
          questionTypeFilter: typeFilter
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate practice quiz");
      }

      const freshQuizData = await response.json();
      if (Array.isArray(freshQuizData) && freshQuizData.length > 0) {
        setQuestions(freshQuizData);
      } else {
        throw new Error("Invalid response schema received");
      }
    } catch (err) {
      console.error("Failed to generate quiz:", err);
      alert("Could not load fresh quiz questions. Please check your network and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentIndex]: optionIndex
    }));
  };

  const handleToggleMultiOption = (optionIndex: number) => {
    if (submitted) return;
    const currentList = multiSelections[currentIndex] || [];
    const updated = currentList.includes(optionIndex)
      ? currentList.filter(i => i !== optionIndex)
      : [...currentList, optionIndex];

    setMultiSelections(prev => ({
      ...prev,
      [currentIndex]: updated
    }));
  };

  const handleTextChange = (val: string) => {
    if (submitted) return;
    setTextAnswers(prev => ({
      ...prev,
      [currentIndex]: val
    }));
  };

  const isQuestionAnswered = (idx: number) => {
    const q = questions[idx];
    if (!q) return false;
    if (q.type === "multiple_correct") {
      return (multiSelections[idx] || []).length > 0;
    }
    if (q.type === "fill_in_blank" || q.type === "numerical") {
      return (textAnswers[idx] || "").trim().length > 0;
    }
    return selectedAnswers[idx] !== undefined;
  };

  // Evaluate Question Accuracy
  const evaluateQuestion = (q: QuizQuestion, idx: number): boolean => {
    if (q.type === "multiple_correct") {
      const userSel = (multiSelections[idx] || []).sort().join(",");
      const correctSel = (q.correctAnswerIndices || []).sort().join(",");
      return userSel === correctSel && userSel !== "";
    }
    if (q.type === "fill_in_blank" || q.type === "numerical") {
      const userTxt = (textAnswers[idx] || "").trim().toLowerCase();
      const targetTxt = (q.correctAnswerText || "").trim().toLowerCase();
      if (!userTxt || !targetTxt) return false;
      // Allow soft numeric tolerance or direct match
      if (!isNaN(Number(userTxt)) && !isNaN(Number(targetTxt))) {
        return Math.abs(Number(userTxt) - Number(targetTxt)) < 0.05;
      }
      return userTxt === targetTxt;
    }
    return selectedAnswers[idx] === q.correctAnswerIndex;
  };

  const handleFinishQuiz = () => {
    setSubmitted(true);

    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (evaluateQuestion(q, idx)) correctCount++;
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);

    saveHistoryItem({
      type: "quiz",
      title: `Quiz: ${activeTopic}`,
      subtitle: `Score: ${correctCount}/${questions.length} (${scorePct}%) • Level: ${targetLevel} (${difficulty})`,
      data: {
        score: correctCount,
        total: questions.length,
        topic: activeTopic,
        timeSeconds: elapsedSeconds
      }
    });
  };

  const handleRestartCurrentQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setMultiSelections({});
    setTextAnswers({});
    setSubmitted(false);
    setElapsedSeconds(0);
  };

  const currentQ = questions[currentIndex];

  // Results calculation
  const totalCorrect = questions.reduce((acc, q, idx) => evaluateQuestion(q, idx) ? acc + 1 : acc, 0);
  const accuracyPct = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

  const strongTopicsList: string[] = [];
  const weakTopicsList: string[] = [];

  questions.forEach((q, idx) => {
    const isWin = evaluateQuestion(q, idx);
    const label = q.topicTag || q.conceptTag || `Question ${idx + 1}`;
    if (isWin) {
      if (!strongTopicsList.includes(label)) strongTopicsList.push(label);
    } else {
      if (!weakTopicsList.includes(label)) weakTopicsList.push(label);
    }
  });

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  // Performance breakdown data for Recharts
  const chartData = [
    { name: "Correct", count: totalCorrect, fill: "#22C55E" },
    { name: "Incorrect", count: questions.length - totalCorrect, fill: "#EF4444" }
  ];

  // Motivational feedback
  let motivationalMessage = "Great practice run! Keep testing yourself to build lasting memory retention.";
  if (accuracyPct === 100) {
    motivationalMessage = "🏆 Perfect Score! You have mastered these concepts completely!";
  } else if (accuracyPct >= 80) {
    motivationalMessage = "🌟 Outstanding performance! Your conceptual understanding is very solid.";
  } else if (accuracyPct >= 50) {
    motivationalMessage = "👍 Good effort! Review the weak topics below to lock in a 100% score.";
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* 1. TOPIC SELECTOR & CUSTOM GENERATOR CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-black font-display uppercase tracking-wider flex items-center gap-1.5">
                <Target size={12} /> {targetLevel} • {difficulty} Mode
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold font-mono">
                Topic Specific
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display mt-2 tracking-tight">
              Adaptive Practice Quiz
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Generates non-repeating, concept-focused questions tailored to your exact target level.
            </p>
          </div>

          <button
            onClick={() => handleGenerateFreshQuiz()}
            disabled={isLoading}
            className="px-5 py-3 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer font-display min-h-[48px] shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Generating Fresh Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Generate New Quiz</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Topic Chips */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-display flex items-center justify-between">
            <span>Select Popular Topic:</span>
            <span className="text-[11px] font-normal text-slate-400">Current: <strong className="text-blue-600 dark:text-blue-400 font-bold">{activeTopic}</strong></span>
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOPICS.map((t) => {
              const isSelected = activeTopic.toLowerCase() === t.toLowerCase();
              return (
                <button
                  key={t}
                  onClick={() => {
                    setActiveTopic(t);
                    setCustomTopicInput("");
                    handleGenerateFreshQuiz(t);
                  }}
                  disabled={isLoading}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-display transition-all cursor-pointer min-h-[38px] ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Input & Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              value={customTopicInput}
              onChange={(e) => setCustomTopicInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerateFreshQuiz();
              }}
              placeholder="Or type custom subject / topic (e.g., Quantum Physics)..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[44px]"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-display text-slate-800 dark:text-slate-200 focus:outline-none min-h-[44px]"
            >
              <option value={5}>5 Questions</option>
              <option value={8}>8 Questions</option>
              <option value={10}>10 Questions</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold font-display text-slate-800 dark:text-slate-200 focus:outline-none min-h-[44px]"
            >
              <option value="all">All Question Formats</option>
              <option value="mcq">Standard MCQ</option>
              <option value="multiple_correct">Multiple Correct</option>
              <option value="true_false">True / False</option>
              <option value="numerical">Numerical / Fill Blank</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. LOADING SKELETON PLACEHOLDERS */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-32 skeleton-shimmer rounded-lg" />
            <div className="h-4 w-24 skeleton-shimmer rounded-lg" />
          </div>
          <div className="space-y-3">
            <div className="h-6 w-3/4 skeleton-shimmer rounded-xl" />
            <div className="h-6 w-1/2 skeleton-shimmer rounded-xl" />
          </div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full skeleton-shimmer rounded-2xl" />
            ))}
          </div>
        </div>
      ) : submitted ? (

        /* 3. COMPREHENSIVE QUIZ RESULTS DASHBOARD */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-lg space-y-8">
          
          {/* Header Banner */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-red-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20">
              <Trophy size={34} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-display tracking-tight">
              Quiz Results & Performance
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-4 py-1.5 rounded-full inline-block font-display">
              {motivationalMessage}
            </p>
          </div>

          {/* Key Metrics Bento Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">Score</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-display">
                {totalCorrect} <span className="text-sm text-slate-400 font-medium">/ {questions.length}</span>
              </p>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">Accuracy</span>
              <p className={`text-2xl sm:text-3xl font-black font-display ${accuracyPct >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {accuracyPct}%
              </p>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">Time Taken</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-display">
                {formatTime(elapsedSeconds)}
              </p>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">Level</span>
              <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-display truncate">
                {targetLevel}
              </p>
            </div>
          </div>

          {/* Performance Analytics Chart & Topics Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
            
            {/* Recharts Bar Chart */}
            <div className="md:col-span-5 bg-slate-50/60 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 font-display flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-blue-600 dark:text-blue-400" /> Accuracy Breakdown
              </h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        color: "#FFF",
                        fontSize: "12px"
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Strong & Weak Topics Breakdown */}
            <div className="md:col-span-7 space-y-4">
              
              {/* Strong Topics */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 font-display flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Strong Topics Mastered
                </h5>
                {strongTopicsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {strongTopicsList.map((st, i) => (
                      <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-display">
                        ✓ {st}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No topics fully mastered in this run.</p>
                )}
              </div>

              {/* Weak Topics */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/60 space-y-2">
                <h5 className="text-xs font-bold text-rose-800 dark:text-rose-300 font-display flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600" /> Suggested Revision Areas
                </h5>
                {weakTopicsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {weakTopicsList.map((wt, i) => (
                      <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-display">
                        ⚠ {wt}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 font-bold">No weak topics! Excellent performance.</p>
                )}
              </div>

            </div>
          </div>

          {/* Question-by-Question Detailed Review */}
          <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display">
              Step-by-Step Question Breakdown
            </h4>

            {questions.map((q, idx) => {
              const isWin = evaluateQuestion(q, idx);

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    isWin
                      ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800"
                      : "bg-rose-50/30 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-display flex-1">
                      {idx + 1}. <MathText text={q.question} />
                    </span>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-display shrink-0 ${
                        isWin
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isWin ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  {/* Correct Answer Display */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium space-y-1">
                    <p>
                      <strong className="text-slate-900 dark:text-slate-100 font-bold">Correct Solution:</strong>{" "}
                      {q.options && q.correctAnswerIndex !== undefined ? (
                        <MathText text={q.options[q.correctAnswerIndex]} />
                      ) : q.correctAnswerText ? (
                        <MathText text={q.correctAnswerText} />
                      ) : (
                        "See explanation below"
                      )}
                    </p>
                  </div>

                  {/* Detailed Step-by-Step Explanation */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-display flex items-center gap-1 text-[11px]">
                      <Lightbulb size={12} /> Step-by-Step Explanation
                    </span>
                    <MathText text={q.explanation} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={handleRestartCurrentQuiz}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer min-h-[48px] font-display"
            >
              Retake Same Quiz
            </button>
            <button
              onClick={() => handleGenerateFreshQuiz()}
              className="px-6 py-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer min-h-[48px] font-display flex items-center gap-2"
            >
              <Sparkles size={16} />
              <span>Next Topic Quiz</span>
            </button>
          </div>

        </div>
      ) : (

        /* 4. ACTIVE QUIZ PLAYER VIEW */
        currentQ && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-md space-y-6">
            
            {/* Top Bar with Question Counter & Timer */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-display uppercase tracking-wider">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {currentQ.difficultyBadge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-display uppercase ${
                    currentQ.difficultyBadge === "Easy"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                      : currentQ.difficultyBadge === "Hard" || currentQ.difficultyBadge === "Advanced"
                      ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                  }`}>
                    {currentQ.difficultyBadge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-display bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Clock size={14} className="text-blue-500" /> {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display uppercase tracking-wider">
                {currentQ.topicTag || `${activeTopic} Concept`}
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 font-display leading-relaxed">
                <MathText text={currentQ.question} />
              </h3>
            </div>

            {/* Question Input Controls based on Format */}
            <div className="space-y-3 pt-2">
              
              {/* Option A: Single Choice (MCQ / True-False / Assertion-Reason) */}
              {(!currentQ.type || currentQ.type === "mcq" || currentQ.type === "true_false" || currentQ.type === "assertion_reason") && currentQ.options && (
                currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentIndex] === oIdx;

                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
                        isSelected
                          ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs font-display shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <MathText text={opt} />
                      </span>

                      {isSelected && (
                        <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}

              {/* Option B: Multiple Correct */}
              {currentQ.type === "multiple_correct" && currentQ.options && (
                <div className="space-y-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold font-display">
                    Select ALL options that apply:
                  </p>
                  {currentQ.options.map((opt, oIdx) => {
                    const selList = multiSelections[currentIndex] || [];
                    const isChecked = selList.includes(oIdx);

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleToggleMultiOption(oIdx)}
                        className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3 cursor-pointer min-h-[52px] ${
                          isChecked
                            ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20"
                            : "bg-slate-50/60 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs ${
                            isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {isChecked && <Check size={14} />}
                          </span>
                          <MathText text={opt} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Option C: Fill in Blank or Numerical Answer */}
              {(currentQ.type === "fill_in_blank" || currentQ.type === "numerical") && (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 font-display">
                    {currentQ.type === "numerical" ? "Enter exact numeric answer:" : "Enter your answer text:"}
                  </label>
                  <input
                    type={currentQ.type === "numerical" ? "number" : "text"}
                    step="any"
                    value={textAnswers[currentIndex] || ""}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={currentQ.type === "numerical" ? "e.g., 42 or 3.14" : "Type your answer..."}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[52px]"
                  />
                </div>
              )}

            </div>

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-40 min-h-[44px] cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                {currentIndex === questions.length - 1 ? (
                  <button
                    onClick={handleFinishQuiz}
                    className="px-6 py-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all min-h-[44px] cursor-pointer font-display"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-all min-h-[44px] flex items-center gap-1 cursor-pointer font-display"
                  >
                    Next <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

          </div>
        )
      )}

    </div>
  );
}
