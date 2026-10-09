// Local-only integration checks for the four school fusion-inquiry worksheets.
// Start scripts/qa-inquiry-auth.mjs and a built local preview on port 5190 first.
// Uses only synthetic accounts; each run creates and then archives its own project.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = new URL("http://127.0.0.1:5190");
const runId = randomUUID().slice(0, 8);
const ids = Object.fromEntries(
  ["teacher", "student", "other", "peer", "outsider"].map((who) => [who, `qa-${who}`]),
);
const stageIds = ["plan", "materials", "report", "reflection"];
let checks = 0;
let projectId;
let teamA;
let teamB;
let defaults;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks++;
}
function ok(value, message) {
  assert.ok(value, message);
  checks++;
}
async function request(path, who, body, expected = 200) {
  assert.ok(path.startsWith("/api/") && !path.startsWith("//"));
  const url = new URL(path, base);
  assert.equal(url.origin, "http://127.0.0.1:5190", "Refusing a non-local QA destination");
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Connection: "close",
      ...(who ? { Authorization: `Bearer local-${ids[who]}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  const allowed = Array.isArray(expected) ? expected : [expected];
  ok(
    allowed.includes(response.status),
    `${who ?? "anonymous"} ${body ? "POST" : "GET"} ${path}: expected ${allowed}, got ${response.status}: ${raw.slice(0, 1600)}`,
  );
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    assert.fail(`Non-JSON response: ${raw.slice(0, 300)}`);
  }
  if (response.ok && path.startsWith("/api/inquiry")) {
    ok(response.headers.get("cache-control")?.includes("no-store"), "Private inquiry responses are not cached");
  }
  return data;
}
const action = (who, body, expected = 200) => request("/api/inquiry", who, body, expected);
const read = async (who = "teacher") => {
  const data = await request(`/api/inquiry?projectId=${encodeURIComponent(projectId)}`, who);
  equal(data.board?.project?.id, projectId, "Requested project returned");
  return data.board;
};
const entry = (board, stageId, who = "student", teamId = who === "peer" ? teamB?.id : teamA?.id) =>
  board.entries.find((item) => item.stageId === stageId &&
    (stageId === "reflection" ? item.ownerId === ids[who] : item.teamId === teamId));
const stageSetting = (board, stageId) => board.project.stages.find((item) => item.id === stageId);
const complete = (stageId, overrides = {}) => ({
  ...Object.fromEntries(defaults[stageId].map((field) => [
    field.id,
    field.type === "materials" ? "[]" : field.type === "select" ? field.options[0] :
      field.type === "url" ? "https://example.test/local-fixture" : `합성 테스트 ${runId}: ${field.label}`,
  ])),
  ...overrides,
});
async function save(who, stageId, answers, {
  status = "submitted", expected = 200, teamId = who === "peer" ? teamB?.id : teamA?.id,
  formRevision, version, extra = {},
} = {}) {
  const board = await read(who);
  const existing = entry(board, stageId, who, teamId);
  return action(who, {
    action: "save", projectId, stageId,
    ...(stageId === "reflection" ? {} : { teamId }),
    answers, status, version: version ?? existing?.version ?? 0,
    formRevision: formRevision ?? existing?.formRevision ?? stageSetting(board, stageId)?.revision ?? 1,
    ...extra,
  }, expected);
}
async function update(board, stages = board.project.stages, archived = false, expected = 200) {
  return action("teacher", {
    action: "update", projectId, title: board.project.title,
    description: board.project.description, status: board.project.status,
    stages, archived,
  }, expected);
}
const row = (overrides = {}) => ({
  name: "합성 실험 도구", specification: "500g", s2b: "QA-123456",
  quantity: "2", unitPrice: "95000", shipping: "10000", ...overrides,
});
const materialsAnswers = (items) => complete("materials", {
  items: typeof items === "string" ? items : JSON.stringify(items),
});
const customQuestion = {
  id: "safety", label: "안전 계획과 역할 분담", placeholder: "안전한 실험 계획을 적어주세요.",
  type: "long_text", required: true,
};

try {
  for (const who of Object.keys(ids)) {
    const session = await request("/api/auth/session", who);
    equal(session.profile.id, ids[who], `${who} synthetic identity`);
  }
  await action("student", {
    action: "create", template: "fusion", title: "Unauthorized fusion", description: "QA",
  }, 403);
  const created = await action("teacher", {
    action: "create", template: "fusion", title: `QA 융합탐구 ${runId}`,
    description: "Local synthetic fixtures only; no real purchases or student data.",
  }, 201);
  projectId = created.board.project.id;
  equal(created.board.project.template, "fusion", "Template identity is explicit");
  equal(created.board.project.stages.map((stage) => stage.id), stageIds, "Exactly four stages in school worksheet order");
  defaults = Object.fromEntries(created.board.project.stages.map((stage) => [stage.id, stage.fields]));
  for (const stageId of stageIds) {
    ok(Array.isArray(defaults[stageId]) && defaults[stageId].length > 0, `${stageId} template stores explicit questions`);
  }
  const expectedLabels = {
    plan: ["학년도", "팀명", "팀장 학번", "팀장 이름", "팀원 학번·이름", "진로 희망분야", "관심 키워드", "관련 교과목", "관심 키워드와 관련 교과목의 선정 이유", "탐구 주제", "탐구 방법", "기대 효과"],
    materials: ["팀명", "융합탐구 물품 정보 (20만 원 이내)", "작성일", "대표 확인 (이름)"],
    report: ["주제", "탐구 과정 요약", "탐구 결과", "교과 내용과의 관련성", "흥미로웠던 점", "새롭게 알게 된 점", "탐구 내용의 실생활 적용 및 사회적 기여 방안", "추후 탐구 제안"],
    reflection: ["탐구자 학번", "탐구자 성명", "탐구 참여 동기", "탐구 과정 역할", "새롭게 알게 된 점", "아쉬운 점", "탐구 성찰"],
  };
  for (const stageId of stageIds) {
    for (const label of expectedLabels[stageId]) {
      ok(defaults[stageId].some((field) => field.label === label), `${stageId} retains worksheet question: ${label}`);
    }
  }
  equal(defaults.materials.find((field) => field.id === "items")?.type, "materials", "Materials are a structured table");
  equal(defaults.plan.find((field) => field.id === "contact")?.required, false, "Contact information is optional");

  await request(`/api/inquiry?projectId=${projectId}`, "student", undefined, 403);
  const unselected = (await request("/api/inquiry", "outsider")).projects.find((project) => project.id === projectId);
  equal(unselected.stages, [], "Public recruitment list does not expose worksheet questions");
  for (const who of ["student", "other", "peer"]) await action(who, { action: "apply", projectId });
  await action("teacher", { action: "select", projectId, selectedIds: [ids.student, ids.other, ids.peer] });
  let mutation = await action("teacher", {
    action: "team", projectId, name: `융합 A ${runId}`, memberIds: [ids.student, ids.other], representativeId: ids.student,
  });
  teamA = mutation.board.teams.find((team) => team.name === `융합 A ${runId}`);
  mutation = await action("teacher", {
    action: "team", projectId, name: `융합 B ${runId}`, memberIds: [ids.peer], representativeId: ids.peer,
  });
  teamB = mutation.board.teams.find((team) => team.name === `융합 B ${runId}`);
  ok(teamA?.id && teamB?.id, "Teacher creates two separate representative-led teams");
  await request(`/api/inquiry?projectId=${projectId}`, "outsider", undefined, 403);
  for (const stageId of ["plan", "materials", "report"]) {
    await save("other", stageId, complete(stageId), { status: "draft", expected: 403 });
    await save("peer", stageId, complete(stageId), { status: "draft", teamId: teamA.id, expected: 403 });
  }
  await save("student", "sources", { claim: "Injected legacy stage" }, { status: "draft", expected: [400, 409] });
  await action("teacher", {
    action: "publish_form", projectId, stageId: "sources", fields: [customQuestion], revision: 1,
  }, [400, 409]);

  // Metadata changes preserve the selected workflow; cannot silently add/remove stages.
  let board = await read();
  await update(board, board.project.stages.slice(0, 3), false, [400, 409]);
  await update(board, [...board.project.stages, { id: "sources", instruction: "injected", dueDate: "" }], false, [400, 409]);
  await update(board, board.project.stages.map((stage) => stage.id === "plan" ? { ...stage, id: "sources" } : stage), false, [400, 409]);
  await update(board, board.project.stages.map(({ id, instruction, dueDate }) => ({ id, instruction, dueDate })));
  board = await read();
  equal(board.project.stages.map((stage) => stage.id), stageIds, "Metadata update retains exactly the four configured stages");
  equal(stageSetting(board, "reflection").fields, defaults.reflection, "Fusion reflection does not revert to factcheck questions");

  // Every later submission must follow the previous group submission.
  for (const stageId of ["materials", "report", "reflection"]) {
    await save("student", stageId, complete(stageId), { expected: [400, 409] });
  }
  mutation = await save("student", "plan", { topic: `작성 중 ${runId}` }, { status: "draft" });
  equal(entry(mutation.board, "plan").status, "draft", "Partial plans can be saved");
  await save("student", "materials", complete("materials"), { expected: [400, 409] });
  equal(entry(await read("other"), "plan").answers.topic, `작성 중 ${runId}`, "Teammates can read their draft plan");
  equal(entry(await read("peer"), "plan", "student"), undefined, "Other teams cannot read draft plans");

  // Publish an added question after A started; old records retain their original form.
  const customizedPlan = [...defaults.plan, customQuestion];
  await action("other", {
    action: "publish_form", projectId, stageId: "plan", fields: customizedPlan, revision: 1,
  }, 403);
  await action("teacher", {
    action: "publish_form", projectId, stageId: "plan", fields: customizedPlan, revision: 1,
  });
  await save("peer", "plan", complete("plan"), { formRevision: 1, expected: 409 });
  mutation = await save("student", "plan", complete("plan"));
  equal(entry(mutation.board, "plan").formRevision, 1, "Started plan keeps revision one");
  equal(entry(mutation.board, "plan").fieldSnapshot, defaults.plan, "Started plan keeps its entire original field snapshot");
  equal(entry(await read("peer"), "plan", "student"), undefined, "Submitted plan remains private to its own team");
  await save("peer", "plan", complete("plan"), { expected: 400 });
  mutation = await save("peer", "plan", complete("plan", { safety: "보호 장비를 확인하고 안전한 역할을 분담합니다." }));
  equal(entry(mutation.board, "plan", "peer").formRevision, 2, "New plan uses published revision two");
  equal(entry(mutation.board, "plan", "peer").fieldSnapshot, customizedPlan, "New plan stores customized questions");
  board = await read();
  await update(board, board.project.stages.map(({ id, instruction, dueDate }) => ({ id, instruction, dueDate })));
  equal(stageSetting(await read(), "plan").fields, customizedPlan, "Later metadata saves do not erase custom questions");
  console.log("Fusion QA: worksheet fidelity, enrollment, group permissions, and versioned forms passed");

  // Material tables tolerate incomplete drafts but enforce shape and budget on submission.
  mutation = await save("student", "materials", materialsAnswers([row({ name: "", quantity: "" })]), { status: "draft" });
  equal(entry(mutation.board, "materials").status, "draft", "Partially entered material rows can be saved as drafts");
  const invalidItems = [
    [row({ shipping: "10001" })],
    [row({ quantity: "1.5" })],
    [row({ quantity: "0" })],
    [row({ quantity: "-1" })],
    [row({ shipping: "-1" })],
    [row({ unitPrice: "-1" })],
    [row({ unitPrice: "95000.5" })],
    [row({ name: "" })],
    [row({ quantity: "9007199254740993" })],
    Array.from({ length: 21 }, () => row({ quantity: "1", unitPrice: "1", shipping: "0" })),
    "not-json", "{}", '[{"name":"incomplete"}]',
  ];
  for (const items of invalidItems) {
    const before = entry(await read("student"), "materials");
    const rejected = await save("student", "materials", materialsAnswers(items), { expected: 400 });
    ok(rejected.error, "Invalid material submission explains the failure");
    const after = entry(await read("student"), "materials");
    equal(after.version, before.version, "Rejected submission does not change record version");
    equal(after.answers, before.answers, "Rejected submission preserves saved answers");
  }
  mutation = await save("student", "materials", materialsAnswers([row()]));
  equal(entry(mutation.board, "materials").status, "submitted", "Exactly 200,000 won including shipping is accepted");
  equal(JSON.parse(entry(mutation.board, "materials").answers.items), [row()], "Submitted material rows retain all columns");
  mutation = await save("peer", "materials", materialsAnswers([]));
  equal(entry(mutation.board, "materials", "peer").answers.items, "[]", "Explicit no-material request can be submitted");
  equal(entry(await read("other"), "materials").status, "submitted", "Own teammates can reference submitted request");
  equal(entry(await read("peer"), "materials", "student"), undefined, "Requests with team details stay private to the team");
  console.log("Fusion QA: partial drafts, malformed inputs, integer amounts, and 200,000 won budget passed");

  await save("student", "reflection", complete("reflection"), { expected: [400, 409] });
  mutation = await save("student", "report", complete("report"));
  let report = entry(mutation.board, "report");
  equal(report.status, "submitted", "Group report can follow the planning forms");
  const memberBoard = await read("other");
  for (const stageId of ["plan", "materials", "report"]) {
    ok(entry(memberBoard, stageId), `${stageId} is available to reference while writing own reflection`);
  }
  equal(entry(await read("peer"), "report", "student"), undefined, "Another team's report is private");
  mutation = await action("teacher", {
    action: "review", projectId, entryId: report.id, version: report.version,
    status: "revision", text: `근거와 결과를 연결해 주세요. ${runId}`,
  });
  report = entry(mutation.board, "report");
  equal(report.status, "revision", "Teacher requests report revision");
  equal(entry(await read("other"), "report").feedback.at(-1)?.text, `근거와 결과를 연결해 주세요. ${runId}`, "Team can see teacher feedback");

  // A revision request does not erase prior submission or block individual work.
  await save("student", "reflection", complete("reflection", { student_name: "합성 모둠장", reflection: `개인 성찰 A ${runId}` }));
  await save("other", "reflection", complete("reflection", { student_name: "합성 모둠원", reflection: `개인 성찰 B ${runId}` }));
  equal(entry(await read("student"), "reflection", "other"), undefined, "Representative cannot read another member's reflection");
  equal(entry(await read("other"), "reflection", "student"), undefined, "Member cannot read representative's reflection");
  equal((await read("peer")).entries.filter((item) => item.stageId === "reflection").length, 0, "Other team cannot read personal reflections");
  board = await read();
  const reflections = board.entries.filter((item) => item.stageId === "reflection");
  equal(reflections.length, 2, "Teacher sees both members' independently submitted reflections");
  equal(new Set(reflections.map((item) => item.id)).size, 2, "Individual submissions use distinct records");
  for (const who of ["student", "other"]) {
    const reflection = entry(board, "reflection", who);
    equal(reflection.ownerId, ids[who], "Reflection belongs to the authenticated student");
    equal(reflection.fieldSnapshot, defaults.reflection, "Fusion reflection keeps the school form, not the factcheck form");
  }
  const peerReflection = entry(board, "reflection", "other");
  await action("student", {
    action: "review", projectId, entryId: peerReflection.id, version: peerReflection.version,
    status: "approved", text: "Unauthorized student approval",
  }, 403);
  await action("teacher", {
    action: "review", projectId, entryId: peerReflection.id, version: peerReflection.version,
    status: "approved", text: `본인의 역할이 구체적입니다. ${runId}`,
  });
  equal(entry(await read("other"), "reflection", "other").status, "approved", "Teacher feedback reaches the correct individual");

  // Comments connected to private group work must not leak to another team.
  await action("other", {
    action: "comment", projectId, teamId: teamA.id, kind: "question", content: `모둠 내부 질문 ${runId}`,
  });
  ok((await read("student")).comments.some((comment) => comment.content.includes(runId)), "Own team can read its discussion");
  ok(!(await read("peer")).comments.some((comment) => comment.teamId === teamA.id), "Private team discussion is not exposed to another team");
  ok((await read()).comments.some((comment) => comment.teamId === teamA.id), "Teacher can guide the group discussion");
  await save("peer", "report", complete("report"));
  await save("peer", "reflection", complete("reflection", { student_name: "다른 모둠 학생" }));
  equal((await read()).entries.filter((item) => item.stageId === "reflection").length, 3, "Every selected team member can eventually submit their own reflection");
  console.log("Fusion QA: sequential group work, individual reflection privacy, and teacher feedback passed");

  board = await read();
  await update(board, board.project.stages, true);
  equal((await read()).project.archived, true, "Successful synthetic project is archived");
  await save("student", "plan", complete("plan"), { status: "draft", expected: 409 });
  console.log(JSON.stringify({ ok: true, checks, projectId, runId, template: "fusion" }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, checks, projectId, runId }, null, 2));
  throw error;
}
