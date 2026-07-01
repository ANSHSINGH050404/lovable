import { prisma } from "../../db";
import { hashPassword, comparePassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import type { AuthUser } from "../types";

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "AuthError";
  }
}

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AuthError("Email already in use", 409);
  }

  const hashed = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashed,
      name: input.name,
    },
  });

  const payload: AuthUser = { userId: user.id, email: user.email };
  const token = signAccessToken(payload);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const valid = await comparePassword(input.password, user.password);

  if (!valid) {
    throw new AuthError("Invalid email or password", 401);
  }

  const payload: AuthUser = { userId: user.id, email: user.email };
  const token = signAccessToken(payload);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function getUserById(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AuthError("User not found", 404);
  }

  return { id: user.id, email: user.email, name: user.name };
}
