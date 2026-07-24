import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();
console.log("API Key Status:", process.env.GEMINI_API_KEY ? "Loaded" : "Missing");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 10mb limit for larger text documents & images
  app.use(express.json({ limit: "10mb" }));

  // --- IN-MEMORY RATE LIMITER & PROTECTION ENGINE ---
  interface RateLimitRecord {
    count: number;
    resetTime: number;
  }
  const ipRateLimits: { [ip: string]: RateLimitRecord } = {};

  function applyRateLimit(limit: number, windowMs: number) {
    return (req: any, res: any, next: any) => {
      const ip = req.ip || req.headers["x-forwarded-for"] || "unknown-ip";
      const now = Date.now();

      if (!ipRateLimits[ip]) {
        ipRateLimits[ip] = { count: 1, resetTime: now + windowMs };
        return next();
      }

      const record = ipRateLimits[ip];
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return next();
      }

      record.count++;
      if (record.count > limit) {
        return res.status(429).json({
          error: "Too many requests. Please wait a moment before trying again to prevent abuse."
        });
      }
      next();
    };
  }

  // --- GEMINI AI CLIENT LAZY LOADER ---
  let aiInstance: GoogleGenAI | null = null;
  function getAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure your key in the AI Studio Secrets panel.");
    }
    if (!aiInstance) {
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
    return aiInstance;
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Robust generateContent wrapper with automatic fallback models and retry capability
  async function generateContentWithFallback(ai: GoogleGenAI, options: any) {
    const primaryModel = options.model || "gemini-3.5-flash";
    const candidateModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
    ];
    const uniqueModels = Array.from(new Set(candidateModels));

    let lastError: any = null;
    for (const model of uniqueModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[AI Call] Attempting model "${model}" (attempt ${attempt}/2)`);
          const response = await ai.models.generateContent({
            ...options,
            model,
          });
          console.log(`[AI Call] Success using model "${model}"`);
          return response;
        } catch (error: any) {
          lastError = error;
          console.warn(`[AI Call Warning] Error on model "${model}" (attempt ${attempt}/2):`, error.message || error);
          
          const isTransient = error.status === 503 || error.status === 429 || error.statusCode === 503 || error.statusCode === 429 || (error.message && (error.message.includes("503") || error.message.includes("429") || error.message.toLowerCase().includes("limit") || error.message.toLowerCase().includes("demand") || error.message.toLowerCase().includes("unavailable")));
          
          if (!isTransient && attempt === 1) {
            break;
          }
          
          if (attempt < 2) {
            const delay = attempt * 1000;
            console.log(`[AI Call] Waiting ${delay}ms before retry...`);
            await sleep(delay);
          }
        }
      }
    }
    throw lastError;
  }

  // --- API ROUTE: Tutor Chat ---
  app.post("/api/chat", applyRateLimit(30, 60 * 1000), async (req, res) => {
    try {
      const { messages, level = "College", mode = "doubt", attachedFile } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required." });
      }

      const ai = getAI();

      const systemInstruction = `You are Nurovia AI, an intelligent educational assistant and highly accurate AI tutor designed to help students learn faster and understand concepts deeply.
Your primary goal is to help the user in every situation.

Strict Nurovia AI Rules to Follow:
1. Never reject a question just because it is unclear, incomplete, contains spelling mistakes, or appears meaningless.
2. First, intelligently infer the user's most likely intention from the words they used.
3. If multiple interpretations are possible, choose the most likely one and answer it. Briefly mention the assumption you made.
4. Correct spelling mistakes and grammatical errors internally before generating a response.
5. If the input is random words or nonsensical, creatively interpret them into the closest meaningful educational topic instead of refusing.
6. If the question is impossible to interpret, politely ask one short clarifying question while also giving examples of what the user might have meant.
7. Always be friendly, intelligent, and solution-oriented.
8. For educational questions:
- Explain concepts step by step.
- Use examples and analogies.
- Match the explanation to the selected difficulty level ("${level}").
9. Format answers using headings, bullet points, equations (when needed), and concise summaries.

Strict Pedagogical Rules:
1. EXPLAIN FIRST: Explain every topic in simple language first.
2. STEP-BY-STEP: Break down complex concepts into logical steps.
3. REAL-LIFE ANALOGIES: Use vivid real-world examples.
4. REASONING MATTERS: Solve math/science step-by-step.
5. CODING RULES: Explain high-level algorithm before code.
6. TARGET LEVEL: Adapt vocabulary and depth to "${level}".
7. ACTIVE LEARNING: End response with a brief follow-up question or micro-challenge.
8. STUDY MODE OBJECTIVE: Adapt to mode ("${mode}": doubt/homework/coding/notes/exam).`;

      const contents = messages.map((m: any, idx: number) => {
        const parts: any[] = [{ text: m.content }];

        if (idx === messages.length - 1 && attachedFile) {
          if (attachedFile.type === "image" || attachedFile.type === "document") {
            parts.push({
              inlineData: {
                mimeType: attachedFile.mimeType || "application/octet-stream",
                data: attachedFile.data
              }
            });
          } else if (attachedFile.type === "text") {
            parts.push({
              text: `\n\n[Attached Plain Text File "${attachedFile.name}":]\n${attachedFile.data}`
            });
          }
        }

        return {
          role: m.role === "user" ? "user" : "model",
          parts
        };
      });

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred during chat processing." });
    }
  });

  // --- API ROUTE: Summarize notes & generate materials ---
  app.post("/api/summarize", applyRateLimit(20, 60 * 1000), async (req, res) => {
    try {
      const { text, topic = "", level = "College", image, mimeType } = req.body;
      if ((!text || typeof text !== "string") && !image) {
        return res.status(400).json({ error: "Either text or an image is required for note summarization." });
      }

      const ai = getAI();

      const prompt = `Analyze the study notes and text/images provided. Focus on the topic "${topic || "General Study"}".
Generate a comprehensive learning suite suited for a "${level}" level student.

${text ? `Text:\n"""\n${text}\n"""\n` : ''}

Return a fully populated JSON object with:
- "summary": list of 4 to 8 clear, highly educational key bullet points summarizing the core concepts.
- "simplifiedExplanation": a very clear, simplified explanation using a creative real-life analogy.
- "flashcards": an array of 4 to 6 flashcards with "front" and "back".
- "quiz": an array of 4 to 6 multiple-choice practice questions with "question", "options" (4), "correctAnswerIndex", and "explanation".`;

      let contents: any = prompt;
      if (image) {
        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: image
          }
        };
        contents = [imagePart, { text: prompt }];
      }

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of key summary points"
              },
              simplifiedExplanation: {
                type: Type.STRING,
                description: "A simple, analogy-driven breakdown"
              },
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                  },
                  required: ["front", "back"]
                }
              },
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctAnswerIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING }
                  },
                  required: ["question", "options", "correctAnswerIndex", "explanation"]
                }
              }
            },
            required: ["summary", "simplifiedExplanation", "flashcards", "quiz"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Summarize API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while summarizing notes." });
    }
  });

  // --- API ROUTE: Generate Standalone Flashcards ---
  app.post("/api/cards/generate", applyRateLimit(20, 60 * 1000), async (req, res) => {
    try {
      const { topic, level = "College" } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required." });
      }

      const ai = getAI();
      const prompt = `Create a set of 6 to 10 high-quality flashcards for active recall on the topic "${topic}" tailored for a "${level}" level student. Return a JSON object with a "flashcards" array containing objects with "front" and "back".`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              flashcards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: { type: Type.STRING },
                    back: { type: Type.STRING }
                  },
                  required: ["front", "back"]
                }
              }
            },
            required: ["flashcards"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Cards API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating flashcards." });
    }
  });

  // --- API ROUTE: Generate Standalone Quiz ---
  app.post("/api/quiz/generate", applyRateLimit(20, 60 * 1000), async (req, res) => {
    try {
      const { topic, level = "College", count = 5 } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required." });
      }

      const ai = getAI();
      const prompt = `Generate ${count} practice questions for a quiz on the topic "${topic}" suitable for a "${level}" level student.
Include varied question types (multiple-choice, numerical, assertion-reason). Provide clear explanations for the answers.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswerIndex: { type: Type.INTEGER },
                    correctAnswerText: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    difficultyBadge: { type: Type.STRING },
                    topicTag: { type: Type.STRING }
                  },
                  required: ["question", "explanation"]
                }
              }
            },
            required: ["quiz"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Quiz API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating the quiz." });
    }
  });

  // --- API ROUTE: Generate Formula Sheet ---
  app.post("/api/formulas/generate", applyRateLimit(20, 60 * 1000), async (req, res) => {
    try {
      const { topic, level = "College" } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required." });
      }

      const ai = getAI();
      const prompt = `Create a comprehensive formula and equation cheat sheet for the topic "${topic}" at "${level}" level. Include LaTeX equations, variable definitions, real-life examples, and common traps/mistakes.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              formulas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    equation: { type: Type.STRING },
                    variables: { type: Type.STRING },
                    realLifeExample: { type: Type.STRING },
                    commonMistake: { type: Type.STRING }
                  },
                  required: ["name", "equation", "variables", "realLifeExample", "commonMistake"]
                }
              }
            },
            required: ["title", "formulas"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Formula API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating formula sheet." });
    }
  });

  // --- API ROUTE: Generate Revision Planner ---
  app.post("/api/planner/generate", applyRateLimit(20, 60 * 1000), async (req, res) => {
    try {
      const { topic, level = "College", days = 5 } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "topic is required." });
      }

      const ai = getAI();
      const prompt = `Generate a ${days}-day structured revision timetable for "${topic}" at "${level}" level. Breakdown each day with subtopics, FAQs, estimated hours, and study tips. Also provide a general overarching strategy.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              generalStrategy: { type: Type.STRING },
              revisionPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    subtopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    frequentlyAskedQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedHours: { type: Type.NUMBER },
                    tips: { type: Type.STRING }
                  },
                  required: ["day", "topic", "subtopics", "frequentlyAskedQuestions", "estimatedHours", "tips"]
                }
              }
            },
            required: ["generalStrategy", "revisionPlan"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Planner API Error:", error);
      res.status(500).json({ error: error.message || "An error occurred while generating revision plan." });
    }
  });

  // --- VITE MIDDLEWARE & STATIC FALLBACK SETUP ---
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Setting up static file serving in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nurovia AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
