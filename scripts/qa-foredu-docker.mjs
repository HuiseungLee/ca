// Real Docker smoke/repair test on a disposable GitHub-hosted Linux runner ONLY.
// No NAS SSH, production credentials, real SMTP or student data are used.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';

if (process.platform !== 'linux' || process.getuid?.() !== 0 || process.env.GITHUB_ACTIONS !== 'true' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted' || process.env.CI !== 'true') {
  throw new Error('Refusing to run outside a disposable GitHub-hosted Linux CI runner.');
}
const data = '/volume2/webapps/accounts/data';
if (existsSync('/volume2/webapps')) throw new Error('Refusing to touch an existing webapps directory.');
mkdirSync(data, { recursive: true, mode: 0o700 });
writeFileSync(`${data}/.foredu-storage`, 'accounts-v1\n', { mode: 0o644 });
const temp = mkdtempSync(join(tmpdir(), 'foredu-container-qa-'));
const envFile = join(temp, 'test.env');
writeFileSync(envFile, [
  `POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}`,
  `JWT_SECRET=${randomBytes(48).toString('hex')}`,
  'SMTP_USER=fixture@example.invalid', 'SMTP_PASS=fixture-not-a-real-password',
  'TEACHER_EMAILS=teacher@example.invalid',
].join('\n'), { mode: 0o600 });
const prefix = ['compose', '--env-file', envFile, '-f', resolve('deploy/accounts/compose.yml')];
function docker(args, allowFailure = false) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 600000, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) throw new Error(`Docker command failed: ${result.stderr || result.error || result.stdout}`);
  return result;
}
const compose = args => docker([...prefix, ...args]);
const sql = command => compose(['exec', '-T', '--user', 'postgres', 'db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'foredu_auth', '-d', 'accounts', '-Atc', command]).stdout.trim();
async function waitFor(check, label) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await check()) return;
    await new Promise(done => setTimeout(done, 1000));
  }
  throw new Error(`${label} did not become ready`);
}
try {
  docker(['network', 'create', 'foredu-shared']);
  compose(['config', '--quiet']);
  console.log('Building DB and initializing an empty test database...');
  compose(['up', '-d', '--build', 'db']);
  await waitFor(() => docker([...prefix, 'exec', '-T', '--user', 'postgres', 'db', 'pg_isready', '-h', '127.0.0.1', '-U', 'foredu_auth', '-d', 'accounts'], true).status === 0, 'PostgreSQL');
  // Simulate the already-initialized NAS database lacking the compatibility role.
  // This role and probe exist only in the fresh disposable database created above.
  sql('CREATE TABLE public.foredu_qa_probe (id integer PRIMARY KEY); INSERT INTO public.foredu_qa_probe VALUES (42); DROP ROLE postgres;');
  const repair = () => compose(['exec', '-T', '--user', 'postgres', 'db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'foredu_auth', '-d', 'accounts', '-f', '/docker-entrypoint-initdb.d/10-auth-schema.sql']);
  repair();
  assert.equal(sql("SELECT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname='postgres'"), 'f');
  repair();
  assert.equal(sql('SELECT id FROM public.foredu_qa_probe'), '42');
  // Re-running the bootstrap must preserve the attributes of an existing role.
  sql("COMMENT ON ROLE postgres IS 'keep-this-test-marker'"); repair();
  assert.equal(sql("SELECT shobj_description(oid, 'pg_authid') FROM pg_roles WHERE rolname='postgres'"), 'keep-this-test-marker');
  console.log('Repair is repeatable and existing test data is preserved. Starting GoTrue and gateway...');
  compose(['up', '-d', '--build']);
  await waitFor(async () => {
    try { return (await fetch('http://127.0.0.1:7320/api/health', { signal: AbortSignal.timeout(5000) })).ok; } catch { return false; }
  }, 'GoTrue and gateway');
  // auth.schema_migrations is a legacy table and may remain empty in this GoTrue
  // version. Verify actual migration effects rather than its legacy row count.
  assert.equal(sql("SELECT to_regclass('auth.users') IS NOT NULL AND to_regclass('auth.sessions') IS NOT NULL"), 't');
  assert.equal(sql("SELECT relrowsecurity FROM pg_class WHERE oid='auth.users'::regclass"), 't');
  assert.equal(sql("SELECT has_table_privilege('postgres', 'auth.users', 'SELECT')"), 't');
  assert.equal(sql('SELECT id FROM public.foredu_qa_probe'), '42');
  compose(['exec', '-T', 'accounts', 'node', '-e', "if(process.getuid()===0)process.exit(1);require('fs').accessSync('/app/server.mjs',require('fs').constants.R_OK)"]);
  const session = await fetch('http://127.0.0.1:7320/api/session');
  assert.deepEqual(await session.json(), { user: null });
  console.log('PASS: real GoTrue migrations, missing-role repair, preserved data, non-root gateway and HTTP health. Gmail delivery is not tested.');
} catch (error) {
  console.error(error.message);
  const state = docker([...prefix, 'ps'], true); console.error(state.stdout);
  const logs = docker([...prefix, 'logs', '--tail', '35', 'auth', 'accounts'], true);
  console.error(logs.stdout.replace(/postgres:\/\/[^\s"']+/g, '[database URL redacted]'));
  process.exitCode = 1;
} finally {
  // Only this CI-created Compose project's containers/network; never host data.
  docker([...prefix, 'down'], true);
}
