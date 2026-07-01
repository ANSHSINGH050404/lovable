import type { Request, Response, NextFunction } from "express";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import * as authService from "../services/auth.service";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.loginUser(data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = await authService.getUserById(req.user!.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
