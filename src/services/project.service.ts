import { prisma } from "../../db";

export class ProjectError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

interface CreateInput {
  name: string;
  description?: string;
}

interface UpdateInput {
  name?: string;
  description?: string;
}

export async function createProject(userId: number, input: CreateInput) {
  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
    },
  });

  return project;
}

export async function listProjects(userId: number) {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return projects;
}

export async function getProjectById(userId: number, projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new ProjectError("Project not found", 404);
  }

  if (project.userId !== userId) {
    throw new ProjectError("Not authorized to access this project", 403);
  }

  return project;
}

export async function updateProject(
  userId: number,
  projectId: number,
  input: UpdateInput,
) {
  await getProjectById(userId, projectId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: input,
  });

  return project;
}

export async function deleteProject(userId: number, projectId: number) {
  await getProjectById(userId, projectId);

  await prisma.project.delete({
    where: { id: projectId },
  });
}

export async function getProjectFiles(userId: number, projectId: number) {
  await getProjectById(userId, projectId);

  const files = await prisma.projectFile.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return files;
}
