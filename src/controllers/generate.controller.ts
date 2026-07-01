import type { Request, Response, NextFunction } from "express";
import { generateSchema } from "../schemas/generate.schema";
import * as generateService from "../services/generate.service";

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const projectId = Number(req.params.id);
    const { prompt, sessionId } = generateSchema.parse(req.body);
    const result = await generateService.generate(
      req.user!.userId,
      projectId,
      prompt,
      sessionId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
