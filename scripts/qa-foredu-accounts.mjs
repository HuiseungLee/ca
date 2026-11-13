import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createAccountServer } from '../deploy/accounts/server.mjs';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
let calls = []; let user = null; let reply = { ok: true }; let redirect = '';
const server = createAccountServer({ publicUrl: 'https://auth.foredu.synology.me', internalUrl: 'http://auth:9999', origins: ['https://ca.foredu.synology.me'], teachers: ['teacher@example.test'] }, async (url, init) => {
  calls.push({ url, init });
  if (url.endsWith('/user') && init.method !== 'PUT') return Response.json(user);
  if (redirect) return new Response(null, { status: 302, headers: { Location: redirect } });
  return Response.json(reply);
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let count = 0;
const check = (a, b) => { assert.deepEqual(a, b); count++; };
const request = (path, body, extra = {}) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...extra.headers }, ...(body ? { body: JSON.stringify(body) } : {}), ...extra, redirect: 'manual' });
try {
  check((await request('/api/auth/config')).status, 200);
  check((await request('/api/health')).status, 200);
  check((await request('/api/auth/config', null, { headers: { Origin: 'https://evil.test' } })).status, 403);
  check((await request('/api/auth/config', null, { headers: { Origin: 'https://ca.foredu.synology.me.evil.test' } })).status, 403);
  const cors = await request('/api/auth/config', null, { headers: { Origin: 'https://ca.foredu.synology.me' } });
  check(cors.headers.get('access-control-allow-origin'), 'https://ca.foredu.synology.me');
  check((await request('/auth/v1/admin/users')).status, 404);
  check((await request('/auth/v1/signup', {})).status, 404);
  check((await request('/auth/v1/token?grant_type=evil', {})).status, 404);
  check((await request('/api/session')).status, 200);
  check((await (await request('/api/session')).json()).user, null);
  const bearer = { headers: { Authorization: 'Bearer test' } };
  user = { id: 'one', email: 'teacher@example.test', user_metadata: { role: 'teacher' } };
  check((await (await request('/api/session', null, bearer)).json()).user, null);
  user.email_confirmed_at = '2026-01-01';
  check((await (await request('/api/session', null, bearer)).json()).user.role, 'teacher');
  user.email = 'student@example.test';
  check((await (await request('/api/session', null, bearer)).json()).user.role, 'student');
  const signup = { email: ' STUDENT@example.test ', password: 'password-12345', realName: '학생', nickname: '학생', role: 'teacher', app_metadata: { role: 'teacher' } };
  check((await request('/api/signup', { ...signup, password: 'short' })).status, 400);
  check((await request('/api/signup', signup)).status, 200);
  check(JSON.parse(calls.at(-1).init.body), { email: 'student@example.test', password: 'password-12345', data: { real_name: '학생', nickname: '학생' } });
  check(calls.at(-1).url, 'http://auth:9999/signup');
  check((await request('/auth/v1/token?grant_type=password', { email: signup.email, password: signup.password, redirect_to: 'https://evil.test' })).status, 200);
  check(JSON.parse(calls.at(-1).init.body), { email: signup.email, password: signup.password });
  check((await request('/auth/v1/verify', { email: signup.email, token: '123456', type: 'recovery' })).status, 400);
  check((await request('/auth/v1/verify', { email: signup.email, token: '123456', type: 'email' })).status, 200);
  const update = await request('/auth/v1/user', { password: 'new-password', app_metadata: { role: 'teacher' }, email: 'teacher@example.test' }, { method: 'PUT' });
  check(update.status, 200); check(JSON.parse(calls.at(-1).init.body), { password: 'new-password' });
  redirect = 'https://evil.test/#access_token=secret';
  check((await request('/auth/v1/verify?token=test&type=signup')).status, 502);
  redirect = 'https://ca.foredu.synology.me/#access_token=test';
  check((await request('/auth/v1/verify?token=test&type=signup&redirect_to=https://evil.test')).status, 302);
  check(calls.at(-1).url, 'http://auth:9999/verify?token=test&type=signup');
  check(calls.at(-1).init.redirect, 'manual');
  redirect = '';
  check((await request('/api/signup', { ...signup, realName: 'x'.repeat(17000) })).status, 413);
  for (let attempt = 0; attempt < 10; attempt++) check((await request('/auth/v1/token?grant_type=password', { email: 'rate@example.test', password: 'guess' })).status, 200);
  check((await request('/auth/v1/token?grant_type=password', { email: 'rate@example.test', password: 'guess' })).status, 429);
  // Test the actual application adapter's fail-closed branch without a real account service.
  const source = readFileSync(new URL('../lib/supabase-auth.ts', import.meta.url), 'utf8')
    .replace('import { env } from "cloudflare:workers";', 'const env = { ACCOUNT_SERVICE_REQUIRED: "true", ACCOUNT_SERVICE_URL: "http://accounts" };')
    .replace('import { sharedAuthSessionFromCookieHeader } from "./shared-auth";', 'const sharedAuthSessionFromCookieHeader = () => null;');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const adapter = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const realFetch = globalThis.fetch; const requests = [];
  try {
    globalThis.fetch = async url => { requests.push(url); return Response.json({ error: 'unavailable' }, { status: 503 }); };
    check(await adapter.getSharedUserFromRequest(new Request('https://ca.foredu.synology.me/api/profile', { headers: { Authorization: 'Bearer stale-token' } })), null);
    check(requests, ['http://accounts/api/session']);
    check(await adapter.authApiConfig(), { url: 'http://accounts', key: 'foredu-public' });
  } finally { globalThis.fetch = realFetch; }
  console.log(`Foredu accounts: ${count} checks passed (mock GoTrue; SMTP/Docker not exercised).`);
} finally { server.close(); server.closeAllConnections(); }
