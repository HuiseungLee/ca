# 커리어폴리오

학생 활동 결과물을 누적하고 진로 연결 키워드, 적합도 근거, 다음 심화 활동과 교사용 관찰 단서를 생성하는 웹앱입니다.

## 문학·문법·진로 통합 계정

문학 사이트의 Supabase 회원 DB를 사용합니다. 회원가입·이메일 확인·교사 초대 코드 방식이 문학 사이트와 같고, 한 사이트에서 로그인하면 `lhsstart.synology.me`의 문학·문법·진로 하위 도메인에서 같은 계정과 역할을 사용합니다. 진로 화면의 학생·교사 보기는 로그인한 계정 역할에 따라 결정되며 사용자가 임의로 바꿀 수 없습니다.

기본 설정에서는 `ACCOUNT_SERVICE_URL`의 문학 서버에서 공개 인증 설정을 자동으로 받아오므로 별도 복사 없이 작동합니다. 연결 요청을 줄이고 싶다면 NAS의 이 프로젝트 `.env`에 문학 사이트 `.env`의 다음 공개 값을 그대로 복사할 수 있습니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `TEACHER_EMAILS`, `STUDENT_EMAILS` (사용 중인 경우)
- `ACCOUNT_SERVICE_URL=https://literature.lhsstart.synology.me`

`SUPABASE_SERVICE_ROLE_KEY`와 `TEACHER_INVITE_CODE`는 문학 사이트에만 보관합니다. 세 사이트 모두 HTTPS로 서비스해야 공통 로그인 쿠키가 안전하게 공유됩니다.

## Synology NAS 배포

이 프로젝트는 파일 업로드와 데이터베이스 기능이 있어 Web Station 정적 호스팅이 아닌 **Container Manager 프로젝트**로 실행합니다.

1. NAS의 공유 폴더(예: `/volume1/docker/careerfolio`)에 이 저장소를 복제합니다.
2. Container Manager → 프로젝트 → 생성 → 기존 `docker-compose.yml` 사용을 선택합니다.
3. 프로젝트를 빌드하고 실행합니다. 기본 NAS 포트는 `7310`입니다.
4. DSM 제어판 → 로그인 포털 → 고급 → 역방향 프록시에서 다음 규칙을 만듭니다.
   - 소스: `HTTPS`, 호스트 `ca.lhsstart.synology.me`, 포트 `443`
   - 대상: `HTTP`, 호스트 `127.0.0.1`, 포트 `7310`
5. DSM 제어판 → 보안 → 인증서에서 `*.lhsstart.synology.me`를 포함한 Let's Encrypt 인증서를 발급하고, 설정 메뉴에서 `ca.lhsstart.synology.me` 역방향 프록시에 연결합니다.

데이터베이스와 업로드 파일은 `careerfolio-data` Docker 볼륨에 보존됩니다. 학생·교사 접근 권한은 공통 계정의 역할로 분리됩니다.

### GitHub 푸시 후 자동 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy-synology.yml`이 NAS에 SSH로 접속해 `/volume1/docker/careerfolio/scripts/synology-auto-deploy.sh`를 실행합니다. 이 스크립트는 새 커밋만 fast-forward로 받고, 컨테이너를 재빌드한 뒤 `/api/health`가 정상일 때 성공으로 기록합니다.

GitHub 저장소의 Settings → Secrets and variables → Actions에 문학 사이트와 동일한 다음 Repository secrets를 등록합니다.

- `NAS_HOST`: NAS 외부 호스트 이름
- `NAS_PORT`: NAS SSH 포트
- `NAS_USER`: 배포 전용 SSH 사용자
- `NAS_SSH_KEY`: 배포 전용 SSH 비공개 키
- `NAS_KNOWN_HOSTS`: `ssh-keyscan -p <포트> <호스트>` 결과

배포 계정은 비밀번호 없이 아래 명령 하나만 실행하도록 sudo 권한을 제한합니다.

```text
/bin/sh /volume1/docker/careerfolio/scripts/synology-auto-deploy.sh
```

## Starter notes

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Windows, macOS, or Linux; Git is required only for publishing, and Bash is not required for initialization or the project commands

## Sites Lifecycle

The bundled Sites initializer copies this starter into the project and runs its locked dependency install before returning the checkout. Edit the source under `app/`, use `npm run dev` for the Codex local preview, and run the project validation before hosting. The remote Sites builder also runs `npm run build` against the pushed commit. Do not rerun the dependency install unless dependencies are absent or the lockfile changed.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against this checkout's bundled lockfile, explicitly targeting the project and disabling parent-workspace discovery. It includes dev and optional dependencies required for builds and previews even when production/omit settings would exclude them. It defaults Sharp to prebuilt binaries unless the caller explicitly configures Sharp or a source build. It uses `--prefer-offline --no-audit --no-fund`, reuses the configured npm cache, and leaves network concurrency, retries, timeouts, and lifecycle-script policy to npm's configuration. Retain the installer session until it finishes; do not overlap installers for the same checkout.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

`npm run dev` uses `vinext dev` for the live Vite preview with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state and rejects another start for the same checkout while that process is alive; reuse its printed URL. It recovers stale state after a stopped process. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep Codex previews on loopback. Like the Sites package, this relies on Vinext's advisory lock; exactly simultaneous starts can race.

The bundled Sites Vite plugin simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. This does not exercise real ChatGPT OAuth and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

Like the Sites package, `npm run build` runs `vinext build` directly; it does not require a host `timeout` command.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
