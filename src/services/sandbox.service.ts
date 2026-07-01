import { env } from "../config/env";
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProjectFile } from "../../generated/prisma/client";

interface SandboxInstance {
  projectId: number;
  port: number;
  dir: string;
  containerId: string | null;
}

class SandboxManager {
  private instances = new Map<number, SandboxInstance>();
  private nextPort = env.SANDBOX_PORT_START;
  private baseDir = join(process.cwd(), ".sandboxes");

  constructor() {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async sync(
    projectId: number,
    files: { fileName: string; filePath: string; content: string | null }[]
  ): Promise<string | null> {
    let instance = this.instances.get(projectId);

    if (!instance) {
      instance = await this.start(projectId, files);
      this.instances.set(projectId, instance);
    }

    this.writeFiles(instance.dir, files);
    return `http://localhost:${instance.port}`;
  }

  private async start(
    projectId: number,
    files: { fileName: string; filePath: string; content: string | null }[]
  ): Promise<SandboxInstance> {
    const port = this.nextPort++;
    const dir = join(this.baseDir, `project-${projectId}`);

    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }

    mkdirSync(dir, { recursive: true });
    this.writeFiles(dir, files);

    this.writeFileSync(
      join(dir, "package.json"),
      JSON.stringify(
        {
          name: `sandbox-${projectId}`,
          private: true,
          scripts: {
            dev: "next dev --port " + port,
            build: "next build",
          },
          dependencies: {
            next: "^15.0.0",
            react: "^19.0.0",
            "react-dom": "^19.0.0",
          },
        },
        null,
        2
      )
    );

    this.writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    }, null, 2));

    const containerId = this.runContainer(dir, port);

    return { projectId, port, dir, containerId };
  }

  private runContainer(dir: string, port: number): string {
    try {
      const containerId = execSync(
        `docker run -d --rm ` +
        `-p ${port}:${port} ` +
        `-v "${dir}:/app" ` +
        `-w /app ` +
        `--name sandbox-${port} ` +
        `node:22-alpine ` +
        `sh -c "npm install && npm run dev"`,
        { encoding: "utf-8", timeout: 30000 }
      ).trim();

      return containerId;
    } catch (err) {
      console.warn(
        "Docker not available or sandbox start failed. Preview will not work.",
        err
      );
      return `sandbox-${port}`;
    }
  }

  private writeFiles(
    dir: string,
    files: { fileName: string; filePath: string; content: string | null }[]
  ) {
    for (const file of files) {
      if (!file.content) continue;
      const fullPath = join(dir, file.filePath);
      const parent = fullPath.split("\\").slice(0, -1).join("\\");
      if (!existsSync(parent)) {
        mkdirSync(parent, { recursive: true });
      }
      this.writeFileSync(fullPath, file.content);
    }
  }

  private writeFileSync(path: string, content: string) {
    writeFileSync(path, content, "utf-8");
  }

  stop(projectId: number) {
    const instance = this.instances.get(projectId);
    if (!instance) return;

    if (instance.containerId) {
      try {
        execSync(`docker stop ${instance.containerId}`, {
          timeout: 5000,
          stdio: "ignore",
        });
      } catch { }
    }

    this.instances.delete(projectId);
  }

  stopAll() {
    for (const [id] of this.instances) {
      this.stop(id);
    }
  }
}

export const sandboxManager = new SandboxManager();
