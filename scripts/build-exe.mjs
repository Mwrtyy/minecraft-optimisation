import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

mkdirSync("dist-exe", { recursive: true });

// Bundle server entry into a single CommonJS file for pkg.
run("npx esbuild src/server/main.ts --bundle --platform=node --format=cjs --outfile=dist-exe/server-bundle.cjs");

// Build executable for selected targets (default: Windows + Linux x64).
const targets = process.env.EXE_TARGETS ?? "node20-win-x64,node20-linux-x64";
const outputBase = process.env.EXE_OUTPUT ?? "dist-exe/contested-lane-server";
run(`npx pkg dist-exe/server-bundle.cjs --targets ${targets} --output ${outputBase}`);

console.log("\nExecutable build finished. Ship with config/game-config.json alongside the executable.");
