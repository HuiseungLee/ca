import { existsSync, readdirSync, writeFileSync, readFileSync, chmodSync, chownSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Run interactively ON THE NAS. Never pass SMTP credentials on the command line.
const root = '/volume2/webapps';
const source = `${root}/careerfolio/source`;
const accountSource = `${root}/accounts/source`;
const envFile = `${root}/accounts/.env`;
if (process.platform !== 'linux' || !process.stdin.isTTY || process.getuid?.() !== 0) throw new Error('Run in an interactive root Node container on the NAS.');
if (resolve(dirname(fileURLToPath(import.meta.url)), '..') !== source) throw new Error('Unexpected source directory.');
for (const folder of [source, accountSource, `${root}/accounts/data`, `${root}/careerfolio/data`]) {
  if (!existsSync(folder)) throw new Error(`Missing expected folder: ${folder}`);
}
if (existsSync(envFile)) throw new Error('Existing accounts/.env preserved. Do not rerun setup or regenerate database secrets.');
for (const [folder, marker] of [[`${root}/accounts/data`, 'accounts-v1'], [`${root}/careerfolio/data`, 'careerfolio-v1']]) {
  const entries = readdirSync(folder);
  if (entries.some(name => name !== '.foredu-storage')) throw new Error('Data already exists. Stop and plan recovery before initialization.');
  if (entries.includes('.foredu-storage') && readFileSync(`${folder}/.foredu-storage`, 'utf8').trim() !== marker) throw new Error('Unexpected data marker.');
}
if (readdirSync(accountSource).some(name => !['server.mjs', 'Dockerfile', 'Dockerfile.db', 'compose.yml', 'init.sql'].includes(name))) throw new Error('accounts/source is not empty; preserve and inspect its files first.');
const rl = createInterface({ input: process.stdin, output: process.stdout });
const emailPattern = /^[A-Za-z0-9.!#%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
let sender; let teachers;
try {
  sender = (await rl.question('Gmail sender address: ')).trim().toLowerCase();
  teachers = (await rl.question('Verified teacher email(s), comma-separated: ')).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (!emailPattern.test(sender) || !teachers.length || teachers.some(email => !emailPattern.test(email))) throw new Error('Invalid email address.');
} finally { rl.close(); }
process.stdout.write('Gmail APP password (input hidden, never your Google password): ');
const password = await new Promise((resolvePassword, reject) => {
  let value = '';
  process.stdin.setRawMode(true); process.stdin.resume();
  const cleanup = () => { process.stdin.setRawMode(false); process.stdin.off('data', onData); process.stdin.pause(); process.stdout.write('\n'); };
  const onData = chunk => {
    for (const char of chunk.toString()) {
      if (char === '\u0003') { cleanup(); reject(new Error('Cancelled; no secrets saved.')); return; }
      if (char === '\r' || char === '\n') { cleanup(); resolvePassword(value.replace(/\s/g, '')); return; }
      if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
      else if (/^[a-zA-Z0-9 ]$/.test(char)) value += char;
      if (value.length > 100) { cleanup(); reject(new Error('App password too long.')); return; }
    }
  };
  process.stdin.on('data', onData);
});
if (!/^[A-Za-z0-9]{16}$/.test(password)) throw new Error('Expected a 16-character Gmail app password. No configuration saved.');
const values = {
  POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  JWT_SECRET: randomBytes(48).toString('hex'),
  SMTP_USER: sender, SMTP_PASS: password, TEACHER_EMAILS: [...new Set(teachers)].join(','),
};
// Single quotes prevent Compose interpolation. Inputs exclude quote/newline characters.
writeFileSync(envFile, Object.entries(values).map(([key, value]) => `${key}='${value}'`).join('\n') + '\n', { flag: 'wx', mode: 0o600 });
chmodSync(envFile, 0o600);
for (const file of ['server.mjs', 'Dockerfile', 'Dockerfile.db', 'compose.yml', 'init.sql']) copyFileSync(`${source}/deploy/accounts/${file}`, `${accountSource}/${file}`);
for (const [folder, marker] of [[`${root}/accounts/data`, 'accounts-v1'], [`${root}/careerfolio/data`, 'careerfolio-v1']]) {
  if (!existsSync(`${folder}/.foredu-storage`)) writeFileSync(`${folder}/.foredu-storage`, `${marker}\n`, { flag: 'wx', mode: 0o644 });
}
// Only the NEW empty application data directory changes ownership, never a whole volume.
chownSync(`${root}/careerfolio/data`, 1000, 1000);
chmodSync(`${root}/careerfolio/data`, 0o700);
chmodSync(`${root}/accounts/data`, 0o700);
console.log('Configuration saved to accounts/.env (not printed). No services have been started. Keep an encrypted backup of this file.');
