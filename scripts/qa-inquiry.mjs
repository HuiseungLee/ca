// Integration checks for the local preview and scripts/qa-inquiry-auth.mjs fixture.
// Run only after the preview has been built: node scripts/qa-inquiry.mjs
// Every run creates its own project and archives it when all checks pass.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = new URL("http://127.0.0.1:5190");
assert.equal(
  base.origin,
  "http://127.0.0.1:5190",
  "QA must only contact the local preview",
);
const runId = randomUUID().slice(0, 8);
const ids = {
  student: "qa-student",
  other: "qa-other",
  peer: "qa-peer",
  outsider: "qa-outsider",
  teacher: "qa-teacher",
};
let checks = 0;
let projectId;
let teamA;
let teamB;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks++;
}
function ok(value, message) {
  assert.ok(value, message);
  checks++;
}
function destination(path) {
  assert.ok(
    path.startsWith("/api/") && !path.startsWith("//"),
    "Use an explicit local API path",
  );
  const url = new URL(path, base);
  assert.equal(
    url.origin,
    "http://127.0.0.1:5190",
    "Refusing a non-local QA destination",
  );
  return url;
}
async function request(
  path,
  who,
  { method = "GET", body, expected = 200, binary = false } = {},
) {
  const multipart = body instanceof FormData;
  const response = await fetch(destination(path), {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Connection: "close",
      ...(who ? { Authorization: `Bearer local-${ids[who]}` } : {}),
      ...(body && !multipart ? { "content-type": "application/json" } : {}),
    },
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
  });
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (binary && response.ok) {
    assert.ok(
      allowed.includes(response.status),
      `${method} ${path}: unexpected ${response.status}`,
    );
    checks++;
    return {
      bytes: Buffer.from(await response.arrayBuffer()),
      headers: response.headers,
    };
  }
  const raw = await response.text();
  assert.ok(
    allowed.includes(response.status),
    `${who ?? "anonymous"} ${method} ${path}: expected ${allowed}, got ${response.status}: ${raw.slice(0, 1200)}`,
  );
  checks++;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    assert.fail(`${method} ${path} returned non-JSON: ${raw.slice(0, 300)}`);
  }
  if (response.ok && path.startsWith("/api/inquiry")) {
    ok(
      response.headers.get("cache-control")?.includes("no-store"),
      "Private inquiry responses must not be cached",
    );
  }
  return data;
}
const action = (who, body, expected = [200, 201]) =>
  request("/api/inquiry", who, { method: "POST", body, expected });
const read = async (who) => {
  const result = await request(
    `/api/inquiry?projectId=${encodeURIComponent(projectId)}`,
    who,
  );
  ok(
    Array.isArray(result.board?.entries) && Array.isArray(result.board?.teams),
    "GET project must return an InquiryBoard",
  );
  return result.board;
};
function entry(board, stageId, teamId = teamA.id, ownerId) {
  return board.entries.find(
    (item) =>
      item.stageId === stageId &&
      (stageId === "reflection"
        ? item.ownerId === ownerId
        : item.teamId === teamId),
  );
}
async function save(
  who,
  stageId,
  answers,
  status = "draft",
  version,
  expected = [200, 201],
  teamId = teamA.id,
) {
  if (version === undefined) {
    const board = await read(who);
    version = entry(board, stageId, teamId, ids[who])?.version ?? 0;
  }
  return action(
    who,
    {
      action: "save",
      projectId,
      ...(stageId === "reflection" ? {} : { teamId }),
      stageId,
      answers,
      status,
      version,
    },
    expected,
  );
}
const filePath = (entryId) =>
  `/api/inquiry/files?entryId=${encodeURIComponent(entryId)}`;
async function upload(
  who,
  item,
  bytes,
  expected = [200, 201],
  version = item.version,
) {
  const body = new FormData();
  body.set("entryId", item.id);
  body.set("version", String(version));
  body.set(
    "file",
    new Blob([bytes], { type: "application/pdf" }),
    `qa-${runId}.pdf`,
  );
  return request("/api/inquiry/files", who, { method: "POST", body, expected });
}
async function setArchived(archived) {
  const board = await read("teacher");
  return action("teacher", {
    action: "update",
    projectId,
    title: board.project.title,
    description: board.project.description,
    stages: board.project.stages,
    status: board.project.status,
    archived,
  });
}

const answers = {
  sources: {
    claim: `QA ${runId}: a sample claim for verification practice`,
    links: "https://example.test/source",
    context:
      "Sample author, 2026-09-29; explanation and persuasion are separated.",
  },
  evidence: {
    evidence:
      "https://example.test/study — sample primary evidence, conditions, and measurements.",
    perspectives:
      "Physics: measured effects. Biotechnology: experimental conditions. Chemistry: material properties.",
    limits:
      "This is fixture content, not a scientific truth judgment. Further independent sources are required.",
  },
  verdict: {
    verdict: "판단 보류",
    reason: "The evidence is insufficient to support the entire sample claim.",
    uncertainty:
      "Independent replication and clearer experimental conditions could change this judgment.",
  },
  discussion: {
    question: "What evidence would justify permission for this technology?",
    response:
      "A peer requested clearer safety conditions; the group identified evidence still needed.",
    change:
      "We separated technical feasibility from safety, ethics, and social permission.",
  },
  output: {
    report:
      "Fact-check report: sample claim, cited evidence, withheld judgment, and limitations.",
    content:
      "https://example.test/infographic — the digital artifact includes source labels and uncertainty.",
    proposal:
      "Citizen proposal: publish trial conditions and invite affected participants before broader use.",
  },
  reflection: {
    contribution: "I compared sample sources and documented one limitation.",
    change:
      "I now distinguish evidence from conclusions and social permission.",
    career:
      "I can apply source checking and experimental reasoning to my interests.",
    next: "Compare two independent sources for the next inquiry.",
  },
};
const fileBytes = Buffer.from(`%PDF-1.4\n% Local QA fixture ${runId}\n%%EOF\n`);

try {
  // Sessions seed local profiles; all identifiers and tokens are fixture-only.
  for (const who of Object.keys(ids)) {
    const session = await request("/api/auth/session", who);
    equal(session.profile.id, ids[who], `${who} fixture identity`);
  }
  const legacyIds = (
    await request("/api/activities", "student")
  ).activities.map((item) => item.id);
  await request("/api/inquiry", null, { expected: 401 });
  await action(
    "student",
    { action: "create", title: "Unauthorized creation", description: "QA" },
    403,
  );

  const created = await action("teacher", {
    action: "create",
    title: `QA guided inquiry ${runId}`,
    description:
      "Local integration fixture; no student data or external network calls.",
  });
  ok(created.board?.project?.id, "Create returns a board with a project ID");
  projectId = created.board.project.id;
  equal(
    created.board.project.stages.map((stage) => stage.id),
    Object.keys(answers),
    "The six guided stages are configured in order",
  );
  ok(
    (await request("/api/inquiry", "student")).projects.some(
      (project) => project.id === projectId,
    ),
    "Open projects are discoverable for enrollment",
  );
  await request(`/api/inquiry?projectId=${projectId}`, "student", {
    expected: 403,
  });
  for (const who of ["student", "other", "peer"]) {
    const applied = await action(who, { action: "apply", projectId });
    ok(
      applied.project?.applicantIds.includes(ids[who]),
      "Apply returns the participant's own application",
    );
    equal(
      applied.project.applicantIds,
      [ids[who]],
      "Application response does not expose other applicants",
    );
  }
  await action("student", { action: "apply", projectId });
  let board = await read("teacher");
  equal(
    [...board.project.applicantIds].sort(),
    [ids.student, ids.other, ids.peer].sort(),
    "Repeated enrollment does not duplicate applicants",
  );
  await action(
    "student",
    { action: "select", projectId, selectedIds: [ids.student] },
    403,
  );
  await action("teacher", {
    action: "select",
    projectId,
    selectedIds: [ids.student, ids.other, ids.peer],
  });
  await request(`/api/inquiry?projectId=${projectId}`, "outsider", {
    expected: 403,
  });
  await action(
    "student",
    {
      action: "team",
      projectId,
      name: "Unauthorized team",
      memberIds: [ids.student],
      representativeId: ids.student,
    },
    403,
  );
  let mutation = await action("teacher", {
    action: "team",
    projectId,
    name: `QA A ${runId}`,
    memberIds: [ids.student, ids.other],
    representativeId: ids.student,
  });
  teamA = mutation.board.teams.find((team) => team.name === `QA A ${runId}`);
  ok(teamA, "Teacher creates the representative-led team");
  mutation = await action("teacher", {
    action: "team",
    projectId,
    name: `QA B ${runId}`,
    memberIds: [ids.peer],
    representativeId: ids.peer,
  });
  teamB = mutation.board.teams.find((team) => team.name === `QA B ${runId}`);
  ok(teamB, "Teacher creates the comparison team");
  equal(
    (await read("student")).project.selectedIds,
    [ids.student],
    "Student project metadata redacts other selected IDs",
  );
  console.log("Inquiry QA: enrollment and teacher-controlled teams passed");

  await save("other", "sources", answers.sources, "draft", 0, 403);
  await save("peer", "sources", answers.sources, "draft", 0, 403);
  await save(
    "student",
    "sources",
    { claim: "Incomplete" },
    "submitted",
    0,
    [400, 409],
  );
  await save(
    "student",
    "evidence",
    answers.evidence,
    "submitted",
    0,
    [400, 409],
  );
  mutation = await save(
    "student",
    "sources",
    { claim: `PRIVATE DRAFT ${runId}` },
    "draft",
    0,
  );
  let source = entry(mutation.board, "sources");
  ok(
    source && source.status === "draft",
    "An incomplete source draft can be resumed",
  );
  equal(
    entry(await read("other"), "sources")?.answers.claim,
    `PRIVATE DRAFT ${runId}`,
    "Team members can read their representative's draft",
  );
  ok(
    entry(await read("teacher"), "sources"),
    "Teacher can inspect a team draft",
  );
  equal(
    entry(await read("peer"), "sources"),
    undefined,
    "Another selected team cannot read drafts",
  );

  // Two editors with one version must not silently overwrite each other.
  const raceVersion = source.version;
  const race = await Promise.allSettled([
    save(
      "student",
      "sources",
      { claim: `Concurrent A ${runId}` },
      "draft",
      raceVersion,
      [200, 201, 409],
    ),
    save(
      "student",
      "sources",
      { claim: `Concurrent B ${runId}` },
      "draft",
      raceVersion,
      [200, 201, 409],
    ),
  ]);
  for (const result of race)
    if (result.status === "rejected") throw result.reason;
  const raceResults = race.map((result) => result.value);
  equal(
    raceResults.filter((result) => result.board).length,
    1,
    "Exactly one concurrent edit succeeds",
  );
  equal(
    raceResults.filter((result) => result.error).length,
    1,
    "The competing edit reports a version conflict",
  );
  source = entry(await read("student"), "sources");
  equal(
    source.version,
    raceVersion + 1,
    "Concurrent edits increment the version exactly once",
  );
  const savedClaim = source.answers.claim;
  await save(
    "student",
    "sources",
    { claim: "Stale overwrite" },
    "draft",
    raceVersion,
    409,
  );
  equal(
    entry(await read("student"), "sources").answers.claim,
    savedClaim,
    "A rejected stale edit preserves saved content",
  );

  await upload("other", source, fileBytes, 403);
  await upload("peer", source, fileBytes, 403);
  await upload("outsider", source, fileBytes, 403);
  await upload("student", source, fileBytes);
  source = entry(await read("student"), "sources");
  equal(
    source.fileName,
    `qa-${runId}.pdf`,
    "Attachment metadata is stored on the draft",
  );
  for (const who of ["student", "other", "teacher"]) {
    const file = await request(filePath(source.id), who, { binary: true });
    equal(
      file.bytes,
      fileBytes,
      "Authorized attachment download preserves bytes",
    );
    ok(
      file.headers.get("cache-control")?.includes("no-store"),
      "Private attachments must not be cached",
    );
  }
  await request(filePath(source.id), "peer", { expected: [403, 404] });
  await request(filePath(source.id), "outsider", { expected: [403, 404] });
  await request(filePath(source.id), null, { expected: 401 });
  await upload(
    "student",
    source,
    Buffer.from("%PDF-1.4\nSTALE\n%%EOF"),
    409,
    source.version - 1,
  );
  equal(
    (await request(filePath(source.id), "student", { binary: true })).bytes,
    fileBytes,
    "Rejected stale upload preserves the original file",
  );
  console.log(
    "Inquiry QA: representative writes, draft privacy, optimistic conflicts, and protected files passed",
  );

  mutation = await save("student", "sources", answers.sources, "submitted");
  source = entry(mutation.board, "sources");
  board = await read("peer");
  ok(
    entry(board, "sources")?.status === "submitted",
    "Selected peers can read submitted group work",
  );
  ok(
    !Object.prototype.hasOwnProperty.call(entry(board, "sources"), "fileKey"),
    "Storage keys are not exposed through the board",
  );
  equal(
    (await request(filePath(source.id), "peer", { binary: true })).bytes,
    fileBytes,
    "Selected peers can download shared group evidence",
  );
  await action(
    "outsider",
    {
      action: "comment",
      projectId,
      teamId: teamA.id,
      kind: "question",
      content: "Unauthorized comment",
    },
    403,
  );
  await action("peer", {
    action: "comment",
    projectId,
    teamId: teamA.id,
    kind: "question",
    content: `What evidence supports the sample claim? ${runId}`,
  });
  await action("other", {
    action: "comment",
    projectId,
    teamId: teamA.id,
    kind: "reply",
    content: `Our team will add the source limitations. ${runId}`,
  });
  await action("student", {
    action: "comment",
    projectId,
    teamId: teamA.id,
    kind: "counter",
    content: `An alternative explanation needs testing. ${runId}`,
  });
  await action("peer", {
    action: "comment",
    projectId,
    teamId: teamA.id,
    kind: "evidence",
    content: `https://example.test/second-source — a sample comparison. ${runId}`,
  });
  board = await read("student");
  equal(
    [...new Set(board.comments.map((comment) => comment.kind))].sort(),
    ["counter", "evidence", "question", "reply"],
    "Participants can exchange all four discussion types",
  );
  await action(
    "student",
    {
      action: "review",
      projectId,
      entryId: source.id,
      version: source.version,
      status: "approved",
      text: "Unauthorized self-approval",
    },
    403,
  );
  mutation = await action("teacher", {
    action: "review",
    projectId,
    entryId: source.id,
    version: source.version,
    status: "revision",
    text: `Clarify source purpose ${runId}`,
  });
  source = entry(mutation.board, "sources");
  equal(
    source.feedback.at(-1)?.text,
    `Clarify source purpose ${runId}`,
    "Teacher revision feedback is visible",
  );
  const advanced = await save(
    "student",
    "evidence",
    answers.evidence,
    "submitted",
    0,
  );
  equal(
    entry(advanced.board, "evidence").status,
    "submitted",
    "A revision request does not block continuing a previously submitted stage",
  );
  mutation = await save(
    "student",
    "sources",
    {
      ...answers.sources,
      context: `${answers.sources.context} Teacher feedback has been addressed.`,
    },
    "submitted",
  );
  source = entry(mutation.board, "sources");
  equal(
    source.feedback.at(-1)?.text,
    `Clarify source purpose ${runId}`,
    "Student revision preserves teacher feedback history",
  );
  mutation = await action("teacher", {
    action: "review",
    projectId,
    entryId: source.id,
    version: source.version,
    status: "approved",
    text: `Sources checked ${runId}`,
  });
  source = entry(mutation.board, "sources");
  equal(
    source.feedback.length,
    2,
    "Approval appends to earlier revision feedback",
  );
  equal(source.status, "approved", "Teacher can approve a submitted entry");

  for (const stageId of ["evidence", "verdict", "discussion", "output"]) {
    if (stageId === "verdict")
      await save(
        "student",
        stageId,
        { ...answers.verdict, verdict: "Unsupported choice" },
        "submitted",
        0,
        [400, 409],
      );
    await save("student", stageId, {}, "submitted", undefined, [400, 409]);
    mutation = await save("student", stageId, answers[stageId], "submitted");
    equal(
      entry(mutation.board, stageId)?.status,
      "submitted",
      `${stageId} submits after its predecessor with required answers`,
    );
  }
  await save(
    "peer",
    "reflection",
    answers.reflection,
    "submitted",
    0,
    [400, 409],
    teamB.id,
  );
  console.log(
    "Inquiry QA: shared discussion, sequential submissions, and retained feedback passed",
  );

  await save("student", "reflection", {}, "submitted", 0, [400, 409]);
  mutation = await save(
    "student",
    "reflection",
    answers.reflection,
    "submitted",
    0,
  );
  let reflection = entry(mutation.board, "reflection", teamA.id, ids.student);
  ok(
    reflection,
    "Each participant can submit their own reflection after the group output",
  );
  await save(
    "other",
    "reflection",
    {
      ...answers.reflection,
      contribution: `Private member reflection ${runId}`,
    },
    "draft",
    0,
  );
  equal(
    entry(await read("other"), "reflection", teamA.id, ids.student),
    undefined,
    "A teammate cannot read another student's reflection",
  );
  equal(
    entry(await read("student"), "reflection", teamA.id, ids.other),
    undefined,
    "The representative cannot read a member's reflection",
  );
  equal(
    (await read("peer")).entries.filter((item) => item.stageId === "reflection")
      .length,
    0,
    "Another team cannot read private reflections",
  );
  equal(
    (await read("teacher")).entries.filter(
      (item) => item.stageId === "reflection",
    ).length,
    2,
    "Teacher can inspect submitted and draft personal reflections",
  );
  await upload("student", reflection, fileBytes);
  reflection = entry(
    await read("student"),
    "reflection",
    teamA.id,
    ids.student,
  );
  for (const who of ["other", "peer", "outsider"])
    await request(filePath(reflection.id), who, { expected: [403, 404] });
  await upload("other", reflection, fileBytes, 403);
  equal(
    (await request(filePath(reflection.id), "teacher", { binary: true })).bytes,
    fileBytes,
    "Teacher may access a private reflection attachment",
  );
  console.log(
    "Inquiry QA: individual reflection and attachment privacy passed",
  );

  await setArchived(true);
  board = await read("student");
  equal(board.project.archived, true, "Archived projects remain readable");
  source = entry(board, "sources");
  await save(
    "student",
    "sources",
    answers.sources,
    "draft",
    source.version,
    409,
  );
  await action(
    "other",
    {
      action: "comment",
      projectId,
      teamId: teamA.id,
      kind: "reply",
      content: "Archived write",
    },
    409,
  );
  await upload("student", source, fileBytes, 409);
  await action(
    "teacher",
    {
      action: "review",
      projectId,
      entryId: source.id,
      version: source.version,
      status: "approved",
      text: "Archived review",
    },
    409,
  );
  await setArchived(false);
  await action("teacher", {
    action: "select",
    projectId,
    selectedIds: [ids.student, ids.peer],
  });
  await request(`/api/inquiry?projectId=${projectId}`, "other", {
    expected: 403,
  });
  await request(filePath(source.id), "other", { expected: [403, 404] });
  await action(
    "other",
    {
      action: "comment",
      projectId,
      teamId: teamA.id,
      kind: "reply",
      content: "Removed participant write",
    },
    403,
  );
  await save("other", "reflection", answers.reflection, "submitted", 1, 403);
  board = await read("student");
  ok(
    !board.teams
      .find((team) => team.id === teamA.id)
      .memberIds.includes(ids.other),
    "Removed participants disappear from visible team membership",
  );
  const legacyAfter = (await request("/api/activities", "student")).activities;
  ok(
    legacyIds.every((id) => legacyAfter.some((item) => item.id === id)),
    "Existing individual activities remain available",
  );
  ok(
    !legacyAfter.some((item) =>
      board.entries.some((inquiry) => inquiry.id === item.id),
    ),
    "Guided entries remain separate from individual activity reports",
  );
  await setArchived(true);
  console.log(
    JSON.stringify({ passed: checks, projectId, runId, archived: true }),
  );
} catch (error) {
  console.error(
    `Inquiry QA failed after ${checks} checks. Local project: ${projectId ?? "not created"}; run: ${runId}`,
  );
  throw error;
}
