import { existsSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const node = process.execPath;
const wrangler = "./node_modules/wrangler/bin/wrangler.js";
const config = "dist/server/wrangler.json";
const stateDirectory = "/data";
const migrationMarker = `${stateDirectory}/.careerfolio-schema-v1`;

if (!existsSync(migrationMarker)) {
  const migration = spawnSync(node, [
    "--import", "./scripts/sites-env.mjs", wrangler,
    "d1", "execute", "DB", "--local",
    "--config", config,
    "--persist-to", stateDirectory,
    "--file", "drizzle/0000_cool_cobalt_man.sql",
  ], { stdio: "inherit", env: process.env });

  if (migration.status !== 0) process.exit(migration.status ?? 1);
  writeFileSync(migrationMarker, new Date().toISOString(), "utf8");
}

const server = spawn(node, [
  "--import", "./scripts/sites-env.mjs", wrangler,
  "dev", "--local",
  "--config", config,
  "--persist-to", stateDirectory,
  "--ip", "0.0.0.0",
  "--port", "3000",
  "--inspector-port", "0",
], { stdio: "inherit", env: process.env });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
