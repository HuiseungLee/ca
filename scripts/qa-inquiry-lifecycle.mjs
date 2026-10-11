// Local-only integration checks for teacher-controlled fusion project releases.
// Run with scripts/qa-inquiry-auth.mjs and the built app on 127.0.0.1:5190.
// Synthetic records only; successful runs archive the project they create.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";

const base = new URL("http://127.0.0.1:5190");
const runId = randomUUID().slice(0, 8);
const ids = Object.fromEntries(
  ["teacher", "student", "other", "peer", "outsider"].map((name) => [
    name,
    `qa-${name}`,
  ]),
);
let checks = 0;
let projectId;
let team;
let defaults;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks++;
}
function ok(value, message) {
  assert.ok(value, message);
  checks++;
}
async function request(
  path,
  who,
  { body, expected = 200, binary = false } = {},
) {
  assert.ok(path.startsWith("/api/") && !path.startsWith("//"));
  const url = new URL(path, base);
  assert.equal(
    url.origin,
    base.origin,
    "QA must not reach a non-local destination",
  );
  const multipart = body instanceof FormData;
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Connection: "close",
      ...(who ? { Authorization: `Bearer local-${ids[who]}` } : {}),
      ...(body && !multipart ? { "content-type": "application/json" } : {}),
    },
    body: multipart ? body : body ? JSON.stringify(body) : undefined,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  ok(
    (Array.isArray(expected) ? expected : [expected]).includes(response.status),
    `${who ?? "anonymous"} ${path}: expected ${expected}, got ${response.status}: ${bytes.toString("utf8").slice(0, 1000)}`,
  );
  if (response.ok && path.startsWith("/api/inquiry")) {
    ok(
      response.headers.get("cache-control")?.includes("no-store"),
      "Private records and downloads are not cached",
    );
  }
  if (binary && response.ok) return { bytes, headers: response.headers };
  return JSON.parse(bytes.toString("utf8"));
}
const action = (who, body, expected = 200) =>
  request("/api/inquiry", who, { body: { projectId, ...body }, expected });
const read = async (who = "teacher") =>
  (await request(`/api/inquiry?projectId=${projectId}`, who)).board;
const item = (board, stageId, who = "student") =>
  board.entries.find(
    (entry) =>
      entry.stageId === stageId &&
      (stageId === "reflection"
        ? entry.ownerId === ids[who]
        : entry.teamId === team.id),
  );
const answers = (stageId, overrides = {}) => ({
  ...Object.fromEntries(
    defaults[stageId].map((field) => [
      field.id,
      field.type === "materials"
        ? "[]"
        : field.type === "select"
          ? field.options[0]
          : field.type === "url"
            ? "https://example.test/fixture"
            : `${field.label}: 합성 활동 ${runId}`,
    ]),
  ),
  ...overrides,
});
async function save(
  who,
  stageId,
  values = answers(stageId),
  status = "submitted",
  expected = 200,
) {
  const board = await read(who);
  const previous = item(board, stageId, who);
  const setting = board.project.stages.find((stage) => stage.id === stageId);
  return action(
    who,
    {
      action: "save",
      stageId,
      ...(stageId === "reflection" ? {} : { teamId: team.id }),
      answers: values,
      status,
      version: previous?.version ?? 0,
      formRevision: previous?.formRevision ?? setting.revision ?? 1,
    },
    expected,
  );
}
async function review(stageId, status = "approved", who = "student") {
  const entry = item(await read(), stageId, who);
  return action("teacher", {
    action: "review",
    entryId: entry.id,
    version: entry.version,
    status,
    text: `교사 신청서 확인 ${runId}`,
  });
}
const release = (phase, released, who = "teacher", expected = 200) =>
  action(who, { action: "release", phase, released }, expected);
async function upload(entry, who = "student", expected = 200) {
  const body = new FormData();
  body.set("entryId", entry.id);
  body.set("version", String(entry.version));
  body.set(
    "file",
    new Blob([`%PDF-1.4\nLocal synthetic attachment ${runId}\n%%EOF`], {
      type: "application/pdf",
    }),
    `lifecycle-${runId}.pdf`,
  );
  return request("/api/inquiry/files", who, { body, expected });
}
async function exportFile(who, format, filters = {}, expected = 200) {
  const query = new URLSearchParams({ projectId, format, ...filters });
  return request(`/api/inquiry/export?${query}`, who, {
    expected,
    binary: true,
  });
}
function zipText(buffer, name) {
  // Inspect genuine OOXML parts without relying on an optional archive package.
  equal(
    buffer.readUInt32LE(0),
    0x04034b50,
    "OOXML download is a ZIP container, not renamed HTML",
  );
  let offset = buffer.length - 22;
  while (
    offset >= Math.max(0, buffer.length - 65557) &&
    buffer.readUInt32LE(offset) !== 0x06054b50
  )
    offset--;
  ok(offset >= 0, "ZIP central directory is present");
  const entries = buffer.readUInt16LE(offset + 10);
  let central = buffer.readUInt32LE(offset + 16);
  for (let index = 0; index < entries; index++) {
    equal(
      buffer.readUInt32LE(central),
      0x02014b50,
      "Valid ZIP central-directory entry",
    );
    const size = buffer.readUInt32LE(central + 20);
    const length = buffer.readUInt16LE(central + 28);
    const current = buffer
      .subarray(central + 46, central + 46 + length)
      .toString("utf8");
    if (current === name) {
      const method = buffer.readUInt16LE(central + 10);
      const local = buffer.readUInt32LE(central + 42);
      const start =
        local +
        30 +
        buffer.readUInt16LE(local + 26) +
        buffer.readUInt16LE(local + 28);
      const compressed = buffer.subarray(start, start + size);
      ok(
        method === 0 || method === 8,
        "OOXML part uses supported ZIP compression",
      );
      return (method === 8 ? inflateRawSync(compressed) : compressed).toString(
        "utf8",
      );
    }
    central +=
      46 +
      length +
      buffer.readUInt16LE(central + 30) +
      buffer.readUInt16LE(central + 32);
  }
  assert.fail(`Missing OOXML part ${name}`);
}

try {
  for (const who of Object.keys(ids))
    equal(
      (await request("/api/auth/session", who)).profile.id,
      ids[who],
      "Synthetic authenticated account",
    );
  const created = await action(
    "teacher",
    {
      action: "create",
      template: "fusion",
      title: `QA 배부 운영 ${runId}`,
      description: "Synthetic lifecycle integration checks only.",
    },
    201,
  );
  projectId = created.board.project.id;
  defaults = Object.fromEntries(
    created.board.project.stages.map((stage) => [stage.id, stage.fields]),
  );
  equal(
    created.board.project.managed,
    true,
    "New fusion project opts into teacher-controlled releases",
  );
  equal(
    created.board.project.releasedStageIds,
    [],
    "All four forms begin undistributed",
  );
  ok(
    created.board.project.stages.every((stage) => stage.released === false),
    "Each stage persists its undistributed state",
  );
  await action(
    "student",
    { action: "start_application", teamName: "Too early" },
    409,
  );
  await release("applications", true, "student", 403);
  await request(`/api/inquiry?projectId=${projectId}`, "student", {
    expected: 403,
  });
  await exportFile(undefined, "csv", {}, 401);

  await release("applications", true);
  const listing = (await request("/api/inquiry", "student")).projects.find(
    (project) => project.id === projectId,
  );
  equal(
    listing.managed,
    true,
    "Recruitment list retains managed workflow identity",
  );
  equal(
    listing.releasedStageIds,
    ["plan", "materials"],
    "Newly joined students can discover distributed application forms",
  );
  equal(
    listing.stages,
    [],
    "Recruitment metadata does not expose participant worksheet contents",
  );
  const started = await Promise.all([
    action(
      "student",
      { action: "start_application", teamName: `스스로 신청한 모둠 ${runId}` },
      [200, 201],
    ),
    action(
      "student",
      { action: "start_application", teamName: `중복 신청 ${runId}` },
      [200, 201],
    ),
    action(
      "peer",
      { action: "start_application", teamName: `다른 모둠 ${runId}` },
      [200, 201],
    ),
  ]);
  const opened = started[0];
  team = opened.board.teams.find(
    (candidate) => candidate.representativeId === ids.student,
  );
  ok(
    team,
    "Leader can open their own application without prior teacher selection",
  );
  equal(
    team.memberIds,
    [ids.student],
    "Self-start cannot enroll arbitrary other students",
  );
  ok(
    opened.board.project.selectedIds.includes(ids.student),
    "Self-start grants only the authenticated leader participant access",
  );
  await action(
    "student",
    {
      action: "start_application",
      teamName: "Duplicate must not create another team",
    },
    [200, 409],
  );
  const startedBoard = await read();
  equal(
    startedBoard.teams.filter(
      (candidate) => candidate.representativeId === ids.student,
    ).length,
    1,
    "Concurrent and repeated start cannot create duplicate leader teams",
  );
  ok(
    startedBoard.project.selectedIds.includes(ids.student) &&
      startedBoard.project.selectedIds.includes(ids.peer),
    "Concurrent leaders retain both participant grants",
  );
  equal(
    startedBoard.project.selectedIds.filter((id) => id === ids.student).length,
    1,
    "Concurrent duplicate request does not duplicate a participant",
  );
  const peerTeam = startedBoard.teams.find(
    (candidate) => candidate.representativeId === ids.peer,
  );
  ok(peerTeam, "Another leader starts a separate team concurrently");
  equal(
    (await read("student")).teams.length,
    1,
    "Self-starting does not expose another applicant's team",
  );
  await action("teacher", { action: "select", selectedIds: [ids.student] });
  await action(
    "peer",
    { action: "start_application", teamName: "Attempted re-enrollment" },
    403,
  );
  ok(
    !(await read()).project.selectedIds.includes(ids.peer),
    "Self-start cannot restore revoked participation",
  );
  await action(
    "student",
    {
      action: "team",
      id: team.id,
      name: team.name,
      memberIds: [ids.student, ids.other],
      representativeId: ids.student,
    },
    403,
  );

  await action("other", { action: "apply" });
  await request(`/api/inquiry?projectId=${projectId}`, "other", {
    expected: 403,
  });
  await action("teacher", {
    action: "select",
    selectedIds: [ids.student, ids.other],
  });
  await action("teacher", {
    action: "team",
    id: team.id,
    name: team.name,
    memberIds: [ids.student, ids.other],
    representativeId: ids.student,
  });
  equal(
    (await read("other")).teams[0].id,
    team.id,
    "Teacher assigns an applicant to the leader's team",
  );
  await save("other", "plan", answers("plan"), "draft", 403);
  await save("student", "report", answers("report"), "draft", 409);
  await save("other", "reflection", answers("reflection"), "draft", 409);
  await exportFile("student", "csv", {}, 404);
  await save("student", "materials");
  equal(
    item(await read(), "materials").status,
    "submitted",
    "Material requests can be submitted before the plan is started",
  );

  const initialPlan = answers("plan", {
    topic: `=HYPERLINK("https://example.test","합성 수식 ${runId}")`,
  });
  await save("student", "plan", initialPlan, "draft");
  await upload(item(await read(), "plan"));
  const newPlanFields = [
    ...defaults.plan,
    {
      id: "later_question",
      label: `나중에 추가한 질문 ${runId}`,
      placeholder: "새 신청서에만 적용",
      required: true,
      type: "long_text",
    },
  ];
  await action("teacher", {
    action: "publish_form",
    stageId: "plan",
    fields: newPlanFields,
    revision: 1,
  });
  equal(
    (await read()).project.releasedStageIds,
    ["plan", "materials"],
    "Editing a form does not release post-activity forms",
  );
  await save("student", "plan", initialPlan);
  equal(
    item(await read(), "plan").fieldSnapshot,
    defaults.plan,
    "A started application retains the original question snapshot",
  );
  await save("student", "materials");
  await review("plan");
  await save("student", "report", answers("report"), "draft", 409);
  await release("outcomes", true);
  await save("student", "report", answers("report"), "draft", 409);
  await save("other", "reflection", answers("reflection"), "draft", 409);
  await release("outcomes", false);
  await review("materials");
  await save("student", "report", answers("report"), "draft", 409);
  equal(
    item(await read(), "plan").status,
    "approved",
    "Teacher confirms the plan independently",
  );
  equal(
    item(await read(), "materials").status,
    "approved",
    "Teacher confirms the materials independently",
  );
  console.log(
    "Lifecycle QA: undistributed forms, direct application, team membership, form snapshots, and teacher review passed",
  );

  await release("outcomes", true);
  equal(
    (await read()).project.releasedStageIds,
    ["plan", "materials", "report", "reflection"],
    "Teacher separately distributes both post-activity forms",
  );
  await save(
    "other",
    "reflection",
    answers("reflection", { reflection: `MEMBER_PRIVATE_${runId}` }),
  );
  equal(
    item(await read(), "reflection", "other").status,
    "submitted",
    "Each student's reflection can precede the leader's report",
  );
  await save("student", "report", answers("report"), "draft");
  await upload(item(await read(), "report"));
  await save("student", "report");
  await save(
    "student",
    "reflection",
    answers("reflection", { reflection: `LEADER_PRIVATE_${runId}` }),
  );
  await save(
    "other",
    "reflection",
    answers("reflection", { reflection: `MEMBER_PRIVATE_${runId}` }),
  );
  equal(
    (await read()).entries.filter((entry) => entry.stageId === "reflection")
      .length,
    2,
    "All members, including the leader, submit individual reflections",
  );
  equal(
    (await read("student")).entries.filter(
      (entry) => entry.stageId === "reflection",
    ).length,
    1,
    "Leader cannot see another member's individual response",
  );
  equal(
    (await read("other")).entries.filter(
      (entry) => entry.stageId === "reflection",
    ).length,
    1,
    "Member cannot see leader's individual response",
  );

  const closed = await read();
  await action("teacher", {
    action: "update",
    title: closed.project.title,
    description: closed.project.description,
    status: "closed",
    stages: closed.project.stages,
    archived: false,
  });
  await action(
    "outsider",
    { action: "start_application", teamName: "Closed recruitment" },
    409,
  );
  equal(
    (await read()).project.releasedStageIds,
    ["plan", "materials", "report", "reflection"],
    "Ordinary metadata updates preserve distribution state",
  );

  await release("applications", false);
  await release("outcomes", false);
  equal(
    (await read()).project.releasedStageIds,
    [],
    "Teacher can close both form phases without deleting records",
  );
  for (const stageId of ["plan", "materials", "report", "reflection"])
    await save("student", stageId, answers(stageId), "draft", 409);
  await upload(item(await read(), "report"), "student", 409);
  equal(
    (await read("student")).entries.length,
    4,
    "Read access to own records survives distribution closure",
  );
  const file = await request(
    `/api/inquiry/files?entryId=${item(await read(), "report").id}`,
    "other",
    { binary: true },
  );
  ok(
    file.bytes.toString("utf8").includes(runId),
    "Own-team attachment download survives distribution closure",
  );

  const teacherCsv = await exportFile("teacher", "csv");
  const csv = teacherCsv.bytes.toString("utf8");
  ok(
    csv.includes(`LEADER_PRIVATE_${runId}`) &&
      csv.includes(`MEMBER_PRIVATE_${runId}`),
    "Teacher download contains every member's reflection",
  );
  const studentCsv = (await exportFile("student", "csv")).bytes.toString(
    "utf8",
  );
  ok(
    studentCsv.includes(`LEADER_PRIVATE_${runId}`),
    "Leader download contains their own reflection",
  );
  ok(
    !studentCsv.includes(`MEMBER_PRIVATE_${runId}`),
    "Leader download excludes another member's private reflection",
  );
  const otherCsv = (await exportFile("other", "csv")).bytes.toString("utf8");
  ok(
    otherCsv.includes(`MEMBER_PRIVATE_${runId}`) &&
      !otherCsv.includes(`LEADER_PRIVATE_${runId}`),
    "Member export applies the same private-record boundary",
  );
  const memberReflection = item(await read(), "reflection", "other");
  await exportFile(
    "student",
    "csv",
    { entryId: memberReflection.id },
    [403, 404],
  );
  await exportFile("student", "xlsx", { teamId: peerTeam.id }, [403, 404]);
  await exportFile("student", "hwp", {}, 400);
  await exportFile("outsider", "csv", {}, 403);
  const plan = item(await read(), "plan");
  const planCsv = (
    await exportFile("student", "csv", { entryId: plan.id })
  ).bytes.toString("utf8");
  ok(
    !planCsv.includes(`나중에 추가한 질문 ${runId}`),
    "Download uses saved questions rather than the subsequently edited form",
  );
  ok(
    planCsv.includes("HYPERLINK"),
    "Export preserves the original text of formula-like responses",
  );
  ok(
    !/(?:^|[\r\n,])(?:")?=HYPERLINK/.test(planCsv),
    "CSV cells do not activate spreadsheet formulas from student text",
  );
  for (const format of ["xlsx", "docx"]) {
    const exported = await exportFile("teacher", format, { entryId: plan.id });
    ok(
      exported.headers.get("content-disposition")?.includes(format),
      `${format} has an honest download extension`,
    );
    ok(
      exported.headers.get("content-type")?.includes("openxmlformats"),
      `${format} uses an OOXML MIME type`,
    );
    const xml = zipText(
      exported.bytes,
      format === "xlsx" ? "xl/workbook.xml" : "word/document.xml",
    );
    ok(xml.length > 50, `${format} contains a real document part`);
    if (format === "docx") {
      ok(
        xml.includes("HYPERLINK"),
        "Document export contains the saved application answer",
      );
      ok(
        !xml.includes(`나중에 추가한 질문 ${runId}`),
        "Document export respects saved form snapshots",
      );
    }
  }
  console.log(
    "Lifecycle QA: post-activity distribution, private reflections, closed form read access, and real CSV/XLSX/DOCX downloads passed",
  );

  // Changing an approved application revokes the per-team outcome writing gate.
  await release("applications", true);
  await release("outcomes", true);
  await save("student", "plan", initialPlan, "draft");
  await save("student", "report", answers("report"), "draft", 409);
  await save("other", "reflection", answers("reflection"), "draft", 409);
  await upload(item(await read(), "report"), "student", 409);
  await save("student", "plan", initialPlan);
  await review("plan");
  await save("student", "report", answers("report"), "draft");
  equal(
    item(await read(), "report").status,
    "draft",
    "Renewed teacher approval reopens permitted post-activity writing",
  );

  const finalBoard = await read();
  await action("teacher", {
    action: "update",
    title: finalBoard.project.title,
    description: finalBoard.project.description,
    status: finalBoard.project.status,
    stages: finalBoard.project.stages,
    archived: true,
  });
  equal(
    (await read()).project.archived,
    true,
    "Synthetic lifecycle project is archived",
  );
  await release("applications", true, "teacher", 409);
  await action(
    "outsider",
    { action: "start_application", teamName: "Archived project" },
    409,
  );
  await exportFile("teacher", "csv");
  await exportFile("student", "csv");

  // A teacher assignment can race a selected student's self-start. Both paths
  // must preserve the one-team-per-student invariant at the database write.
  const mainProjectId = projectId;
  const raceProject = await action(
    "teacher",
    {
      action: "create",
      template: "fusion",
      title: `QA 모둠 경합 ${runId}`,
      description: "Synthetic concurrent membership checks only.",
      projectId: undefined,
    },
    201,
  );
  projectId = raceProject.board.project.id;
  await release("applications", true);
  await action("student", { action: "apply" });
  await action("teacher", { action: "select", selectedIds: [ids.student] });
  await Promise.all([
    action(
      "student",
      { action: "start_application", teamName: `자가 신청 ${runId}` },
      [200, 201, 409],
    ),
    action(
      "teacher",
      {
        action: "team",
        name: `교사 배정 ${runId}`,
        memberIds: [ids.student],
        representativeId: ids.student,
      },
      [200, 400, 409],
    ),
  ]);
  const raceBoard = await read();
  equal(
    raceBoard.teams.filter((candidate) =>
      candidate.memberIds.includes(ids.student),
    ).length,
    1,
    "Racing teacher assignment and self-start cannot duplicate membership",
  );
  ok(
    raceBoard.project.selectedIds.includes(ids.student),
    "Racing assignment preserves previously granted participation",
  );
  await action("teacher", {
    action: "update",
    title: raceBoard.project.title,
    description: raceBoard.project.description,
    status: raceBoard.project.status,
    stages: raceBoard.project.stages,
    archived: true,
  });
  equal(
    (await read()).project.archived,
    true,
    "Synthetic concurrent-membership project is archived",
  );
  projectId = mainProjectId;
  console.log(JSON.stringify({ ok: true, checks, projectId, runId }, null, 2));
} catch (error) {
  console.error(
    JSON.stringify({ ok: false, checks, projectId, runId }, null, 2),
  );
  throw error;
}
