// Explicit local-only account fixture, never imported by the application.
// Start separately for scripts/qa-inquiry.mjs. Bind the QA app to port 5190.
import http from "node:http";

const accounts = [
  ["student", "학생", "student"],
  ["teacher", "교사", "teacher"],
  ["other", "같은 모둠 학생", "student"],
  ["peer", "다른 모둠 학생", "student"],
  ["outsider", "미참가 학생", "student"],
].map(([name, displayName, role]) => ({
  id: `qa-${name}`,
  email: `${name}@example.test`,
  displayName: `테스트 ${displayName}`,
  role,
}));

http
  .createServer(async (request, response) => {
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5190");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "content-type,apikey,authorization",
    );
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (request.method === "OPTIONS") {
      response.end();
      return;
    }
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    const user =
      accounts.find((account) => token === `local-${account.id}`) ?? null;
    if (request.url === "/api/health") {
      response.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (request.url === "/api/session") {
      response.end(JSON.stringify({ user }));
      return;
    }
    if (request.url?.startsWith("/auth/v1/token")) {
      let raw = "";
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 4000) break;
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        response.statusCode = 400;
        response.end("{}");
        return;
      }
      const match = accounts.find((account) => account.email === body.email);
      if (match && body.password === "TestPass123!") {
        response.end(
          JSON.stringify({
            access_token: `local-${match.id}`,
            refresh_token: "local-refresh",
            expires_in: 3600,
            user: match,
          }),
        );
        return;
      }
    }
    response.statusCode = 401;
    response.end(JSON.stringify({ error: "Local QA fixture only" }));
  })
  .listen(5191, "127.0.0.1", () =>
    console.log("Synthetic QA account service: http://127.0.0.1:5191"),
  );
