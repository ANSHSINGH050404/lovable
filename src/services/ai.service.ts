import { env } from "../config/env";
import type { GenerationResult } from "../schemas/generate.schema";

export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

interface ContextInput {
  prompt: string;
  framework: string;
  fileTree: string[];
  existingFileContents: string[];
  chatHistory: { role: "user" | "assistant"; message: string }[];
  buildErrors: string[];
}

const SYSTEM_PROMPT = `You are an expert full-stack code generator. Your job is to:

1. Analyze the user's prompt and the existing project context
2. Create a plan (list of tasks) 
3. Generate the actual file changes

You MUST respond with valid JSON only. No markdown, no code fences, no explanation.

The JSON shape:
{
  "plan": {
    "tasks": ["task description 1", "task description 2"],
    "reasoning": "brief explanation of your approach"
  },
  "files": [
    {
      "path": "relative/file/path.tsx",
      "action": "create" | "replace" | "delete",
      "content": "file contents here"
    }
  ]
}

Rules:
- Use "create" for new files, "replace" for existing files, "delete" for files to remove
- Always generate complete files (not partial diffs)
- Keep existing imports and code structure unless the prompt explicitly asks to change them
- Use TypeScript, proper error handling, and modern patterns
- If the project uses Next.js App Router, prefer server components where appropriate
- Generate production-quality code`;

export async function generateCode(
  input: ContextInput
): Promise<GenerationResult> {
  const context = buildContext(input);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: context }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AIServiceError(
      `Gemini API error (${response.status}): ${body}`,
      response.status
    );
  }

  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new AIServiceError("No response from Gemini");
  }

  return parseResult(text);
}

function buildContext(input: ContextInput): string {
  return [
    SYSTEM_PROMPT,
    "",
    "--- PROJECT CONTEXT ---",
    `Framework: ${input.framework}`,
    "",
    "File tree:",
    ...input.fileTree.map((f) => `  ${f}`),
    "",
    "Existing file contents:",
    ...input.existingFileContents,
    "",
    ...(input.buildErrors.length > 0
      ? ["Build errors:", ...input.buildErrors.map((e) => `  ${e}`), ""]
      : []),
    ...(input.chatHistory.length > 0
      ? [
          "Chat history:",
          ...input.chatHistory.map(
            (m) => `  ${m.role === "user" ? "User" : "Assistant"}: ${m.message}`
          ),
          "",
        ]
      : []),
    "--- USER PROMPT ---",
    input.prompt,
    "",
    "Generate the plan and file changes as JSON:",
  ].join("\n");
}

function parseResult(text: string): GenerationResult {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/gm, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new AIServiceError("Failed to parse Gemini response as JSON");
  }
}
