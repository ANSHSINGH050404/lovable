import { z } from "zod";

export const generateSchema = z.object({
  prompt: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
});

export interface FilePatch {
  path: string;
  content: string;
  action: "create" | "replace" | "delete";
}

export interface GenerationPlan {
  tasks: string[];
  reasoning: string;
}

export interface GenerationResult {
  plan: GenerationPlan;
  files: FilePatch[];
}
