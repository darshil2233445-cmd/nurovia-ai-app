import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Sparkles,
  BookOpen,
  User,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  Paperclip,
  X,
  FileText,
  Plus,
  Trash2,
  Cpu,
  Heart,
  Target,
  Zap,
  Scale,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
  MessageSquare,
  ChevronDown
} from "lucide-react";
import { ChatMessage, ChatSession, StudyMode } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";
import AnimatedRocket from "./AnimatedRocket";

export type AIPersonality = "architect" | "companion" | "straight_edge" | "spark" | "velocity" | "devils_advocate";

interface TutorChatProps {
  level: string; // TargetLevel + Difficulty Level e.g., "College (Beginner)"
  targetLevel: "School" | "College";
  setTargetLevel: (lvl: "School" | "College") => void;
  difficulty: "Beginner" | "Advanced";
  setDifficulty: (diff: "Beginner" | "Advanced") => void;
  activeMode: StudyMode;
  setActiveMode: (mode: StudyMode) => void;
  userEmail: string | null;
  onSignIn: (email: string) => void;
  onSignOut: () => void;
  authToken: string | null;
}

const AI_PERSONALITIES = [
  {
    id: "architect" as AIPersonality,
    name: "Architect",
    description: "Structured, analytical, and expert-level guidance.",
    icon: Cpu,
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "companion" as AIPersonality,
    name: "Companion",
    description: "Warm, supportive, and encouraging.",
    icon: Heart,
    color: "from-rose-400 to-pink-600"
  },
  {
    id: "straight_edge" as AIPersonality,
    name: "Straight Edge",
    description: "Direct, honest, and transparent.",
    icon: Target,
    color: "from-amber-500 to-orange-600"
  },
  {
    id: "spark" as AIPersonality,
    name: "Spark",
    description: "Creative, energetic, and unconventional.",
    icon: Sparkles,
    color: "from-purple-500 to-indigo-600"
  },
  {
    id: "velocity" as AIPersonality,
    name: "Velocity",
    description: "Fast, concise, and action-oriented.",
    icon: Zap,
    color: "from-emerald-500 to-teal-600"
  },
  {
    id: "devils_advocate" as AIPersonality,
    name: "Devil's Advocate",
    description: "Challenges assumptions and explores alternative viewpoints.",
    icon: Scale,
    color: "from-cyan-500 to-blue-600"
  }
];

const QUICK_STARTS = [
  {
    title: "Explain recursion",
    prompt: "Explain the concept of recursion like I am five, with a real-world analogy. 🧠",
    icon: BrainCircuit,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400"
  },
  {
    title: "Derive quadratic",
    prompt: "Show me step-by-step how to derive the quadratic formula. 📐",
    icon: BookOpen,
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400"
  },
  {
    title: "MVC architecture",
    prompt: "Explain MVC architecture in software engineering with a clean diagram and code example. 💡",
    icon: Cpu,
    color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400"
  }
];

export default function TutorChat({
  level,
  targetLevel,
  setTargetLevel,
  difficulty,
  setDifficulty,
  activeMode,
  setActiveMode,
  userEmail,
  onSignIn,
  onSignOut,
  authToken
}: TutorChatProps) {
  // All sessions saved in local storage
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Active personality state
  const [activePersonality, setActivePersonality] = useState<AIPersonality>("architect");

  // Chat states
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Speech & Action states
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "like" | "dislike">>({});

  // Session selector dropdown state
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  // File attachments
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: "image" | "text" | "document";
    mimeType: string;
    data: string;
    previewUrl?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const storageKey = userEmail ? `nurovia_chat_sessions_${userEmail}` : "nurovia_guest_chat_sessions";
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: ChatSession[] = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {
        console.error("Failed to load chat sessions", e);
        setSessions([]);
      }
    } else {
      setSessions([]);
    }
  }, [userEmail]);

  // Determine active session & messages
  const activeSession = sessions.find(s => s.id === currentSessionId);
  const activeMessages = activeSession ? activeSession.messages : [];

  // Helper to save sessions
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    const storageKey = userEmail ? `nurovia_chat_sessions_${userEmail}` : "nurovia_guest_chat_sessions";
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, loading]);

  const handleCreateNewChat = () => {
    setCurrentSessionId(null);
    setInput("");
    setError(null);
    setShowSessionDropdown(false);
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    saveSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.name);
      const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
      const isBinaryDoc = /\.(pdf|docx?|docm|pptx?)$/i.test(file.name);

      if (!isImage && !isText && !isBinaryDoc) {
        setError("Unsupported format. Please upload PDF, DOC, TXT, PPT, CSV, or Image.");
        return;
      }

      setError(null);

      if (isImage || isBinaryDoc) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result;
          if (typeof dataUrl === "string") {
            const base64 = dataUrl.split(",")[1];
            
            let mimeType = file.type;
            if (!mimeType) {
              if (/\.(pdf)$/i.test(file.name)) mimeType = "application/pdf";
              else if (/\.(png)$/i.test(file.name)) mimeType = "image/png";
              else if (/\.(jpe?g)$/i.test(file.name)) mimeType = "image/jpeg";
              else mimeType = "application/octet-stream";
            }

            setAttachedFile({
              name: file.name,
              type: isImage ? "image" : "document",
              mimeType: mimeType,
              data: base64,
              previewUrl: isImage ? dataUrl : undefined
            });
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result;
          if (typeof text === "string") {
            setAttachedFile({
              name: file.name,
              type: "text",
              mimeType: "text/plain",
              data: text
            });
          }
        };
        reader.readAsText(file);
      }
    }
  };

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed && !attachedFile) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmed || `[Attached file: ${attachedFile?.name}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: attachedFile ? {
        name: attachedFile.name,
        type: attachedFile.type,
        previewUrl: attachedFile.previewUrl
      } : undefined
    };

    let sessionToUpdate: ChatSession;
    let updatedSessions: ChatSession[];

    if (!currentSessionId) {
      const newSessionId = "session_" + Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const titleCandidate = trimmed || attachedFile?.name || "New Chat";
      const autoTitle = titleCandidate.substring(0, 35) + (titleCandidate.length > 35 ? "..." : "");

      sessionToUpdate = {
        id: newSessionId,
        title: autoTitle,
        messages: [userMsg],
        createdAt: new Date().toISOString(),
        userId: userEmail
      };

      updatedSessions = [sessionToUpdate, ...sessions];
      setCurrentSessionId(newSessionId);
    } else {
      const existing = sessions.find(s => s.id === currentSessionId);
      if (!existing) return;

      sessionToUpdate = {
        ...existing,
        messages: [...existing.messages, userMsg]
      };

      updatedSessions = sessions.map(s => (s.id === currentSessionId ? sessionToUpdate : s));
    }

    saveSessions(updatedSessions);
    setInput("");
    setLoading(true);

    const payloadFile = attachedFile ? {
      name: attachedFile.name,
      type: attachedFile.type,
      mimeType: attachedFile.mimeType,
      data: attachedFile.data
    } : undefined;

    setAttachedFile(null);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = "";
    }

    try {
      const activePObj = AI_PERSONALITIES.find(p => p.id === activePersonality);
      const systemPersonalityPrompt = `Answer in the style of the '${activePObj?.name}' personality: ${activePObj?.description}. Ensure your response naturally includes 1-2 helpful emojis (e.g., 🚀, 🧠, 💡, 📚, 🎯, ✨).`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `[Instruction: ${systemPersonalityPrompt}]` },
            ...sessionToUpdate.messages.map(m => ({ role: m.role, content: m.content }))
          ],
          level,
          mode: activeMode,
          attachedFile: payloadFile
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        content: data.text || "I was unable to formulate a response.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalSessions = updatedSessions.map(s => {
        if (s.id === sessionToUpdate.id) {
          return {
            ...s,
            messages: [...s.messages, modelMsg]
          };
        }
        return s;
      });

      saveSessions(finalSessions);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while connecting to Nurovia AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleToggleSpeech = (id: string, text: string) => {
    if (speakingMessageId === id) {
      window.speechSynthesis?.cancel();
      setSpeakingMessageId(null);
    } else {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[#*`_~]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);
      setSpeakingMessageId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFeedback = (id: string, type: "like" | "dislike") => {
    setMessageFeedback(prev => ({
      ...prev,
      [id]: prev[id] === type ? undefined : type
    }));
  };

  const handleRegenerate = (index: number) => {
    if (!activeSession) return;
    const lastUserMsg = activeMessages.slice(0, index).reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  return (
    <div id="tutor-chat-module" className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] min-h-[500px] sm:min-h-[600px] w-full bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden relative font-sans">
      
      {/* Sleek Top Workspace Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl sticky top-0 z-20 shadow-2xs">
        
        {/* Left Controls: Mode & Session Selector */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <AnimatedRocket size={18} showGlow={false} />
            <select
              id="study-mode-selector"
              value={activeMode}
              onChange={(e) => setActiveMode(e.target.value as StudyMode)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden bg-transparent cursor-pointer font-display"
            >
              <option value="doubt">AI Doubt Solver</option>
              <option value="homework">Homework Helper</option>
              <option value="coding">Coding Tutor</option>
              <option value="notes">Note Simplifier</option>
              <option value="exam">Exam Revision Coach</option>
            </select>
          </div>

          {/* Session Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setShowSessionDropdown(!showSessionDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
            >
              <MessageSquare size={14} className="text-blue-500" />
              <span className="max-w-[100px] sm:max-w-[160px] truncate">
                {activeSession ? activeSession.title : "New Chat"}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Sessions Dropdown Menu */}
            {showSessionDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl z-30 p-2 space-y-1 animate-fade-in">
                <button
                  onClick={handleCreateNewChat}
                  className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={14} /> Start New Chat
                  </span>
                  <span className="text-[10px] bg-blue-200/60 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-md font-mono">⌘N</span>
                </button>

                <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1" />

                <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">No recent chats</p>
                  ) : (
                    sessions.map(s => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setCurrentSessionId(s.id);
                          setShowSessionDropdown(false);
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                          s.id === currentSessionId
                            ? "bg-blue-50/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-bold"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="truncate pr-2">{s.title}</span>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          title="Delete Chat"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Level Badges & New Chat */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-bold font-display bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <GraduationCap size={15} className="text-blue-600 dark:text-blue-400" />
            <span>{level}</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCreateNewChat}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Chat</span>
          </motion.button>
        </div>
      </div>

      {/* Main Chat Body Canvas */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 no-scrollbar bg-gradient-to-b from-slate-50/40 via-white to-slate-50/20 dark:from-slate-950/40 dark:via-slate-900 dark:to-slate-950/20">
        
        {activeMessages.length === 0 ? (
          /* Welcome Screen with AI Personality Cards */
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 py-2 sm:py-4">
            
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20 border-2 border-blue-400 relative">
                <AnimatedRocket size={32} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-display">
                AI Doubt Solver Workspace
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Select an AI Personality archetype below to tailor explanation style, tone, and depth:
              </p>
            </div>

            {/* AI Personality Mode Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AI_PERSONALITIES.map((p) => {
                const IconComponent = p.icon;
                const isSelected = activePersonality === p.id;

                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActivePersonality(p.id)}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? "bg-white dark:bg-slate-800 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                        : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${p.color} text-white shadow-xs`}>
                        <IconComponent size={18} />
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-display">
                          <Check size={12} /> Active
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-display">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{p.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick Prompts */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center font-display">
                Suggested Quick Starts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {QUICK_STARTS.map((qs, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSend(qs.prompt)}
                    className="flex flex-col text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group cursor-pointer space-y-2 min-h-[48px]"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl ${qs.color}`}>
                        <qs.icon size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">{qs.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {qs.prompt}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* Active Chat Conversation List */
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {activeMessages.map((m, index) => (
              <div
                key={m.id}
                className={`flex gap-2.5 sm:gap-3.5 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role !== "user" && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 border border-blue-400">
                    <AnimatedRocket size={18} showGlow={false} />
                  </div>
                )}

                <div className={`flex flex-col space-y-1.5 max-w-[88%] sm:max-w-[85%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl ${
                      m.role === "user"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 rounded-tr-xs text-sm leading-relaxed font-sans"
                        : "bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs rounded-tl-xs text-slate-800 dark:text-slate-100 text-sm leading-relaxed"
                    }`}
                  >
                    {m.role === "user" ? (
                      <div className="space-y-2">
                        {m.attachment && (
                          <div className="mb-2 max-w-xs rounded-xl overflow-hidden border border-white/20 bg-blue-700/60 p-2 flex items-center gap-2">
                            {m.attachment.type === "image" && m.attachment.previewUrl ? (
                              <img
                                src={m.attachment.previewUrl}
                                alt={m.attachment.name}
                                className="max-h-28 object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                                <FileText size={16} />
                                <span className="truncate max-w-[150px]">{m.attachment.name}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap font-sans text-white">{m.content}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="prose prose-blue dark:prose-invert prose-sm max-w-none text-slate-800 dark:text-slate-100 font-sans">
                          <MarkdownRenderer content={m.content} />
                        </div>

                        {/* Assistant Response Interactive Action Toolbar */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 text-xs">
                          <div className="flex items-center gap-1">
                            {/* Copy button */}
                            <button
                              onClick={() => handleCopyMessage(m.id, m.content)}
                              title="Copy to clipboard"
                              className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                            >
                              {copiedMessageId === m.id ? (
                                <>
                                  <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>

                            {/* Read Aloud button */}
                            <button
                              onClick={() => handleToggleSpeech(m.id, m.content)}
                              title="Read response aloud"
                              className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              {speakingMessageId === m.id ? (
                                <VolumeX size={13} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                              ) : (
                                <Volume2 size={13} />
                              )}
                            </button>

                            {/* Regenerate button */}
                            <button
                              onClick={() => handleRegenerate(index)}
                              title="Regenerate response"
                              className="p-1.5 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <RotateCcw size={13} />
                            </button>
                          </div>

                          {/* Like / Dislike Feedback */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleFeedback(m.id, "like")}
                              title="Good response"
                              className={`p-1.5 rounded-lg transition-colors ${
                                messageFeedback[m.id] === "like"
                                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60"
                                  : "hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button
                              onClick={() => handleFeedback(m.id, "dislike")}
                              title="Poor response"
                              className={`p-1.5 rounded-lg transition-colors ${
                                messageFeedback[m.id] === "dislike"
                                  ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60"
                                  : "hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-1 font-display">
                    {m.timestamp}
                  </span>
                </div>

                {m.role === "user" && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 sm:gap-3.5 justify-start">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 border border-blue-400">
                  <AnimatedRocket size={18} />
                </div>
                <div className="flex flex-col space-y-1 items-start">
                  <div className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-xs rounded-tl-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                      <span className="flex gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                      </span>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-display">
                        Nurovia AI is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs max-w-2xl mx-auto shadow-xs">
                <AlertCircle size={16} className="shrink-0" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Dock */}
      <div className="p-2.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="max-w-3xl mx-auto flex flex-col gap-2"
        >
          {attachedFile && (
            <div className="flex items-center justify-between gap-2 p-2.5 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl max-w-md animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2 overflow-hidden">
                {attachedFile.type === "image" && attachedFile.previewUrl ? (
                  <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800">
                    <img
                      src={attachedFile.previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                )}
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{attachedFile.name}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-extrabold font-display">
                    {attachedFile.type === "image" ? "Photo Attachment" : "Document Attachment"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 w-full">
            <input
              type="file"
              ref={chatFileInputRef}
              accept=".pdf,.doc,.docx,.docm,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.csv"
              onChange={handleChatFileChange}
              className="hidden"
            />
            <button
              type="button"
              title="Attach Document or Image"
              disabled={loading}
              onClick={() => chatFileInputRef.current?.click()}
              className="p-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-2xl transition-all border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 shadow-2xs shrink-0 cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Paperclip size={18} />
            </button>
            
            <input
              id="chat-user-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                attachedFile 
                  ? "Add a message about your attachment..." 
                  : "Ask Nurovia AI a question or paste a doubt..."
              }
              disabled={loading}
              className="flex-1 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-3.5 sm:px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 min-h-[48px]"
              autoComplete="off"
            />
            
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading || (!input.trim() && !attachedFile)}
              className="p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md shadow-blue-500/20 cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </form>
      </div>

    </div>
  );
}
