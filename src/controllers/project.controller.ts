import type { Request, Response, NextFunction } from "express";
import { createProjectSchema, updateProjectSchema } from "../schemas/project.schema";
import * as projectService from "../services/project.service";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectService.createProject(req.user!.userId, data);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function list(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const projects = await projectService.listProjects(req.user!.userId);
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const project = await projectService.getProjectById(
      req.user!.userId,
      Number(req.params.id)
    );
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = updateProjectSchema.parse(req.body);
    const project = await projectService.updateProject(
      req.user!.userId,
      Number(req.params.id),
      data
    );
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await projectService.deleteProject(
      req.user!.userId,
      Number(req.params.id)
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getFiles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const files = await projectService.getProjectFiles(
      req.user!.userId,
      Number(req.params.id)
    );
    res.json(files);
  } catch (err) {
    next(err);
  }
}
