import type { Request } from "express";

export interface AuthUser {
  userId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
