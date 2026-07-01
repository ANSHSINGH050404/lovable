export const env = {
  PORT: Number(process.env.PORT) || 8000,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  DATABASE_URL: process.env.DATABASE_URL!,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY!,
  SANDBOX_PORT_START: Number(process.env.SANDBOX_PORT_START) || 4000,
};
