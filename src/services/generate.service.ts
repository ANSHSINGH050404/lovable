import { prisma } from "../../db";
import { generateCode, AIServiceError } from "./ai.service";
import type { GenerationResult } from "../schemas/generate.schema";
import { sandboxManager } from "./sandbox.service";

export class GenerateError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

export async function generate(
  userId: number,
  projectId: number,
  prompt: string,
  sessionId?: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: true },
  });

  if (!project) throw new GenerateError("Project not found", 404);
  if (project.userId !== userId) throw new GenerateError("Forbidden", 403);

  const session = await getOrCreateSession(userId, projectId, sessionId);

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      userId,
      projectId,
      message: prompt,
    },
  });

  const existingFiles = await prisma.projectFile.findMany({
    where: { projectId },
  });

  const fileTree = existingFiles.map((f) => f.filePath);

  const buildErrors: string[] = [];

  const recentMessages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const chatHistory = recentMessages
    .reverse()
    .map((m) => ({ role: "user" as const, message: m.message }));

  const result: GenerationResult = await generateCode({
    prompt,
    framework: "Next.js 15 with App Router, Tailwind CSS",
    fileTree,
    existingFileContents: existingFiles.map(
      (f) => `\n--- ${f.filePath} ---\n${f.content ?? ""}`
    ),
    chatHistory,
    buildErrors,
  });

  for (const file of result.files) {
    if (file.action === "delete") {
      await prisma.projectFile.deleteMany({
        where: { projectId, filePath: file.path },
      });
    } else {
      await prisma.projectFile.upsert({
        where: {
          projectId_filePath: { projectId, filePath: file.path },
        },
        create: {
          projectId,
          fileName: file.path.split("/").pop() ?? file.path,
          filePath: file.path,
          content: file.content,
        },
        update: { content: file.content },
      });
    }
  }

  const updatedFiles = await prisma.projectFile.findMany({
    where: { projectId },
  });

  let previewUrl: string | null = null;
  try {
    previewUrl = await sandboxManager.sync(projectId, updatedFiles);
  } catch (err) {
    console.warn("Sandbox sync failed (preview may not update):", err);
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      userId,
      projectId,
      message: JSON.stringify({
        type: "generation",
        plan: result.plan,
        filesGenerated: result.files.map((f) => f.path),
        previewUrl,
      }),
    },
  });

  await prisma.usageLog.create({
    data: {
      userId,
      projectId,
      action: "generate",
      tokenUsed: 0,
      durationMs: 0,
    },
  });

  return {
    plan: result.plan,
    files: result.files,
    previewUrl,
    sessionId: session.sessionId,
  };
}

async function getOrCreateSession(
  userId: number,
  projectId: number,
  sessionId?: string
) {
  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({
      where: { sessionId },
    });
    if (existing) return existing;
  }

  return prisma.chatSession.create({
    data: {
      sessionId: sessionId ?? crypto.randomUUID(),
      userId,
      projectId,
    },
  });
}
