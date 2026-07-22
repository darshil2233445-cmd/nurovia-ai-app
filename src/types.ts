export type TargetLevel = "School" | "College";
export type HistoryItemType = "chat" | "note" | "quiz" | "formula" | "planner";

export interface HistoryItem {
  id: string;
  type: HistoryItemType;
  title: string;
  subtitle?: string;
  timestamp: string;
  data: any;
}

export type DifficultyLevel = "Beginner" | "Advanced";
export type StudentLevel = "School" | "College" | "Beginner" | "Advanced";

export type StudyMode = "doubt" | "homework" | "coding" | "notes" | "exam";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: "image" | "text" | "document";
    previewUrl?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  userId: string | null; // null for guest
}

export interface Flashcard {
  front: string;
  back: string;
}

export type QuestionType = "mcq" | "multiple_correct" | "true_false" | "assertion_reason" | "fill_in_blank" | "numerical";

export interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswerIndex?: number;
  correctAnswerIndices?: number[];
  correctAnswerText?: string;
  type?: QuestionType;
  explanation: string;
  difficultyBadge?: "Easy" | "Medium" | "Hard" | "Advanced";
  estimatedTimeSeconds?: number;
  topicTag?: string;
  conceptTag?: string;
}

export interface StudySuite {
  summary: string | string[];
  keyTakeaways?: string[];
  simplifiedExplanation?: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  generatedAt?: string;
  topic?: string;
}

export interface RevisionDay {
  day: string;
  topic: string;
  subtopics: string[];
  frequentlyAskedQuestions: string[];
  estimatedHours: number;
  tips: string;
  completed?: boolean;
}

export interface RevisionPlan {
  revisionPlan: RevisionDay[];
  generalStrategy: string;
}

export interface FormulaConcept {
  name: string;
  equation: string;
  variables: string;
  realLifeExample: string;
  commonMistake: string;
}

export interface FormulaSheet {
  title: string;
  formulas: FormulaConcept[];
}
