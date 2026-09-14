import { existsSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const node = process.execPath;
const wrangler = "./node_modules/wrangler/bin/wrangler.js";
const config = "dist/server/wrangler.json";
const stateDirectory = "/data";
const migrationMarker = `${stateDirectory}/.careerfolio-schema-v1`;
const sharedAccountMigrationMarker = `${stateDirectory}/.careerfolio-schema-v2`;

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

if (!existsSync(sharedAccountMigrationMarker)) {
  const migration = spawnSync(node, [
    "--import", "./scripts/sites-env.mjs", wrangler,
    "d1", "execute", "DB", "--local",
    "--config", config,
    "--persist-to", stateDirectory,
    "--file", "drizzle/0001_oval_power_man.sql",
  ], { stdio: "inherit", env: process.env });

  if (migration.status !== 0) process.exit(migration.status ?? 1);
  writeFileSync(sharedAccountMigrationMarker, new Date().toISOString(), "utf8");
}

const variableArguments = [];
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "ACCOUNT_SERVICE_URL",
  "TEACHER_EMAILS",
  "STUDENT_EMAILS",
]) {
  if (process.env[key]) variableArguments.push("--var", `${key}:${process.env[key]}`);
}

const server = spawn(node, [
  "--import", "./scripts/sites-env.mjs", wrangler,
  "dev", "--local",
  "--config", config,
  "--persist-to", stateDirectory,
  "--ip", "0.0.0.0",
  "--port", "3000",
  "--inspector-port", "0",
  ...variableArguments,
], { stdio: "inherit", env: process.env });

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
