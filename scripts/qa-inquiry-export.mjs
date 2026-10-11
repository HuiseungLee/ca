// node --experimental-strip-types scripts/qa-inquiry-export.mjs
// Optional real-reader checks: --python <Python with openpyxl and python-docx>
// Optional API checks: --integration (local synthetic fixture on 5190/5191 only).
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (["@/lib/inquiry", "@/lib/inquiry-materials"].includes(specifier)) {
      return nextResolve(
        new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    }
    return nextResolve(specifier, context);
  },
});
const {
  buildInquiryExport,
  inquiryCsvCell,
  inquiryExportXml,
  InquiryExportLimitError,
  isOwnInquiryExportEntry,
} = await import("../lib/inquiry-export.ts");
const { defaultStageSettings, publishedStageFields } = await import(
  "../lib/inquiry.ts"
);
let checks = 0;
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
function ok(actual, label) {
  assert.ok(actual, label);
  checks++;
}
function throws(fn, error) {
  assert.throws(fn, error);
  checks++;
}
const field = (id, label, type = "long_text") => ({
  id,
  label,
  type,
  required: true,
  placeholder: "",
});
const project = {
  id: "export-test",
  title: "융합 탐구 & 과학 <검증> 🧪",
  description: "합성 테스트",
  status: "open",
  applicantIds: ["student", "other"],
  selectedIds: ["student", "other"],
  template: "fusion",
  archived: false,
  stages: defaultStageSettings("fusion").map((stage) => ({
    ...stage,
    fields: [field("replacement", "새 문항 - 내보내기에 없어야 함")],
    released: true,
  })),
};
const shared = {
  id: "plan-own",
  projectId: project.id,
  teamId: "team-own",
  ownerId: null,
  stageId: "plan",
  answers: {
    original:
      '=HYPERLINK("https://example.test","실행 금지")\n한국어, 쉼표 "인용" & <태그> 🧪',
    obsolete: "문항에 없는 비공개 값",
  },
  fieldSnapshot: [field("original", "작성 당시 질문")],
  formRevision: 3,
  instructionSnapshot: "작성 당시 안내 & <주의>",
  status: "approved",
  version: 4,
  fileName: "실험 보고서 & 참고.png",
  updatedAt: "2026-10-10T00:00:00.000Z",
  feedback: [
    {
      text: "근거를 보강하세요 & <확인>",
      authorName: "합성 교사",
      createdAt: "2026-10-10T01:00:00.000Z",
      status: "approved",
    },
  ],
};
const materials = {
  ...shared,
  id: "materials-own",
  stageId: "materials",
  fieldSnapshot: [field("items", "물품 신청 표", "materials")],
  answers: {
    items: JSON.stringify([
      {
        name: "=SUM(1,2)",
        specification: "500g",
        s2b: "001234567890123456",
        quantity: "2",
        unitPrice: "10000",
        shipping: "3000",
        total: 999999,
      },
    ]),
  },
};
const reflection = {
  ...shared,
  id: "reflection-own",
  stageId: "reflection",
  ownerId: "student",
  answers: { original: "본인 성찰" },
};
const board = {
  project,
  entries: [shared, materials, reflection],
  comments: [],
  teams: [
    {
      id: "team-own",
      projectId: project.id,
      name: "한글 모둠",
      memberIds: ["student", "other"],
      representativeId: "student",
    },
  ],
  people: [{ id: "student", displayName: "합성 학생", career: "과학" }],
};

for (const value of [
  "=1+1",
  "+SUM(A1)",
  "-2+3",
  "@SUM(A1)",
  " \t=1",
  "\uFEFF=1",
  "\t평문",
  "\r평문",
  "\n평문",
]) {
  ok(
    inquiryCsvCell(value).startsWith("\"'"),
    "CSV formula-like text receives a literal apostrophe",
  );
}
equal(inquiryCsvCell('한국어, "인용"'), '"한국어, ""인용"""');
equal(inquiryCsvCell(23000), '"23000"');
equal(
  inquiryExportXml("한글 🧪 <&>\"'\u0000\u0001\ud800\ufffe"),
  "한글 🧪 &lt;&amp;&gt;&quot;&apos;",
);
equal(inquiryExportXml("줄1\n줄2\t탭\r"), "줄1\n줄2\t탭\r");
equal(isOwnInquiryExportEntry(shared, "student", board.teams), true);
equal(isOwnInquiryExportEntry(shared, "outsider", board.teams), false);
equal(
  isOwnInquiryExportEntry(
    { ...shared, teamId: "foreign" },
    "student",
    board.teams,
  ),
  false,
);
equal(isOwnInquiryExportEntry(reflection, "student", board.teams), true);
equal(isOwnInquiryExportEntry(reflection, "other", board.teams), false);
equal(
  isOwnInquiryExportEntry(
    { ...reflection, teamId: null },
    "student",
    board.teams,
  ),
  true,
);

const exports = Object.fromEntries(
  ["csv", "xlsx", "docx"].map((format) => [
    format,
    buildInquiryExport(board, format),
  ]),
);
const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
  exports.csv.body,
);
ok(
  csv.startsWith("\uFEFF"),
  "CSV starts with UTF-8 BOM for Excel Korean decoding",
);
ok(csv.includes("작성 당시 질문"));
ok(!csv.includes("새 문항 - 내보내기에 없어야 함"));
ok(!csv.includes("문항에 없는 비공개 값"));
ok(csv.includes("合成") === false);
ok(csv.includes('"\'=HYPERLINK(""https://example.test""'));
ok(
  csv.includes('"001234567890123456"'),
  "S2B identifier keeps leading zeros in source CSV",
);
ok(csv.includes('"23000"'));
ok(csv.includes("합계: 23000원"));
ok(csv.includes("근거를 보강하세요 & <확인>"));
ok(csv.includes("작성 당시 안내 & <주의>"));
ok(csv.includes("실험 보고서 & 참고.png"));
ok(csv.endsWith("\r\n"));

// Independently check ZIP offsets, member names, lengths and CRC32.
function readZip(bytes) {
  const data = Buffer.from(bytes),
    files = new Map();
  const eocd = data.length - 22;
  equal(data.readUInt32LE(eocd), 0x06054b50, "ZIP end signature");
  const count = data.readUInt16LE(eocd + 10),
    directorySize = data.readUInt32LE(eocd + 12),
    directoryOffset = data.readUInt32LE(eocd + 16);
  equal(directoryOffset + directorySize, eocd, "Directory ends at EOCD");
  let cursor = directoryOffset;
  for (let index = 0; index < count; index++) {
    equal(data.readUInt32LE(cursor), 0x02014b50);
    const nameLength = data.readUInt16LE(cursor + 28),
      extraLength = data.readUInt16LE(cursor + 30),
      commentLength = data.readUInt16LE(cursor + 32);
    const name = data
        .subarray(cursor + 46, cursor + 46 + nameLength)
        .toString("utf8"),
      offset = data.readUInt32LE(cursor + 42);
    equal(data.readUInt32LE(offset), 0x04034b50);
    equal(data.readUInt16LE(offset + 8), 0, "STORE compression");
    const length = data.readUInt32LE(offset + 22),
      localNameLength = data.readUInt16LE(offset + 26),
      localExtraLength = data.readUInt16LE(offset + 28);
    equal(
      data
        .subarray(offset + 30, offset + 30 + localNameLength)
        .toString("utf8"),
      name,
    );
    const body = data.subarray(
      offset + 30 + localNameLength + localExtraLength,
      offset + 30 + localNameLength + localExtraLength + length,
    );
    equal(body.length, length);
    equal(data.readUInt32LE(cursor + 24), length);
    let crc = 0xffffffff;
    for (const byte of body) {
      let v = (crc ^ byte) & 255;
      for (let bit = 0; bit < 8; bit++)
        v = v & 1 ? (v >>> 1) ^ 0xedb88320 : v >>> 1;
      crc = (crc >>> 8) ^ v;
    }
    equal((crc ^ 0xffffffff) >>> 0, data.readUInt32LE(offset + 14));
    equal(data.readUInt32LE(cursor + 16), data.readUInt32LE(offset + 14));
    ok(!files.has(name), "No duplicate ZIP members");
    files.set(name, body.toString("utf8"));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  equal(cursor, eocd);
  return files;
}
const xlsx = readZip(exports.xlsx.body),
  docx = readZip(exports.docx.body);
equal(
  [...xlsx.keys()].sort(),
  [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/workbook.xml",
    ...[1, 2, 3, 4].map((n) => `xl/worksheets/sheet${n}.xml`),
  ].sort(),
);
equal(docx.size, 5);
const workbook = [...xlsx.values()].join("\n"),
  document = docx.get("word/document.xml");
ok(workbook.includes("작성 당시 질문"));
ok(workbook.includes('t="inlineStr"><is><t xml:space="preserve">=HYPERLINK('));
ok(!workbook.includes("<f>"), "No spreadsheet formulas from student input");
ok(workbook.includes(">001234567890123456</t>"));
ok(workbook.includes("><v>23000</v>"));
ok(!workbook.includes("새 문항 - 내보내기에 없어야 함"));
ok(document.includes("한국어, 쉼표 &quot;인용&quot; &amp; &lt;태그&gt; 🧪"));
ok(document.includes("작성 당시 질문"));
ok(document.includes("근거를 보강하세요 &amp; &lt;확인&gt;"));
equal(
  (document.match(/<w:pageBreakBefore\/>/g) ?? []).length,
  board.entries.length - 1,
  "No unnecessary cover page",
);
ok(
  !readZip(buildInquiryExport({ ...board, entries: [shared] }, "docx").body)
    .get("word/document.xml")
    .includes("<w:pageBreakBefore/>"),
);
for (const [format, item] of Object.entries(exports)) {
  ok(item.filename.endsWith(`.${format}`));
  ok(item.disposition.includes(`filename="inquiry-records.${format}"`));
  ok(!/[\r\n]/.test(item.disposition));
  equal(
    decodeURIComponent(item.disposition.split("filename*=UTF-8''")[1]),
    item.filename,
  );
}
const longName = buildInquiryExport(
  {
    ...board,
    project: { ...project, title: `${"한".repeat(69)}🧪x\ud800\r\n/:` },
  },
  "docx",
);
ok(
  longName.filename.endsWith("🧪_기록.docx"),
  "Truncating filenames preserves emoji pairs",
);
ok(
  !/[<>:"/\\|?*]/.test(
    buildInquiryExport(
      { ...board, project: { ...project, title: 'a<>:"/\\|?*b\ud800' } },
      "csv",
    ).filename,
  ),
);
const invalid = buildInquiryExport(
  { ...board, entries: [{ ...materials, answers: { items: "not-json" } }] },
  "csv",
);
ok(
  new TextDecoder()
    .decode(invalid.body)
    .includes("물품 표 형식이 올바르지 않습니다"),
);
const empty = buildInquiryExport(
  { ...board, entries: [{ ...materials, answers: { items: "[]" } }] },
  "csv",
);
ok(new TextDecoder().decode(empty.body).includes("신청할 물품 없음"));
throws(
  () =>
    buildInquiryExport({ ...board, entries: Array(501).fill(shared) }, "csv"),
  InquiryExportLimitError,
);
throws(
  () =>
    buildInquiryExport(
      { ...board, project: { ...project, description: "x".repeat(2_000_001) } },
      "docx",
    ),
  InquiryExportLimitError,
);

const pythonIndex = process.argv.indexOf("--python");
if (pythonIndex !== -1) {
  const executable = process.argv[pythonIndex + 1];
  ok(!!executable, "Python path required after --python");
  const result = spawnSync(
    executable,
    [fileURLToPath(new URL("./qa-inquiry-export-readers.py", import.meta.url))],
    {
      input: JSON.stringify(
        Object.fromEntries(
          Object.entries(exports).map(([key, value]) => [
            key,
            Buffer.from(value.body).toString("base64"),
          ]),
        ),
      ),
      encoding: "utf8",
      timeout: 30_000,
    },
  );
  equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  checks += report.passed;
  console.log(JSON.stringify(report));
}

if (process.argv.includes("--integration")) await integration();
console.log(
  JSON.stringify({
    passed: checks,
    coverage:
      "DOCX/XLSX ZIP CRC and package structure, original questions, Korean/emoji/XML, materials costs, safe CSV text, privacy scope, download names and limits",
  }),
);

async function integration() {
  const base = new URL("http://127.0.0.1:5190"),
    run = randomUUID().slice(0, 8);
  const projectIds = [];
  const completedProjects = new Set();
  async function request(path, who, body, expected = 200, binary = false) {
    const url = new URL(path, base);
    equal(url.origin, base.origin, "Never use production data for QA");
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        ...(who ? { Authorization: `Bearer local-qa-${who}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const detail =
      response.status === expected ? "" : await response.clone().text();
    equal(
      response.status,
      expected,
      `${who ?? "anonymous"}: ${path}: ${detail}`,
    );
    if (binary && response.ok) {
      ok(response.headers.get("cache-control")?.includes("no-store"));
      equal(response.headers.get("x-content-type-options"), "nosniff");
      ok(
        response.headers.get("content-disposition")?.startsWith("attachment;"),
      );
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        type: response.headers.get("content-type"),
      };
    }
    return response.json();
  }
  const act = (who, body, expected) =>
    request("/api/inquiry", who, body, expected);
  const read = async (id, who = "teacher") =>
    (await request(`/api/inquiry?projectId=${id}`, who)).board;
  try {
    for (const who of ["teacher", "student", "other", "peer", "outsider"])
      await request("/api/auth/session", who);
    for (const template of ["fusion", "factcheck"]) {
      let current = (
        await act(
          "teacher",
          {
            action: "create",
            template,
            title: `QA export ${template} ${run}`,
            description: "Synthetic export privacy QA",
          },
          201,
        )
      ).board;
      const id = current.project.id;
      projectIds.push(id);
      if (template === "fusion")
        await act("teacher", {
          action: "release",
          projectId: id,
          phase: "applications",
          released: true,
        });
      for (const who of ["student", "other", "peer"])
        await act(who, { action: "apply", projectId: id });
      await act("teacher", {
        action: "select",
        projectId: id,
        selectedIds: ["qa-student", "qa-other", "qa-peer"],
      });
      await act("teacher", {
        action: "team",
        projectId: id,
        name: "Own team",
        memberIds: ["qa-student", "qa-other"],
        representativeId: "qa-student",
      });
      current = (
        await act("teacher", {
          action: "team",
          projectId: id,
          name: "Foreign team",
          memberIds: ["qa-peer"],
          representativeId: "qa-peer",
        })
      ).board;
      const stage = current.project.stages[0];
      const entries = {};
      for (const who of ["student", "peer"]) {
        const team = current.teams.find((item) =>
          item.memberIds.includes(`qa-${who}`),
        );
        const marker = who === "student" ? `OWN_${run}` : `FOREIGN_${run}`;
        const answers = Object.fromEntries(
          publishedStageFields(stage.id, stage).map((item) => [
            item.id,
            item.type === "url" || item.id === "links"
              ? `https://example.test/${marker}`
              : item.type === "select"
                ? item.options[0]
                : marker,
          ]),
        );
        const saved = (
          await act(who, {
            action: "save",
            projectId: id,
            teamId: team.id,
            stageId: stage.id,
            answers,
            status: "submitted",
            version: 0,
            formRevision: stage.revision ?? 1,
          })
        ).board;
        entries[who] = saved.entries.find(
          (item) => item.teamId === team.id && item.stageId === stage.id,
        );
      }
      const prefix = `/api/inquiry/export?projectId=${id}`;
      for (const format of ["csv", "xlsx", "docx"]) {
        const result = await request(
          `${prefix}&format=${format}`,
          "student",
          undefined,
          200,
          true,
        );
        const text =
          format === "csv"
            ? new TextDecoder().decode(result.bytes)
            : [...readZip(result.bytes).values()].join("\n");
        ok(text.includes(`OWN_${run}`));
        ok(
          !text.includes(`FOREIGN_${run}`),
          `${template}: student bulk export is own team only`,
        );
        ok(
          result.type.includes(
            format === "csv"
              ? "text/csv"
              : format === "xlsx"
                ? "spreadsheetml"
                : "wordprocessingml",
          ),
        );
      }
      const teacherExport = await request(
        `${prefix}&format=csv`,
        "teacher",
        undefined,
        200,
        true,
      );
      ok(
        new TextDecoder()
          .decode(teacherExport.bytes)
          .includes(`FOREIGN_${run}`),
        "Teacher can export all teams",
      );
      const memberExport = await request(
        `${prefix}&format=csv`,
        "other",
        undefined,
        200,
        true,
      );
      ok(
        new TextDecoder().decode(memberExport.bytes).includes(`OWN_${run}`),
        "Ordinary own-team member can export shared form",
      );
      await request(
        `${prefix}&format=csv&entryId=${entries.peer.id}`,
        "student",
        undefined,
        403,
      );
      await request(
        `${prefix}&format=csv&teamId=${entries.peer.teamId}`,
        "student",
        undefined,
        403,
      );
      await request(`${prefix}&format=csv`, "outsider", undefined, 403);
      await request(`${prefix}&format=csv`, undefined, undefined, 401);
      await request(`${prefix}&format=hwp`, "teacher", undefined, 400);
      await request(
        `${prefix}&format=csv&entryId=not-a-record`,
        "teacher",
        undefined,
        404,
      );
      await request(
        `${prefix}&format=csv&stageId=reflection`,
        "student",
        undefined,
        404,
      );
      const ownSingle = await request(
        `${prefix}&format=csv&entryId=${entries.student.id}`,
        "student",
        undefined,
        200,
        true,
      );
      ok(new TextDecoder().decode(ownSingle.bytes).includes(`OWN_${run}`));
      if (template === "fusion") {
        current = await read(id);
        const ownTeam = current.teams.find((team) =>
          team.memberIds.includes("qa-student"),
        );
        const materialStage = current.project.stages.find(
          (item) => item.id === "materials",
        );
        const filled = (setting, marker) =>
          Object.fromEntries(
            publishedStageFields(setting.id, setting).map((question) => [
              question.id,
              question.type === "materials"
                ? "[]"
                : question.type === "select"
                  ? question.options[0]
                  : question.type === "url"
                    ? `https://example.test/${marker}`
                    : marker,
            ]),
          );
        await act("student", {
          action: "save",
          projectId: id,
          teamId: ownTeam.id,
          stageId: "materials",
          answers: filled(materialStage, `MATERIAL_${run}`),
          status: "submitted",
          version: 0,
          formRevision: materialStage.revision ?? 1,
        });
        current = await read(id);
        for (const item of current.entries.filter(
          (record) => record.teamId === ownTeam.id,
        )) {
          await act("teacher", {
            action: "review",
            projectId: id,
            entryId: item.id,
            version: item.version,
            status: "approved",
            text: `교사 확인 ${run}`,
          });
        }
        await act("teacher", {
          action: "release",
          projectId: id,
          phase: "outcomes",
          released: true,
        });
        const personalEntries = {};
        for (const who of ["student", "other"]) {
          const setting = current.project.stages.find(
            (item) => item.id === "reflection",
          );
          const saved = (
            await act(who, {
              action: "save",
              projectId: id,
              stageId: "reflection",
              answers: filled(setting, `REFLECT_${who}_${run}`),
              status: "submitted",
              version: 0,
              formRevision: setting.revision ?? 1,
            })
          ).board;
          personalEntries[who] = saved.entries.find(
            (item) =>
              item.stageId === "reflection" && item.ownerId === `qa-${who}`,
          );
        }
        const reportSetting = current.project.stages.find(
          (item) => item.id === "report",
        );
        await act("student", {
          action: "save",
          projectId: id,
          teamId: ownTeam.id,
          stageId: "report",
          answers: filled(reportSetting, `REPORT_${run}`),
          status: "submitted",
          version: 0,
          formRevision: reportSetting.revision ?? 1,
        });
        for (const who of ["student", "other"]) {
          for (const format of ["csv", "xlsx", "docx"]) {
            const own = await request(
              `${prefix}&format=${format}`,
              who,
              undefined,
              200,
              true,
            );
            const text =
              format === "csv"
                ? new TextDecoder().decode(own.bytes)
                : [...readZip(own.bytes).values()].join("\n");
            ok(
              text.includes(`REFLECT_${who}_${run}`),
              "Own individual reflection is exported",
            );
            ok(text.includes(`REPORT_${run}`), "Shared report is exported");
            ok(
              text.includes(`MATERIAL_${run}`),
              "Shared materials request is exported",
            );
            ok(
              text.includes(`교사 확인 ${run}`),
              "Teacher feedback is included",
            );
            ok(
              !text.includes(
                `REFLECT_${who === "student" ? "other" : "student"}_${run}`,
              ),
              "Same-team member's private reflection is excluded",
            );
          }
          await request(
            `${prefix}&format=csv&entryId=${personalEntries[who === "student" ? "other" : "student"].id}`,
            who,
            undefined,
            403,
          );
          await request(
            `${prefix}&format=docx&entryId=${personalEntries[who].id}`,
            who,
            undefined,
            200,
            true,
          );
        }
        const allReflections = await request(
          `${prefix}&format=csv&stageId=reflection`,
          "teacher",
          undefined,
          200,
          true,
        );
        const text = new TextDecoder().decode(allReflections.bytes);
        ok(
          text.includes(`REFLECT_student_${run}`) &&
            text.includes(`REFLECT_other_${run}`),
          "Teacher can export every individual reflection",
        );
        await act("teacher", {
          action: "release",
          projectId: id,
          phase: "applications",
          released: false,
        });
        await request(`${prefix}&format=docx`, "student", undefined, 200, true);
      }
      completedProjects.add(id);
    }
  } finally {
    for (const id of projectIds) {
      const current = await read(id);
      await act("teacher", {
        action: "update",
        projectId: id,
        title: current.project.title,
        description: current.project.description,
        status: current.project.status,
        stages: current.project.stages,
        archived: true,
      });
      if (completedProjects.has(id))
        await request(
          `/api/inquiry/export?projectId=${id}&format=csv`,
          "student",
          undefined,
          200,
          true,
        );
    }
  }
}
