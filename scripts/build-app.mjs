import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { cp } from "node:fs/promises";

const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
});
child.on("error", (error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
child.on("exit", async (code) => {
  if (code !== 0) { process.exitCode = code ?? 1; return; }
  try {
    await cp("public", ".next/standalone/public", { recursive: true });
    await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
