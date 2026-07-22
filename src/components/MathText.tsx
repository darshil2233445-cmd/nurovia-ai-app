import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Helper to render KaTeX math safely
export function renderMath(tex: string, displayMode: boolean): React.ReactNode {
  try {
    let cleanTex = tex.trim();
    if (cleanTex.startsWith("$$") && cleanTex.endsWith("$$")) {
      cleanTex = cleanTex.slice(2, -2).trim();
    } else if (cleanTex.startsWith("$") && cleanTex.endsWith("$")) {
      cleanTex = cleanTex.slice(1, -1).trim();
    } else if (cleanTex.startsWith("\\[") && cleanTex.endsWith("\\]")) {
      cleanTex = cleanTex.slice(2, -2).trim();
    } else if (cleanTex.startsWith("\\(") && cleanTex.endsWith("\\)")) {
      cleanTex = cleanTex.slice(2, -2).trim();
    }

    const html = katex.renderToString(cleanTex, {
      displayMode,
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (err) {
    console.error("KaTeX rendering error for:", tex, err);
    return <span>{tex}</span>;
  }
}

interface MathTextProps {
  content?: string;
  text?: string;
  className?: string;
}

// Render text, bolding, inline code, and math mixed together
export default function MathText({ content, text, className = "" }: MathTextProps) {
  const actualContent = content || text || "";
  if (!actualContent) return null;

  // Split by display math blocks first
  const displayRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g;
  const blocks = actualContent.split(displayRegex);

  return (
    <div className={`space-y-1 inline-block w-full ${className}`}>
      {blocks.map((block, idx) => {
        if (block.startsWith("$$") && block.endsWith("$$")) {
          const math = block.slice(2, -2).trim();
          return (
            <div key={idx} className="my-2.5 overflow-x-auto overflow-y-hidden text-center w-full block">
              {renderMath(math, true)}
            </div>
          );
        }
        if (block.startsWith("\\[") && block.endsWith("\\]")) {
          const math = block.slice(2, -2).trim();
          return (
            <div key={idx} className="my-2.5 overflow-x-auto overflow-y-hidden text-center w-full block">
              {renderMath(math, true)}
            </div>
          );
        }

        // Handle inline math and markdown formatting
        const inlineRegex = /(\$[^\$\n]+?\$|\\\([^\n]+?\\\)|`[^`]+?`|\*\*[^\*]+?\*\*)/g;
        const inlineParts = block.split(inlineRegex);

        return (
          <span key={idx} className="inline">
            {inlineParts.map((part, pIdx) => {
              if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
                return <span key={pIdx} className="px-0.5">{renderMath(part.slice(1, -1), false)}</span>;
              }
              if (part.startsWith("\\(") && part.endsWith("\\)") && part.length > 4) {
                return <span key={pIdx} className="px-0.5">{renderMath(part.slice(2, -2), false)}</span>;
              }
              if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
                return (
                  <code key={pIdx} className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[0.85em] text-blue-600 dark:text-blue-400">
                    {part.slice(1, -1)}
                  </code>
                );
              }
              if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
                return <strong key={pIdx} className="font-bold">{part.slice(2, -2)}</strong>;
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}
