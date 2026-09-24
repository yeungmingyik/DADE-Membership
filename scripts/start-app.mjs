import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const surface = process.argv[2] ?? "member";
const ports = { member: 3100, staff: 3101, admin: 3102 };
if (!(surface in ports)) throw new Error("APP_SURFACE_INVALID");
const mode = process.argv.includes("--dev") ? "dev" : "start";
const port = process.env.APP_PORT ?? String(ports[surface]);
const host = process.env.APP_HOST ?? "127.0.0.1";
const args = process.argv.slice(3).filter((argument) => argument !== "--dev");
const command = mode === "dev"
  ? [require.resolve("next/dist/bin/next"), mode, "--hostname", host, "--port", port, ...args]
  : [resolve(".next/standalone/server.js"), ...args];
const child = spawn(process.execPath, command, {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    APP_SURFACE: surface,
    HOSTNAME: host,
    PORT: port,
    DATABASE_PATH: resolve(process.env.DATABASE_PATH ?? ".local/dade.sqlite"),
    NEXT_TELEMETRY_DISABLED: "1"
  }
});
child.on("error", (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
