import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import MathText from "./MathText";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!content) return null;

  // Split content into code blocks and normal text blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  const renderTextWithFormatting = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        return <div key={idx} className="h-2" />;
      }

      // Check for headers (e.g., ### Concept)
      if (trimmedLine.startsWith("###")) {
        return (
          <h4 key={idx} className="font-display font-semibold text-slate-800 text-base mt-4 mb-2">
            <MathText content={trimmedLine.replace(/^###\s*/, "")} />
          </h4>
        );
      }
      if (trimmedLine.startsWith("##")) {
        return (
          <h3 key={idx} className="font-display font-bold text-slate-800 text-lg mt-5 mb-2 border-b border-slate-100 pb-1">
            <MathText content={trimmedLine.replace(/^##\s*/, "")} />
          </h3>
        );
      }
      if (trimmedLine.startsWith("#")) {
        return (
          <h2 key={idx} className="font-display font-bold text-slate-900 text-xl mt-6 mb-3">
            <MathText content={trimmedLine.replace(/^#\s*/, "")} />
          </h2>
        );
      }

      // Check for bullet points (* or -)
      if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1.5 text-slate-700">
            <span className="text-emerald-500 mt-1.5 shrink-0 block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="flex-1 leading-relaxed">
              <MathText content={trimmedLine.replace(/^[\*\-]\s*/, "")} />
            </span>
          </div>
        );
      }

      // Check for numbered lists (e.g., 1., 2.)
      const numListMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
      if (numListMatch) {
        const num = numListMatch[1];
        const rest = numListMatch[2];
        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-2 text-slate-700">
            <span className="font-display font-bold text-emerald-600 shrink-0 min-w-[1.25rem]">
              {num}.
            </span>
            <span className="flex-1 leading-relaxed">
              <MathText content={rest} />
            </span>
          </div>
        );
      }

      // Default paragraph
      return (
        <div key={idx} className="text-slate-700 leading-relaxed mb-3 text-[15px]">
          <MathText content={line} />
        </div>
      );
    });
  };
  return (
    <div className="space-y-1">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          // Extract language and code content
          const match = part.match(/^```(\w*)\n([\s\S]*?)```$/);
          const lang = match ? match[1] : "code";
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="relative group my-4 rounded-xl border border-slate-200 bg-slate-900 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between bg-slate-800/80 px-4 py-2 text-xs font-mono text-slate-300 border-b border-slate-700/50">
                <span>{lang || "code"}</span>
                <button
                  onClick={() => handleCopy(code)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 transition-colors py-0.5 px-1.5 rounded bg-slate-700/50 hover:bg-slate-700"
                >
                  {copiedText === code ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-[13.5px] font-mono text-slate-100 overflow-x-auto leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        } else {
          return <div key={index}>{renderTextWithFormatting(part)}</div>;
        }
      })}
    </div>
  );
}
