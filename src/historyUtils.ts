import { HistoryItem } from "./types";
import { recordGuestActivity } from "./utils/guestStorage";

export const getHistoryKey = (): string => {
  return "studyai_global_history_local";
};

export const getHistory = (): HistoryItem[] => {
  try {
    const key = getHistoryKey();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveHistoryItem = (item: Omit<HistoryItem, "id" | "timestamp">) => {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    timestamp: new Date().toISOString()
  };
  const key = getHistoryKey();
  localStorage.setItem(key, JSON.stringify([newItem, ...history]));

  // Log activity
  recordGuestActivity(item.type, { title: item.title });
};

export const deleteHistoryItem = (id: string) => {
  const history = getHistory();
  const key = getHistoryKey();
  localStorage.setItem(key, JSON.stringify(history.filter(h => h.id !== id)));
};

export const deleteHistoryItems = (ids: string[]) => {
  const history = getHistory();
  const key = getHistoryKey();
  localStorage.setItem(key, JSON.stringify(history.filter(h => !ids.includes(h.id))));
};

export const clearHistory = () => {
  const key = getHistoryKey();
  localStorage.removeItem(key);
};
