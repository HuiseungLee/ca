// node --experimental-strip-types scripts/qa-inquiry-validation.mjs
import assert from "node:assert/strict";
import {
  inquiryAnswerErrors,
  inquiryStages,
  entryStageFields,
  stageEntry,
  stageIds,
} from "../lib/inquiry.ts";

let checks = 0;
function check(actual, expected) {
  assert.deepEqual(actual, expected);
  checks++;
}
const defaults = inquiryStages[0].fields;
const answers = { claim: "cxzvzc", links: "xvzcxv", context: "zcxvzcvx" };
check(Object.keys(inquiryAnswerErrors(defaults, answers)), ["links"]);
assert.match(
  inquiryAnswerErrors(defaults, answers).links,
  /http:\/\/.*https:\/\//,
);
checks++;
check(answers.links, "xvzcxv"); // Validation never discards typed answers.
check(
  inquiryAnswerErrors(defaults, {
    ...answers,
    links: "https://example.test/article",
  }),
  {},
);
check(Object.keys(inquiryAnswerErrors(defaults, {})), [
  "claim",
  "links",
  "context",
]);
for (const links of [
  "javascript:alert(1)",
  "ftp://example.test",
  "https://example.test\nnot a link",
  Array(21).fill("https://example.test").join("\n"),
]) {
  check(Object.keys(inquiryAnswerErrors(defaults, { ...answers, links })), [
    "links",
  ]);
}
check(
  inquiryAnswerErrors(defaults, {
    ...answers,
    links: " https://example.test/a \r\n\nhttp://example.test/b ",
  }),
  {},
);
const custom = [
  {
    id: "custom_link",
    label: "추가 자료",
    type: "url",
    required: false,
    placeholder: "",
  },
  {
    id: "choice",
    label: "판단",
    type: "select",
    required: true,
    placeholder: "",
    options: ["사실", "근거 부족"],
  },
  {
    id: "links",
    label: "링크와 무관한 자유 질문",
    type: "long_text",
    required: false,
    placeholder: "",
  },
];
check(
  inquiryAnswerErrors(custom, { choice: "사실", links: "일반적인 글" }),
  {},
);
check(
  Object.keys(
    inquiryAnswerErrors(custom, { choice: "다른 항목", custom_link: "text" }),
  ),
  ["custom_link", "choice"],
);
const record = {
  id: "r",
  teamId: "team-a",
  stageId: "sources",
  fieldSnapshot: defaults,
  answers,
};
check(entryStageFields("sources", { fields: custom }, record), defaults);
check(
  entryStageFields("sources", { fields: custom }, { fieldSnapshot: [] }),
  defaults,
);
check(stageEntry([record], "sources", "team-b"), undefined);
for (const [index, stage] of stageIds.entries()) {
  check(stageIds.slice(0, index).length, index);
  check(stageIds.slice(0, index).includes(stage), false);
}
console.log(
  JSON.stringify({
    passed: checks,
    coverage:
      "Screenshot URL failure, valid URLs, custom questions, preserved input/snapshots and stage reference boundaries",
  }),
);
