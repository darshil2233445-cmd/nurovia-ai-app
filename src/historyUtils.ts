import { HistoryItem, HistoryItemType } from "./types";

export const getHistoryKey = (): string => {
  const email = localStorage.getItem("nurovia_user_email");
  if (email) {
    return `studyai_global_history_${email}`;
  }
  return "studyai_global_history_guest";
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
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString()
  };
  const key = getHistoryKey();
  localStorage.setItem(key, JSON.stringify([newItem, ...history]));
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
