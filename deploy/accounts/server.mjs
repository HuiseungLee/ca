import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

// Password hashing, email verification and tokens belong to GoTrue, not this gateway.
export function createAccountServer(config, transport = fetch) {
  const authUrl = new URL(config.publicUrl);
  if (authUrl.protocol !== 'https:' || authUrl.pathname !== '/') throw new Error('PUBLIC_AUTH_URL must be an HTTPS origin');
  const origins = new Set(config.origins);
  const teachers = new Set(config.teachers.map(v => v.trim().toLowerCase()).filter(Boolean));
  if (!teachers.size) throw new Error('At least one teacher email is required');
  const buckets = new Map();
  function limited(key, maximum) {
    const now = Date.now();
    // Bounded storage; never retain email addresses in rate-limit keys.
    if (buckets.size > 10000) return true;
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.until) bucket = { count: 0, until: now + 60000 };
    bucket.count++; buckets.set(key, bucket);
    return bucket.count > maximum;
  }
  const cleanup = setInterval(() => { for (const [key, value] of buckets) if (Date.now() > value.until) buckets.delete(key); }, 60000);
  cleanup.unref();
  const upstream = (path, init = {}) => transport(`${config.internalUrl}${path}`, {
    ...init, redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const json = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const origin = req.headers.origin;
      if (origin && !origins.has(origin)) return json(403, { error: '허용되지 않은 사이트입니다.' });
      if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') {
        if (!origin) return json(403, { error: 'Origin required' });
        res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,apikey', 'Access-Control-Max-Age': '600' });
        return res.end();
      }
      const url = new URL(req.url, config.publicUrl);
      if (req.method === 'GET' && url.pathname === '/mail/confirmation') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<html lang="ko"><body><h1>Foredu 공통 계정 인증</h1><p>인증 코드: <strong>{{ .Token }}</strong></p><p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p><p>인증 후 가입한 사이트에서 로그인하세요. 요청하지 않았다면 무시하세요.</p></body></html>');
      }
      if (req.method === 'GET' && url.pathname === '/api/health') {
        const response = await upstream('/health');
        return json(response.ok ? 200 : 503, { status: response.ok ? 'ok' : 'unavailable' });
      }
      if (req.method === 'GET' && url.pathname === '/api/auth/config') return json(200, { url: authUrl.origin, key: 'foredu-public', configured: true });
      // Do not trust client-supplied X-Forwarded-For. The gateway and GoTrue also have global/email limits.
      if (limited(req.socket.remoteAddress || 'unknown', 300)) return json(429, { error: '요청이 많습니다. 잠시 후 다시 시도해 주세요.' });
      const authorization = req.headers.authorization;
      if (req.method === 'GET' && url.pathname === '/api/session') {
        if (!authorization?.startsWith('Bearer ')) return json(200, { user: null });
        const response = await upstream('/user', { headers: { Authorization: authorization } });
        if (!response.ok) return json(200, { user: null });
        const user = await response.json();
        if (!user.id || !user.email || !user.email_confirmed_at) return json(200, { user: null });
        const metadata = user.user_metadata || {};
        return json(200, { user: {
          id: user.id, email: user.email,
          // User-editable metadata can NEVER grant teacher privileges.
          role: teachers.has(user.email.toLowerCase()) ? 'teacher' : 'student',
          realName: typeof metadata.real_name === 'string' ? metadata.real_name : null,
          nickname: typeof metadata.nickname === 'string' ? metadata.nickname : null,
          displayName: metadata.nickname || metadata.real_name || user.email,
        } });
      }
      let path;
      if (req.method === 'POST' && url.pathname === '/api/signup') path = '/signup';
      else if (url.pathname === '/auth/v1/token' && req.method === 'POST' && ['password', 'refresh_token'].includes(url.searchParams.get('grant_type'))) path = `/token?grant_type=${url.searchParams.get('grant_type')}`;
      else if (url.pathname === '/auth/v1/verify' && ['GET', 'POST'].includes(req.method)) {
        if (req.method === 'GET') {
          const query = new URLSearchParams();
          for (const key of ['token', 'token_hash', 'type']) if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key));
          path = `/verify?${query}`;
        } else path = '/verify';
      } else if (['/auth/v1/resend', '/auth/v1/logout'].includes(url.pathname) && req.method === 'POST') path = url.pathname.slice('/auth/v1'.length);
      else if (url.pathname === '/auth/v1/user' && ['GET', 'PUT'].includes(req.method)) path = '/user';
      else return json(404, { error: 'Not found' });
      let body;
      if (['POST', 'PUT'].includes(req.method)) {
        if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) return json(415, { error: 'JSON required' });
        let bytes = 0; const chunks = [];
        for await (const chunk of req) { bytes += chunk.length; if (bytes > 16384) return json(413, { error: 'Request too large' }); chunks.push(chunk); }
        try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return json(400, { error: 'Invalid JSON' }); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { error: 'Invalid request' });
        if (path === '/signup') {
          if (limited('signup-global', 20)) return json(429, { error: '가입 요청이 많습니다. 잠시 후 다시 시도해 주세요.' });
          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
          const name = typeof body.realName === 'string' ? body.realName.trim() : '';
          const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 256 || !name || name.length > 80 || !nickname || [...nickname].length > 7) return json(400, { error: '이메일·8자 이상 비밀번호·이름·7글자 이하 닉네임을 확인해 주세요.' });
          body = { email, password: body.password, data: { real_name: name, nickname } };
        } else if (path === '/user' && req.method === 'PUT') {
          // Email changes, arbitrary role/profile writes and admin operations are not exposed.
          if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 256) return json(400, { error: '비밀번호를 확인해 주세요.' });
          body = { password: body.password, ...(typeof body.current_password === 'string' ? { current_password: body.current_password } : {}) };
        } else {
          // Do not allow caller-controlled redirects or metadata to reach GoTrue.
          const keys = path.startsWith('/token?grant_type=password') ? ['email', 'password']
            : path.startsWith('/token?') ? ['refresh_token']
            : path === '/verify' ? ['email', 'token', 'type']
            : path === '/resend' ? ['email', 'type'] : [];
          body = Object.fromEntries(keys.filter(key => typeof body[key] === 'string').map(key => [key, body[key]]));
          if (['/verify', '/resend'].includes(path) && !['email', 'signup'].includes(body.type)) return json(400, { error: '인증 유형을 확인해 주세요.' });
          if (body.email) {
            const digest = createHash('sha256').update(body.email.trim().toLowerCase()).digest('hex');
            if (limited(`attempt:${path}:${digest}`, 10)) return json(429, { error: '인증 시도가 많습니다. 잠시 후 다시 시도해 주세요.' });
          }
        }
      }
      const response = await upstream(path, { method: req.method, headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const location = response.headers.get('location');
      if (location) {
        const redirect = new URL(location);
        if (!origins.has(redirect.origin) || redirect.protocol !== 'https:') return json(502, { error: '인증 이동 주소가 올바르지 않습니다.' });
        res.writeHead(response.status, { Location: redirect.href }); return res.end();
      }
      res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(await response.text());
    } catch {
      // Never log request bodies, email tokens, passwords, or upstream error details.
      if (!res.headersSent) json(503, { error: '계정 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
      else res.end();
    }
  });
  server.on('close', () => clearInterval(cleanup));
  server.requestTimeout = 20000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createAccountServer({
    publicUrl: process.env.PUBLIC_AUTH_URL,
    internalUrl: process.env.AUTH_INTERNAL_URL || 'http://auth:9999',
    origins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),
    teachers: (process.env.TEACHER_EMAILS || '').split(','),
  });
  server.listen(3000, '0.0.0.0');
}
