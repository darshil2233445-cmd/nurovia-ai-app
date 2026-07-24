export interface GuestActivity {
  id: string;
  type: "chat" | "note" | "quiz" | "flashcard" | "formula" | "planner";
  timestamp: string;
  details?: any;
}

export interface QuizAttempt {
  id: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0 to 100
  unlockedAt?: string;
}

export interface RealAnalytics {
  guestId: string;
  streakDays: number;
  completedHours: number;
  goalHours: number;
  problemsSolved: number;
  notesMastered: number;
  quizAccuracy: number;
  studyTimeMinutes: number;
  totalXp: number;
  level: number;
  chatsCount: number;
  flashcardsStudied: number;
  achievements: Achievement[];
  recentActivity: GuestActivity[];
}

// 1. Get or Generate Permanent Device Guest ID
export const getOrCreateGuestId = (): string => {
  let guestId = localStorage.getItem("nurovia_guest_id");
  if (!guestId) {
    const randomHex = Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase();
    guestId = `NUR-GUEST-${randomHex}`;
    localStorage.setItem("nurovia_guest_id", guestId);
  }
  return guestId;
};

// 2. Record Activity locally
export const recordGuestActivity = (
  type: "chat" | "note" | "quiz" | "flashcard" | "formula" | "planner",
  details?: any
) => {
  try {
    const existingRaw = localStorage.getItem("nurovia_activity_log");
    const log: GuestActivity[] = existingRaw ? JSON.parse(existingRaw) : [];
    
    const newEntry: GuestActivity = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      type,
      timestamp: new Date().toISOString(),
      details
    };

    log.unshift(newEntry);
    // Keep last 300 activities
    localStorage.setItem("nurovia_activity_log", JSON.stringify(log.slice(0, 300)));

    // Update streak dates
    const datesRaw = localStorage.getItem("nurovia_active_dates");
    const activeDates: string[] = datesRaw ? JSON.parse(datesRaw) : [];
    const todayStr = new Date().toISOString().split("T")[0];
    if (!activeDates.includes(todayStr)) {
      activeDates.push(todayStr);
      localStorage.setItem("nurovia_active_dates", JSON.stringify(activeDates));
    }
  } catch (err) {
    console.error("Failed to record local activity", err);
  }
};

// 3. Save Quiz Attempts
export const saveQuizAttempt = (attempt: Omit<QuizAttempt, "id" | "timestamp">) => {
  try {
    const existingRaw = localStorage.getItem("nurovia_quiz_attempts");
    const attempts: QuizAttempt[] = existingRaw ? JSON.parse(existingRaw) : [];
    
    const newAttempt: QuizAttempt = {
      ...attempt,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };

    attempts.unshift(newAttempt);
    localStorage.setItem("nurovia_quiz_attempts", JSON.stringify(attempts));
    recordGuestActivity("quiz", { score: attempt.scorePercentage, topic: attempt.topic });
  } catch (err) {
    console.error("Failed to save quiz attempt", err);
  }
};

// 4. Calculate Real Analytics from Local Data
export const getRealAnalytics = (): RealAnalytics => {
  const guestId = getOrCreateGuestId();

  // Read local storage keys
  const activityLog: GuestActivity[] = JSON.parse(localStorage.getItem("nurovia_activity_log") || "[]");
  const historyLog: any[] = JSON.parse(localStorage.getItem("studyai_global_history_local") || "[]");
  const chatSessions: any[] = JSON.parse(localStorage.getItem("nurovia_local_chat_sessions") || "[]");
  const quizAttempts: QuizAttempt[] = JSON.parse(localStorage.getItem("nurovia_quiz_attempts") || "[]");
  const activeDates: string[] = JSON.parse(localStorage.getItem("nurovia_active_dates") || "[]");

  // A. Calculate Streak
  let streakDays = 0;
  if (activeDates.length > 0) {
    const sortedDates = Array.from(new Set(activeDates)).sort().reverse();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    
    // Check if user was active today or yesterday
    const todayStr = checkDate.toISOString().split("T")[0];
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split("T")[0];

    if (sortedDates.includes(todayStr) || sortedDates.includes(yesterdayStr)) {
      let curr = sortedDates.includes(todayStr) ? new Date(today) : new Date(checkDate);
      while (true) {
        const dStr = curr.toISOString().split("T")[0];
        if (sortedDates.includes(dStr)) {
          streakDays++;
          curr.setDate(curr.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // B. Calculate Counts
  const chatsCount = chatSessions.reduce((acc, s) => acc + (s.messages?.length || 0), 0);
  const notesMastered = historyLog.filter(item => item.type === "note").length + 
                        activityLog.filter(a => a.type === "note").length;

  let totalQuestionsAnswered = 0;
  let totalCorrectAnswers = 0;
  
  quizAttempts.forEach(qa => {
    totalQuestionsAnswered += qa.totalQuestions;
    totalCorrectAnswers += qa.correctAnswers;
  });

  const problemsSolved = totalQuestionsAnswered;
  const quizAccuracy = totalQuestionsAnswered > 0 
    ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100) 
    : 0;

  const flashcardsStudied = activityLog.filter(a => a.type === "flashcard").length * 10;

  // C. Calculate Study Time (in minutes)
  // 1 Chat question = ~3 mins, 1 Note = ~15 mins, 1 Quiz = ~10 mins, 1 Flashcard set = ~8 mins
  const studyTimeMinutes = (chatsCount * 3) + (notesMastered * 15) + (quizAttempts.length * 10) + (flashcardsStudied * 1);
  const completedHours = Math.round((studyTimeMinutes / 60) * 10) / 10;
  const goalHours = 15; // default weekly target

  // D. Calculate XP & Level
  // 15 XP per chat message, 50 XP per simplified note, 20 XP per correct quiz answer, 5 XP per flashcard
  const totalXp = (chatsCount * 15) + (notesMastered * 50) + (totalCorrectAnswers * 20) + (flashcardsStudied * 5);
  const level = Math.floor(totalXp / 250) + 1;

  // E. Dynamic Achievements
  const achievementsList: Achievement[] = [
    {
      id: "first_doubt",
      title: "First Spark",
      description: "Ask your first question in the AI Doubt Solver",
      icon: "Sparkles",
      unlocked: chatsCount > 0,
      progress: chatsCount > 0 ? 100 : 0,
    },
    {
      id: "note_simplifier",
      title: "Synthesizer",
      description: "Simplify 3 complex study notes or lecture slides",
      icon: "FileText",
      unlocked: notesMastered >= 3,
      progress: Math.min(100, Math.round((notesMastered / 3) * 100)),
    },
    {
      id: "quiz_ace",
      title: "Quiz Master",
      description: "Complete practice quiz with 80%+ accuracy",
      icon: "Award",
      unlocked: quizAccuracy >= 80 && quizAttempts.length > 0,
      progress: quizAttempts.length > 0 ? Math.min(100, quizAccuracy) : 0,
    },
    {
      id: "streak_3",
      title: "Consistent Mind",
      description: "Maintain a 3-day active study streak",
      icon: "Flame",
      unlocked: streakDays >= 3,
      progress: Math.min(100, Math.round((streakDays / 3) * 100)),
    },
    {
      id: "century_xp",
      title: "Century Club",
      description: "Earn 500 XP through active local learning",
      icon: "Zap",
      unlocked: totalXp >= 500,
      progress: Math.min(100, Math.round((totalXp / 500) * 100)),
    }
  ];

  return {
    guestId,
    streakDays,
    completedHours,
    goalHours,
    problemsSolved,
    notesMastered,
    quizAccuracy,
    studyTimeMinutes,
    totalXp,
    level,
    chatsCount,
    flashcardsStudied,
    achievements: achievementsList,
    recentActivity: activityLog.slice(0, 10)
  };
};
