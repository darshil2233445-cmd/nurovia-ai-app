import React, { useState, useEffect } from "react";
import { History, Trash2, CheckSquare, Square, Search, Filter, AlertTriangle } from "lucide-react";
import { HistoryItem } from "../types";
import { getHistory, deleteHistoryItem, deleteHistoryItems, clearHistory } from "../historyUtils";
import MathText from "./MathText";

interface HistoryViewerProps {
  onLoadItem: (item: HistoryItem) => void;
}

export default function HistoryViewer({ onLoadItem }: HistoryViewerProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const refresh = () => setHistory(getHistory());

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.size} items?`)) {
      deleteHistoryItems(Array.from(selectedIds));
      setSelectedIds(new Set());
      refresh();
    }
  };

  const handleClearAll = () => {
    clearHistory();
    setShowClearConfirm(false);
    setSelectedIds(new Set());
    refresh();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const filteredHistory = history.filter(item => {
    if (filterType !== "all" && item.type !== filterType) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTypeLabel = (type: string) => {
    switch(type) {
      case "chat": return "Chat Question";
      case "note": return "Study Note";
      case "quiz": return "Practice Quiz";
      case "formula": return "Formula Library";
      case "planner": return "Revision Plan";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <History className="text-blue-600 dark:text-blue-400" size={24} /> Study Activity Log & History
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Browse, search, and reload previous study sessions, notes, quizzes, and formulas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Trash2 size={16} /> Delete Selected ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
            >
              Clear Log
            </button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden transition-all min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {["all", "chat", "note", "quiz", "formula", "planner"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs font-bold font-display rounded-xl capitalize transition-all whitespace-nowrap min-h-[36px] ${
                  filterType === type
                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 font-semibold font-display">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <span>Are you sure you want to clear your local history log? This action cannot be undone.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {/* History Items List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <History size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-display">No history items found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              As you use Nurovia AI to solve doubts, generate note suites, or create formula sheets, your activity will automatically appear here.
            </p>
          </div>
        ) : (
          filteredHistory.map((item) => {
            const isSelected = selectedIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer min-h-[56px] ${
                  isSelected
                    ? "bg-blue-50/80 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700"
                    : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
                onClick={() => onLoadItem(item)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                  >
                    {isSelected ? <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" /> : <Square size={18} />}
                  </button>

                  <div className="text-left overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950 px-2 py-0.5 rounded-md uppercase tracking-wider font-display shrink-0">
                        {getTypeLabel(item.type)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.timestamp}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate font-display mt-0.5">
                      <MathText text={item.title} />
                    </h4>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <MathText text={item.subtitle} />
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteHistoryItem(item.id);
                    refresh();
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
