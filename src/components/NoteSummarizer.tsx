import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, Sparkles, BookOpen, Brain, ListCollapse, HelpCircle, Loader2, RefreshCw, Image, X } from "lucide-react";
import { StudentLevel, StudySuite } from "../types";
import MathText from "./MathText";
import { saveHistoryItem } from "../historyUtils";

interface NoteSummarizerProps {
  level: StudentLevel;
  onSuiteGenerated: (suite: StudySuite) => void;
  currentSuite: StudySuite | null;
}

export default function NoteSummarizer({ level, onSuiteGenerated, currentSuite }: NoteSummarizerProps) {
  const [topic, setTopic] = useState("");
  const [notesText, setNotesText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<{
    data: string;
    mimeType: string;
    name: string;
    previewUrl: string;
  } | null>(null);

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(file.name);
    const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
    const isBinaryDoc = /\.(pdf|docx?|docm|pptx?)$/i.test(file.name);

    if (!isImage && !isText && !isBinaryDoc) {
      setError("Please upload a supported file (.pdf, .doc, .docx, .docm, .txt, .ppt, .pptx, .png, .jpg, .jpeg, .csv).");
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

          setUploadedImage({
            data: base64,
            mimeType: mimeType,
            name: file.name,
            previewUrl: isImage ? dataUrl : ""
          });

          if (!topic) {
            setTopic(file.name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          setNotesText(text);
          if (!topic) {
            setTopic(file.name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a subject or topic title.");
      return;
    }

    if (!notesText.trim() && !uploadedImage) {
      setError("Please enter text or upload a document/image to summarize.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        topic: topic.trim(),
        text: notesText.trim(),
        level
      };

      if (uploadedImage) {
        payload.image = {
          data: uploadedImage.data,
          mimeType: uploadedImage.mimeType,
          name: uploadedImage.name
        };
      }

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data: StudySuite = await response.json();
      onSuiteGenerated(data);

      saveHistoryItem({
        type: "note",
        title: `Note Suite: ${data.topic}`,
        subtitle: `${data.flashcards?.length || 0} Flashcards • ${data.quiz?.length || 0} Quiz Items`,
        data: { suite: data }
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate study suite. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Creation Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
              <FileText className="text-blue-600 dark:text-blue-400" size={24} /> Note Simplifier & Deck Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Transform rough notes, textbook excerpts, or uploaded files into an instant study suite.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full uppercase tracking-wider hidden sm:inline-block font-display">
            Target: {level}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Subject / Topic Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Subject or Topic Name *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Organic Chemistry Reactions, Data Structures Recursion..."
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden transition-all min-h-[48px]"
            />
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Paste Lecture Text / Class Notes
            </label>
            <textarea
              rows={5}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Paste raw notes, lecture transcriptions, or key formulas here..."
              className="w-full border border-slate-200/80 dark:border-slate-700 rounded-2xl p-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500 focus:outline-hidden transition-all resize-y"
            />
          </div>

          {/* File Upload Drag & Drop Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-display mb-1.5">
              Or Upload Material (.pdf, .doc, .docx, .ppt, .txt, .png, .jpg)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.docm,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploadedImage ? (
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <div className="flex items-center gap-3 overflow-hidden">
                  {uploadedImage.previewUrl ? (
                    <img
                      src={uploadedImage.previewUrl}
                      alt="Uploaded preview"
                      className="w-12 h-12 object-cover rounded-xl border border-blue-300 dark:border-blue-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                  )}
                  <div className="text-left overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{uploadedImage.name}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase font-display">Attached & Ready</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/40"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-slate-800/80"
                }`}
              >
                <Upload size={32} className="mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                  Click to browse or drag & drop files here
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Supports PDF documents, Word docs, PowerPoint decks, text files, and photos of textbook pages.
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 sm:py-4 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-600 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[48px] font-display"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Nurovia AI is generating your study suite...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Generate Study Suite & Flashcards</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Suite Output */}
      {currentSuite && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-md space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-display">
                Generated Suite
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 font-display mt-1">
                {currentSuite.topic}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-display">
                {currentSuite.flashcards?.length || 0} Cards • {currentSuite.quiz?.length || 0} Quiz Questions
              </span>
            </div>
          </div>

          {/* Key Summary Bullet points */}
          {currentSuite.keyTakeaways && currentSuite.keyTakeaways.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display flex items-center gap-1.5">
                <ListCollapse size={16} className="text-blue-600 dark:text-blue-400" /> Key Concept Takeaways
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSuite.keyTakeaways.map((point, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-start gap-3"
                  >
                    <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans">
                      <MathText text={point} />
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Summary Content */}
          {currentSuite.summary && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Brain size={16} className="text-indigo-600 dark:text-indigo-400" /> Executive Overview
              </h4>
              <div className="p-5 bg-blue-50/40 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
                {Array.isArray(currentSuite.summary) ? (
                  currentSuite.summary.map((para, pIdx) => (
                    <p key={pIdx}>
                      <MathText content={para} />
                    </p>
                  ))
                ) : (
                  <MathText content={currentSuite.summary || ""} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
