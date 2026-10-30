// Runs the Vite SPA build and exits after the prerendered shell is written.
import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const shell = resolve("dist/client/_shell.html");
const child = spawn("pnpm", ["exec", "vite", "build"], { stdio: ["ignore", "pipe", "inherit"] });

let sawPrerender = false;
let finished = false;

function finish(code) {
  if (finished) return;
  finished = true;
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 3000).unref();
  process.exit(code);
}

child.stdout.on("data", (buf) => {
  const output = buf.toString();
  process.stdout.write(output);
  if (output.includes("Prerendered")) sawPrerender = true;
});

const timer = setInterval(() => {
  if (sawPrerender && existsSync(shell) && statSync(shell).size > 0) {
    clearInterval(timer);
    console.log("[build-spa] _shell.html is ready, finishing build.");
    setTimeout(() => finish(0), 1500);
  }
}, 500);

child.on("exit", (code) => {
  if (finished) return;
  clearInterval(timer);
  if (code === 0 && existsSync(shell)) finish(0);
  else {
    console.error(`[build-spa] vite build exited with code ${code}`);
    finish(code || 1);
  }
});
