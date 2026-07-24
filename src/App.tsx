import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Award,
  Table,
  Calendar,
  History,
  Settings,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Sun,
  Moon,
  HardDrive
} from "lucide-react";
import { TargetLevel, DifficultyLevel, StudyMode, StudySuite } from "./types";
import DashboardView from "./components/DashboardView";
import TutorChat from "./components/TutorChat";
import NoteSummarizer from "./components/NoteSummarizer";
import FlashcardStudio from "./components/FlashcardStudio";
import QuizHub from "./components/QuizHub";
import FormulaSheet from "./components/FormulaSheet";
import RevisionPlanner from "./components/RevisionPlanner";
import HistoryViewer from "./components/HistoryViewer";
import SettingsView from "./components/SettingsView";
import AnimatedRocket from "./components/AnimatedRocket";
import InstallPwaPrompt from "./components/InstallPwaPrompt";

type NavigationTab = "dashboard" | "chat" | "notes" | "cards" | "quiz" | "formulas" | "planner" | "history" | "settings";

const NAVIGATION_ITEMS = [
  { id: "dashboard" as NavigationTab, label: "Dashboard", icon: LayoutDashboard },
  { id: "chat" as NavigationTab, label: "AI Doubt Solver", customIcon: true },
  { id: "notes" as NavigationTab, label: "Note Simplifier", icon: FileText },
  { id: "cards" as NavigationTab, label: "Flashcard Studio", icon: BookOpen },
  { id: "quiz" as NavigationTab, label: "Practice Quiz", icon: Award },
  { id: "formulas" as NavigationTab, label: "Formula Library", icon: Table },
  { id: "planner" as NavigationTab, label: "Study Timetable", icon: Calendar },
  { id: "history" as NavigationTab, label: "History", icon: History },
  { id: "settings" as NavigationTab, label: "Settings", icon: Settings },
];

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("nurovia_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [targetLevel, setTargetLevel] = useState<TargetLevel>("College");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Beginner");
  const [activeMode, setActiveMode] = useState<StudyMode>("doubt");
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  
  // Collapsible sidebar state on desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mobile Drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Active study suite generated from Note Simplifier
  const [currentSuite, setCurrentSuite] = useState<StudySuite | null>(null);

  // Liquid Blue Wave animation trigger on tab switch
  const [waveKey, setWaveKey] = useState(0);

  // Apply Theme Class to Document Root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("nurovia_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  // Load level, mode, tab, and suite from localStorage on load
  useEffect(() => {
    const savedLevel = localStorage.getItem("studyai_target_level");
    if (savedLevel) setTargetLevel(savedLevel as TargetLevel);

    const savedDiff = localStorage.getItem("studyai_difficulty");
    if (savedDiff) setDifficulty(savedDiff as DifficultyLevel);

    const savedMode = localStorage.getItem("studyai_mode");
    if (savedMode) setActiveMode(savedMode as StudyMode);

    const savedTab = localStorage.getItem("studyai_tab");
    if (savedTab) setActiveTab(savedTab as NavigationTab);

    const savedSuite = localStorage.getItem("studyai_active_suite");
    if (savedSuite) {
      try {
        setCurrentSuite(JSON.parse(savedSuite));
      } catch (e) {
        console.error("Failed to parse saved study suite", e);
      }
    }
  }, []);

  const handleTargetLevelChange = (lvl: TargetLevel) => {
    setTargetLevel(lvl);
    localStorage.setItem("studyai_target_level", lvl);
  };

  const handleDifficultyChange = (diff: DifficultyLevel) => {
    setDifficulty(diff);
    localStorage.setItem("studyai_difficulty", diff);
  };

  const handleModeChange = (mode: StudyMode) => {
    setActiveMode(mode);
    localStorage.setItem("studyai_mode", mode);
  };

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    localStorage.setItem("studyai_tab", tab);
    setWaveKey(prev => prev + 1);
    setIsMobileDrawerOpen(false);
  };

  const handleSuiteGenerated = (suite: StudySuite) => {
    setCurrentSuite(suite);
    localStorage.setItem("studyai_active_suite", JSON.stringify(suite));
    handleTabChange("notes");
  };

  const clearActiveSuite = () => {
    if (confirm("Are you sure you want to unload the active study notes and reset to fallbacks?")) {
      setCurrentSuite(null);
      localStorage.removeItem("studyai_active_suite");
    }
  };

  const handleClearLocalData = () => {
    if (confirm("Reset local cache and browser study data?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const fullLevel = `${targetLevel} (${difficulty})` as any;

  const renderNavItems = (isMobile = false) => (
    NAVIGATION_ITEMS.map((item) => {
      const IconComponent = item.icon;
      const isActive = activeTab === item.id;

      return (
        <div key={item.id} className="relative group">
          <button
            onClick={() => handleTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-bold font-display transition-all cursor-pointer relative min-h-[48px] ${
              isActive
                ? "text-blue-700 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 shadow-2xs border border-blue-200/80 dark:border-blue-800/80"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {item.customIcon ? (
              <AnimatedRocket size={20} showGlow={isActive} />
            ) : IconComponent ? (
              <IconComponent
                size={18}
                className={isActive ? "text-blue-600 dark:text-blue-400 shrink-0" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 shrink-0"}
              />
            ) : null}

            {(!isSidebarCollapsed || isMobile) && (
              <span className="truncate">{item.label}</span>
            )}

            {/* Active Glowing Indicator Bar */}
            {isActive && (
              <div
                className="absolute right-0 top-2 bottom-2 w-1 bg-blue-600 dark:bg-blue-500 rounded-l-full shadow-md shadow-blue-500/50"
              />
            )}
          </button>

          {/* Tooltip in collapsed desktop mode */}
          {isSidebarCollapsed && !isMobile && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 font-display">
              {item.label}
            </div>
          )}
        </div>
      );
    })
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] flex text-slate-900 dark:text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-blue-500/20 selection:text-blue-900 dark:selection:text-blue-100 transition-colors duration-250">
      
      {/* 1. DESKTOP COLLAPSIBLE NAVIGATION SIDEBAR */}
      <aside
        className={`hidden lg:flex bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between shrink-0 transition-all duration-300 ease-in-out z-40 sticky top-0 h-screen shadow-2xs ${
          isSidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Logo Header */}
          <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div
              onClick={() => handleTabChange("dashboard")}
              className="flex items-center gap-3 cursor-pointer group overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black font-display text-xl shadow-md shadow-blue-500/20 shrink-0 group-hover:scale-105 transition-transform">
                N
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="font-display font-extrabold text-slate-900 dark:text-slate-100 text-base tracking-tight leading-tight">
                    Nurovia AI
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-display">
                    Local Platform
                  </span>
                </div>
              )}
            </div>

            {/* Collapse / Expand Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Navigation Items List */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 no-scrollbar">
            {renderNavItems(false)}
          </div>

          {/* Local Device Storage Indicator */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2">
            <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"} p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs`}>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <HardDrive size={18} />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden text-left flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate font-display">Local Guest Mode</p>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Device Storage
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </aside>

      {/* MOBILE NAVIGATION DRAWER SLIDE-OUT OVERLAY (< 1024px) */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Darkened Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Slide-out Panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 z-50 flex flex-col justify-between shadow-2xl border-r border-slate-200 dark:border-slate-800 lg:hidden overflow-hidden"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Drawer Header */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <div
                    onClick={() => handleTabChange("dashboard")}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-black font-display text-xl shadow-md shadow-blue-500/20">
                      N
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-display font-extrabold text-slate-900 dark:text-slate-100 text-base tracking-tight leading-tight">
                        Nurovia AI
                      </span>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-display">
                        Local Workspace
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Mobile Drawer Navigation Links */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
                  {renderNavItems(true)}
                </div>

                {/* Mobile Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-3">
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between px-3.5 py-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 font-display min-h-[48px]"
                  >
                    <span className="flex items-center gap-2">
                      {theme === "light" ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-blue-400" />}
                      <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>
                    </span>
                    <span className="text-[10px] uppercase font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">Toggle</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Toolbar */}
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            
            {/* Mobile Hamburger Menu Button & Section Title */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Open Navigation Drawer"
              >
                <Menu size={20} />
              </button>

              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 font-display tracking-tight capitalize flex items-center gap-2 truncate">
                {activeTab === "dashboard" && "Dashboard Overview"}
                {activeTab === "chat" && (
                  <span className="flex items-center gap-2">
                    <AnimatedRocket size={22} showGlow={false} /> AI Doubt Solver
                  </span>
                )}
                {activeTab === "notes" && "Note Simplifier"}
                {activeTab === "cards" && "Flashcard Studio"}
                {activeTab === "quiz" && "Practice Quiz"}
                {activeTab === "formulas" && "STEM Formula Library"}
                {activeTab === "planner" && "Study Timetable"}
                {activeTab === "history" && "Study History"}
                {activeTab === "settings" && "Workspace Settings"}
              </h1>
            </div>

            {/* Quick Level & Difficulty Selectors + Theme Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-display pl-2 flex items-center gap-1">
                  <GraduationCap size={14} className="text-blue-600 dark:text-blue-400" /> Target:
                </span>
                {(["School", "College"] as TargetLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => handleTargetLevelChange(lvl)}
                    className={`px-2.5 py-1 text-[11px] font-bold font-display rounded-lg transition-all ${
                      targetLevel === lvl
                        ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-2xs border border-slate-200 dark:border-slate-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="hidden md:flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                {(["Beginner", "Advanced"] as DifficultyLevel[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => handleDifficultyChange(diff)}
                    className={`px-2.5 py-1 text-[11px] font-bold font-display rounded-lg transition-all ${
                      difficulty === diff
                        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              {/* Light / Dark Mode Toggle Button */}
              <button
                onClick={toggleTheme}
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs font-display rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer min-h-[44px] flex items-center gap-1.5 shadow-2xs overflow-hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ y: -10, opacity: 0, rotate: -20 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 10, opacity: 0, rotate: 20 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-1.5"
                  >
                    {theme === "light" ? (
                      <>
                        <span className="text-sm">🌞</span>
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">🌙</span>
                        <span>Dark</span>
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>

              {/* PWA Install App Button */}
              <InstallPwaPrompt variant="button" />
            </div>

          </div>
        </header>

        {/* Fast Blue Liquid Wave Overlay on page switch */}
        <AnimatePresence>
          <motion.div
            key={`wave_${waveKey}`}
            initial={{ x: "-100%", opacity: 0.8 }}
            animate={{ x: "100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-600 z-50 pointer-events-none"
          />
        </AnimatePresence>

        {/* Main Body Canvas */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {activeTab === "dashboard" && (
                <DashboardView
                  targetLevel={targetLevel}
                  difficulty={difficulty}
                  currentSuite={currentSuite}
                  onNavigate={handleTabChange}
                  onClearSuite={clearActiveSuite}
                />
              )}

              {activeTab === "chat" && (
                <TutorChat
                  level={fullLevel}
                  targetLevel={targetLevel}
                  setTargetLevel={handleTargetLevelChange}
                  difficulty={difficulty}
                  setDifficulty={handleDifficultyChange}
                  activeMode={activeMode}
                  setActiveMode={handleModeChange}
                />
              )}

              {activeTab === "notes" && (
                <NoteSummarizer
                  level={fullLevel}
                  onSuiteGenerated={handleSuiteGenerated}
                  currentSuite={currentSuite}
                />
              )}

              {activeTab === "cards" && (
                <FlashcardStudio
                  generatedCards={currentSuite?.flashcards || []}
                  topicName={currentSuite?.topic}
                />
              )}

              {activeTab === "quiz" && (
                <QuizHub
                  generatedQuiz={currentSuite?.quiz || []}
                  topicName={currentSuite?.topic}
                  targetLevel={targetLevel}
                  difficulty={difficulty}
                />
              )}

              {activeTab === "formulas" && (
                <FormulaSheet
                  level={fullLevel}
                />
              )}

              {activeTab === "planner" && (
                <RevisionPlanner
                  level={fullLevel}
                />
              )}

              {activeTab === "history" && (
                <HistoryViewer
                  onLoadItem={(item) => {
                    if (item.type === "chat") {
                      handleTabChange("chat");
                    } else if (item.type === "note" || item.type === "quiz") {
                      if (item.data.suite) {
                        handleSuiteGenerated(item.data.suite);
                        handleTabChange(item.type === "note" ? "notes" : "quiz");
                      }
                    } else if (item.type === "formula") {
                      handleTabChange("formulas");
                    } else if (item.type === "planner") {
                      handleTabChange("planner");
                    }
                  }}
                />
              )}

              {activeTab === "settings" && (
                <SettingsView
                  targetLevel={targetLevel}
                  setTargetLevel={handleTargetLevelChange}
                  difficulty={difficulty}
                  setDifficulty={handleDifficultyChange}
                  activeMode={activeMode}
                  setActiveMode={handleModeChange}
                  onClearData={handleClearLocalData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-6 mt-auto text-center text-xs text-slate-400 dark:text-slate-500 font-medium font-display transition-colors">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Nurovia AI. All lesson materials and interactive plan suites are generated locally.</p>
            <div className="flex items-center gap-1.5">
              <span>Powered by</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 tracking-tight flex items-center gap-1">
                Gemini AI <Sparkles size={12} className="text-blue-500 animate-pulse" />
              </span>
            </div>
          </div>
        </footer>

      </div>

      {/* Floating PWA Install Banner */}
      <InstallPwaPrompt variant="banner" />
    </div>
  );
}
