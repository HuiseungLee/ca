// Local integration checks for teacher-published inquiry stage questions.
// Start scripts/qa-inquiry-auth.mjs and a built local preview before running.
// node scripts/qa-inquiry-forms.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = new URL("http://127.0.0.1:5190");
assert.equal(base.origin, "http://127.0.0.1:5190");
const runId = randomUUID().slice(0, 8);
const users = ["teacher", "student", "other", "peer", "outsider"];
const teams = new Map();
let projectId;
let checks = 0;

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  checks++;
}
function ok(value, message) {
  assert.ok(value, message);
  checks++;
}
async function api(path, who, body, expected = 200) {
  assert.ok(path.startsWith("/api/") && !path.startsWith("//"));
  const url = new URL(path, base);
  assert.equal(
    url.origin,
    "http://127.0.0.1:5190",
    "Refusing a non-local QA destination",
  );
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
    headers: {
      Connection: "close",
      ...(who ? { Authorization: `Bearer local-qa-${who}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert.ok(
    allowed.includes(response.status),
    `${who ?? "anonymous"} ${body ? "POST" : "GET"} ${path}: expected ${allowed}, received ${response.status}: ${raw.slice(0, 1500)}`,
  );
  checks++;
  let result;
  try {
    result = JSON.parse(raw);
  } catch {
    assert.fail(`Non-JSON response: ${raw.slice(0, 300)}`);
  }
  if (response.ok && path.startsWith("/api/inquiry")) {
    ok(
      response.headers.get("cache-control")?.includes("no-store"),
      "Inquiry responses must not be publicly cached",
    );
  }
  return result;
}
const post = (who, body, expected = 200) =>
  api("/api/inquiry", who, body, expected);
const read = async (who = "teacher") => {
  const result = await api(
    `/api/inquiry?projectId=${encodeURIComponent(projectId)}`,
    who,
  );
  ok(
    result.board?.project?.id === projectId,
    "GET returns the requested board",
  );
  return result.board;
};
const setting = (board, stageId = "sources") =>
  board.project.stages.find((stage) => stage.id === stageId);
const findEntry = (board, who, stageId = "sources") =>
  board.entries.find(
    (entry) => entry.stageId === stageId && entry.teamId === teams.get(who),
  );
const publish = (who, fields, revision, stageId = "sources", expected = 200) =>
  post(
    who,
    { action: "publish_form", projectId, stageId, fields, revision },
    expected,
  );
async function save(
  who,
  answers,
  {
    stageId = "sources",
    status = "submitted",
    version = 0,
    formRevision = 1,
    expected = 200,
    extra = {},
  } = {},
) {
  return post(
    who,
    {
      action: "save",
      projectId,
      teamId: teams.get(who),
      stageId,
      answers,
      status,
      version,
      formRevision,
      ...extra,
    },
    expected,
  );
}
async function updateMetadata(board, archived = false) {
  return post("teacher", {
    action: "update",
    projectId,
    title: `QA editable forms ${runId}`,
    description: "Generic inquiry project; synthetic local fixture only.",
    status: "open",
    archived,
    // Deliberately omit question configuration, as a metadata-only editor does.
    stages: board.project.stages.map(({ id, instruction, dueDate }) => ({
      id,
      instruction: id === "sources" ? `Updated guidance ${runId}` : instruction,
      dueDate,
    })),
  });
}
const field = (id, type, required = true, options) => ({
  id,
  type,
  required,
  label: `${id} question`,
  placeholder: `Enter ${id}`,
  ...(options ? { options } : {}),
});
const customFields = [
  field("research_prompt", "short_text"),
  field("source_reference", "url"),
  field("reasoning", "long_text"),
  field("confidence", "select", true, ["low", "high"]),
  field("optional_choice", "select", false, ["yes", "no"]),
];
const originalAnswers = {
  claim: `Default form claim ${runId}`,
  links: "https://example.test/original",
  context: "Synthetic source author, date, and purpose.",
};
const customAnswers = {
  research_prompt: `Custom question ${runId}`,
  source_reference: "https://example.test/custom",
  reasoning:
    "A sample evidence-based explanation without any automatic truth judgment.",
  confidence: "low",
  optional_choice: "",
};

try {
  for (const who of users) {
    equal(
      (await api("/api/auth/session", who)).profile.id,
      `qa-${who}`,
      `${who} uses a synthetic fixture identity`,
    );
  }
  const created = await post(
    "teacher",
    {
      action: "create",
      title: `QA editable forms ${runId}`,
      description: "Generic inquiry project; synthetic local fixture only.",
    },
    201,
  );
  projectId = created.board.project.id;
  equal(
    setting(created.board).revision ?? 1,
    1,
    "A new project starts with the first form revision",
  );
  for (const who of ["student", "other", "peer"])
    await post(who, { action: "apply", projectId });
  await post("teacher", {
    action: "select",
    projectId,
    selectedIds: ["qa-student", "qa-other", "qa-peer"],
  });
  for (const who of ["student", "other", "peer"]) {
    const result = await post("teacher", {
      action: "team",
      projectId,
      name: `QA ${who} ${runId}`,
      memberIds: [`qa-${who}`],
      representativeId: `qa-${who}`,
    });
    const team = result.board.teams.find(
      (item) => item.name === `QA ${who} ${runId}`,
    );
    ok(team, "Teacher creates an independent team for each form generation");
    teams.set(who, team.id);
  }

  // Start a default-form record before a teacher changes the published questions.
  let result = await save("student", originalAnswers, { status: "draft" });
  let original = findEntry(result.board, "student");
  equal(
    original.formRevision ?? 1,
    1,
    "The original record records revision one",
  );
  ok(
    Array.isArray(original.fieldSnapshot) &&
      original.fieldSnapshot.length === 3,
    "A newly started default record snapshots its three questions",
  );
  const originalSnapshot = structuredClone(original.fieldSnapshot);
  const originalInstruction = original.instructionSnapshot;
  equal(
    originalSnapshot.map((item) => item.id),
    ["claim", "links", "context"],
    "The original snapshot captures the default field IDs",
  );

  await publish("student", customFields, 1, "sources", 403);
  await publish("teacher", [], 1, "sources", 400);
  await publish(
    "teacher",
    [customFields[0], { ...customFields[1], id: customFields[0].id }],
    1,
    "sources",
    400,
  );
  await publish(
    "teacher",
    [field("invalid_type", "checkbox")],
    1,
    "sources",
    400,
  );
  await publish(
    "teacher",
    [field("empty_select", "select", true, [])],
    1,
    "sources",
    400,
  );
  await publish(
    "teacher",
    Array.from({ length: 21 }, (_, i) => field(`too_many_${i}`, "short_text")),
    1,
    "sources",
    400,
  );
  equal(
    setting(await read()).revision ?? 1,
    1,
    "Rejected publishing does not increment the form revision",
  );
  result = await publish("teacher", customFields, 1);
  let published = setting(result.board);
  equal(
    published.revision,
    2,
    "Publishing increments the revision from one to two",
  );
  equal(
    published.fields,
    customFields,
    "The teacher's labels, field types, options, and required flags are published",
  );
  ok(
    published.publishedAt && !Number.isNaN(Date.parse(published.publishedAt)),
    "Published forms have a publication timestamp",
  );
  const revisionTwoFields = structuredClone(published.fields);
  const publicationTime = published.publishedAt;
  await publish(
    "teacher",
    [{ ...customFields[0], label: "Stale editor overwrite" }],
    1,
    "sources",
    409,
  );
  equal(
    setting(await read()).fields,
    revisionTwoFields,
    "A stale editor cannot overwrite a newer published form",
  );

  result = await updateMetadata(await read());
  published = setting(result.board);
  equal(
    published.fields,
    revisionTwoFields,
    "Metadata editing preserves published questions when fields are omitted",
  );
  equal(published.revision, 2, "Metadata editing preserves the form revision");
  equal(
    published.publishedAt,
    publicationTime,
    "Metadata editing preserves the publication timestamp",
  );
  equal(
    published.instruction,
    `Updated guidance ${runId}`,
    "Stage guidance can be updated independently",
  );
  console.log(
    "Inquiry form QA: publication authorization, validation, conflicts, and metadata preservation passed",
  );

  // An existing record uses its original snapshot even when the live form changed.
  const noOriginalContext = { ...originalAnswers, context: "" };
  await save("student", noOriginalContext, {
    version: original.version,
    formRevision: 1,
    expected: 400,
    extra: {
      fieldSnapshot: [{ ...field("claim", "short_text"), required: false }],
    },
  });
  original = findEntry(await read("student"), "student");
  equal(
    original.fieldSnapshot,
    originalSnapshot,
    "Student-supplied snapshots cannot remove original required questions",
  );
  result = await save("student", originalAnswers, {
    version: original.version,
    formRevision: 1,
  });
  original = findEntry(result.board, "student");
  equal(
    original.status,
    "submitted",
    "An existing record can submit its original answers after republication",
  );
  equal(
    original.fieldSnapshot,
    originalSnapshot,
    "Submitting preserves the original labels and field types",
  );
  equal(
    original.formRevision,
    1,
    "Submitting retains the original form revision",
  );
  equal(
    original.instructionSnapshot,
    originalInstruction,
    "Later guidance edits do not rewrite an existing instruction snapshot",
  );

  await save(
    "other",
    { ...customAnswers, research_prompt: "" },
    { formRevision: 2, expected: 400 },
  );
  for (const badUrl of [
    "not-a-url",
    "javascript:alert(1)",
    "ftp://example.test/source",
  ]) {
    await save(
      "other",
      { ...customAnswers, source_reference: badUrl },
      { formRevision: 2, expected: 400 },
    );
  }
  await save(
    "other",
    { ...customAnswers, confidence: "not-an-option" },
    { formRevision: 2, expected: 400 },
  );
  await save(
    "other",
    { ...customAnswers, confidence: "" },
    { formRevision: 2, expected: 400 },
  );
  await save(
    "other",
    { ...customAnswers, research_prompt: "" },
    {
      formRevision: 2,
      expected: 400,
      extra: { fieldSnapshot: [field("research_prompt", "short_text", false)] },
    },
  );
  equal(
    findEntry(await read("other"), "other"),
    undefined,
    "Rejected new submissions do not create an entry",
  );
  result = await save(
    "other",
    { research_prompt: customAnswers.research_prompt },
    { formRevision: 2, status: "draft" },
  );
  let customized = findEntry(result.board, "other");
  equal(
    customized.fieldSnapshot,
    revisionTwoFields,
    "A new draft snapshots the currently published custom questions",
  );
  equal(customized.formRevision, 2, "A new draft records revision two");
  equal(
    findEntry(await read("student"), "other"),
    undefined,
    "Another team cannot read a custom-form draft",
  );
  ok(
    findEntry(await read(), "other"),
    "Teacher can inspect a custom-form draft",
  );
  result = await save("other", customAnswers, {
    version: customized.version,
    formRevision: 2,
  });
  customized = findEntry(result.board, "other");
  equal(
    customized.status,
    "submitted",
    "Custom fields submit without removed default questions",
  );
  equal(
    customized.answers.optional_choice,
    "",
    "An optional select can be left blank",
  );
  ok(
    !Object.prototype.hasOwnProperty.call(customized.answers, "links"),
    "URL validation is driven by the custom field type, not a fixed links key",
  );
  ok(
    findEntry(await read("student"), "other"),
    "Selected peers can read a submitted custom-form entry",
  );
  await api(`/api/inquiry?projectId=${projectId}`, "outsider", undefined, 403);

  // Later labels/options must only affect records which have not started yet.
  const thirdFields = customFields.map((item) =>
    item.id === "confidence"
      ? { ...item, options: ["uncertain", "supported"] }
      : item.id === "research_prompt"
        ? { ...item, label: "Revised label for new records" }
        : item,
  );
  result = await publish("teacher", thirdFields, 2);
  equal(
    setting(result.board).revision,
    3,
    "Republishing advances the form revision again",
  );
  equal(
    findEntry(result.board, "other").fieldSnapshot,
    revisionTwoFields,
    "Republishing never rewrites started custom records",
  );
  equal(
    findEntry(result.board, "student").fieldSnapshot,
    originalSnapshot,
    "Republishing also preserves original default records",
  );
  customized = findEntry(await read("other"), "other");
  result = await save(
    "other",
    {
      ...customAnswers,
      reasoning:
        "Updated reasoning using the original form and original choice.",
    },
    { version: customized.version, formRevision: 2 },
  );
  customized = findEntry(result.board, "other");
  equal(
    customized.answers.confidence,
    "low",
    "An existing record still accepts its original choices after the live options change",
  );
  equal(
    customized.fieldSnapshot,
    revisionTwoFields,
    "Editing answers does not replace the record's form snapshot",
  );
  await save("peer", customAnswers, { formRevision: 2, expected: 409 });
  equal(
    findEntry(await read("peer"), "peer"),
    undefined,
    "A stale new-entry form revision cannot create a record",
  );
  const newAnswers = { ...customAnswers, confidence: "uncertain" };
  result = await save("peer", newAnswers, { formRevision: 3 });
  const newest = findEntry(result.board, "peer");
  equal(
    newest.formRevision,
    3,
    "A newly started record uses the latest published revision",
  );
  equal(
    newest.fieldSnapshot,
    thirdFields,
    "A newly started record uses the latest labels and options",
  );

  // A forged snapshot cannot influence valid edits either: reject it or ignore it.
  const forged = await save("other", customAnswers, {
    version: customized.version,
    formRevision: 2,
    expected: [200, 400],
    extra: {
      fieldSnapshot: [field("attacker_question", "short_text", false)],
      instructionSnapshot: "FORGED INSTRUCTION",
    },
  });
  customized = findEntry(forged.board ?? (await read("other")), "other");
  equal(
    customized.fieldSnapshot,
    revisionTwoFields,
    "Valid student edits cannot forge the stored question snapshot",
  );
  ok(
    customized.instructionSnapshot !== "FORGED INSTRUCTION",
    "Students cannot forge stored teacher guidance",
  );
  console.log(
    "Inquiry form QA: required fields, custom URL/select validation, snapshot preservation, and stale client handling passed",
  );

  const twentyFields = Array.from({ length: 20 }, (_, i) =>
    field(
      `question_${String(i + 1).padStart(2, "0")}`,
      i % 2 ? "long_text" : "short_text",
    ),
  );
  result = await publish("teacher", twentyFields, 1, "evidence");
  equal(
    setting(result.board, "evidence").revision,
    2,
    "A second stage has an independent form revision",
  );
  equal(
    setting(result.board, "evidence").fields.length,
    20,
    "Twenty questions can be published",
  );
  const twentyAnswers = Object.fromEntries(
    twentyFields.map((item, i) => [
      item.id,
      `Sample answer ${i + 1} for ${runId}`,
    ]),
  );
  result = await save("other", twentyAnswers, {
    stageId: "evidence",
    formRevision: 2,
  });
  const twentyEntry = findEntry(result.board, "other", "evidence");
  equal(
    twentyEntry.status,
    "submitted",
    "All twenty required answers can be submitted",
  );
  equal(
    twentyEntry.fieldSnapshot.length,
    20,
    "All twenty question definitions are snapshotted",
  );
  equal(
    twentyEntry.answers,
    twentyAnswers,
    "No answers are dropped by the former lower field limit",
  );
  await publish(
    "teacher",
    [...twentyFields, field("question_21", "short_text")],
    2,
    "evidence",
    400,
  );
  equal(
    setting(await read(), "evidence").revision,
    2,
    "Rejecting twenty-one questions preserves the current form",
  );
  result = await updateMetadata(await read(), true);
  equal(
    result.board.project.archived,
    true,
    "The repeatable QA project is archived after completion",
  );
  await publish("teacher", customFields, 3, "sources", 409);
  console.log(
    JSON.stringify({
      passed: checks,
      projectId,
      runId,
      archived: true,
      legacyCoverage:
        "API-created default record before publication; pre-migration null snapshot requires a separate SQL fixture",
    }),
  );
} catch (error) {
  console.error(
    `Inquiry form QA failed after ${checks} checks; local project=${projectId ?? "not created"}, run=${runId}`,
  );
  throw error;
}
