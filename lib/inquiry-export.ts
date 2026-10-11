import type { InquiryBoard, InquiryEntry, InquiryField } from "@/lib/inquiry";
import { entryStageFields, getProjectStages } from "@/lib/inquiry";
import { parseMaterials } from "@/lib/inquiry-materials";

export type InquiryExportFormat = "csv" | "xlsx" | "docx";
export const INQUIRY_EXPORT_MAX_ENTRIES = 500;
export const INQUIRY_EXPORT_MAX_TEXT = 2_000_000;
export class InquiryExportLimitError extends Error {}
/** Export is narrower than the discussion board: students download their own work only. */
export function isOwnInquiryExportEntry(
  entry: Pick<InquiryEntry, "ownerId" | "teamId"> & { stageId: string },
  profileId: string,
  teams: InquiryBoard["teams"],
) {
  if (entry.stageId === "reflection") return entry.ownerId === profileId;
  return teams.some(
    (team) => team.id === entry.teamId && team.memberIds.includes(profileId),
  );
}
type Cell = string | number;
type ExportField = {
  label: string;
  value: string;
  materials?: ReturnType<typeof parseMaterials>;
};
type ExportRecord = {
  id: string;
  title: string;
  team: string;
  owner: string;
  status: string;
  revision: number;
  version: number;
  updatedAt: string;
  instruction: string;
  fields: ExportField[];
  feedback: InquiryEntry["feedback"];
  fileName: string;
};
const encoder = new TextEncoder();
const statuses: Record<string, string> = {
  draft: "임시저장",
  submitted: "제출",
  revision: "보완 요청",
  approved: "교사 확인 완료",
};
const note =
  "현재 저장된 답변과 작성 당시 문항을 내보냅니다. 임시저장 여부를 확인하세요. 첨부파일은 파일명만 표시하며 원본 파일은 사이트에서 별도로 내려받으세요.";

/** Keep XML 1.0 characters, including Korean, emoji and newlines. */
export function inquiryExportXml(value: string) {
  return Array.from(value)
    .filter((char) => {
      const n = char.codePointAt(0)!;
      return (
        n === 9 ||
        n === 10 ||
        n === 13 ||
        (n >= 32 && n <= 0xd7ff) ||
        (n >= 0xe000 && n <= 0xfffd) ||
        (n >= 0x10000 && n <= 0x10ffff)
      );
    })
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** CSV has no cell types: prefix risky untrusted text before quoting it. */
export function inquiryCsvCell(value: Cell) {
  let text = String(value);
  if (
    typeof value === "string" &&
    (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))
  )
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function numeric(value: string): Cell {
  const trimmed = value.trim(),
    n = Number(trimmed);
  return /^\d+$/.test(trimmed) && Number.isSafeInteger(n) && n >= 0 ? n : value;
}
function cost(
  item: NonNullable<ExportField["materials"]>[number],
): number | null {
  const quantity = numeric(item.quantity),
    price = numeric(item.unitPrice),
    shipping = numeric(item.shipping);
  if (
    typeof quantity !== "number" ||
    typeof price !== "number" ||
    typeof shipping !== "number"
  )
    return null;
  const amount = quantity * price + shipping;
  return Number.isSafeInteger(amount) ? amount : null;
}
function totalCost(
  items: NonNullable<ExportField["materials"]>,
): number | null {
  let total = 0;
  for (const item of items) {
    const amount = cost(item);
    if (amount === null || !Number.isSafeInteger(total + amount)) return null;
    total += amount;
  }
  return total;
}
function fieldValue(field: InquiryField, entry: InquiryEntry): ExportField {
  const value = entry.answers[field.id] ?? "";
  return {
    label: field.label,
    value,
    ...(field.type === "materials" ? { materials: parseMaterials(value) } : {}),
  };
}
function records(board: InquiryBoard): ExportRecord[] {
  const stages = getProjectStages(board.project);
  return [...board.entries]
    .sort(
      (a, b) =>
        (a.teamId ?? "").localeCompare(b.teamId ?? "") ||
        stages.findIndex((s) => s.id === a.stageId) -
          stages.findIndex((s) => s.id === b.stageId) ||
        (a.ownerId ?? "").localeCompare(b.ownerId ?? "") ||
        a.id.localeCompare(b.id),
    )
    .map((entry) => ({
      id: entry.id,
      title:
        stages.find((stage) => stage.id === entry.stageId)?.title ??
        entry.stageId,
      team:
        board.teams.find((team) => team.id === entry.teamId)?.name ??
        "미지정 모둠",
      owner: entry.ownerId
        ? (board.people.find((person) => person.id === entry.ownerId)
            ?.displayName ?? "탈퇴/미확인 학생")
        : "모둠 공동 기록 (모둠장 제출)",
      status: statuses[entry.status] ?? entry.status,
      revision: entry.formRevision ?? 1,
      version: entry.version,
      updatedAt: entry.updatedAt,
      instruction: entry.instructionSnapshot ?? "",
      fields: entryStageFields(
        entry.stageId,
        board.project.stages.find((stage) => stage.id === entry.stageId),
        entry,
      ).map((field) => fieldValue(field, entry)),
      feedback: entry.feedback,
      fileName: entry.fileName ?? "",
    }));
}
function materialText(field: ExportField): string {
  if (!("materials" in field)) return field.value;
  if (!field.value) return "(미작성)";
  if (!field.materials)
    return "물품 표 형식이 올바르지 않습니다. 사이트에서 내용을 확인하세요.";
  if (!field.materials.length) return "신청할 물품 없음";
  const lines = field.materials.map(
    (item, index) =>
      `${index + 1}. ${item.name || "(물품명 미작성)"} | 규격: ${item.specification} | S2B: ${item.s2b}\n수량: ${item.quantity} / 단가: ${item.unitPrice}원 / 배송비: ${item.shipping}원 / 예상금액: ${cost(item) ?? "계산 불가"}원`,
  );
  const total = totalCost(field.materials);
  lines.push(
    `합계: ${total !== null ? total + "원" : "미완성 항목으로 계산 불가"} (배송비 포함 / 예산 200,000원)`,
  );
  return lines.join("\n");
}
function csvRows(projectTitle: string, entries: ExportRecord[]): Cell[][] {
  const rows: Cell[][] = [
    [
      "프로젝트",
      "기록 ID",
      "양식",
      "모둠",
      "작성 주체",
      "상태",
      "양식 판",
      "저장 버전",
      "마지막 저장 (ISO)",
      "구분",
      "문항/항목",
      "답변",
      "물품명/모델명",
      "규격",
      "S2B 물품번호",
      "수량",
      "단가 (원)",
      "배송비 (원)",
      "예상금액 (원)",
    ],
  ];
  rows.push([
    projectTitle,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "안내",
    "내보내기 범위",
    note,
  ]);
  for (const entry of entries) {
    const meta: Cell[] = [
      projectTitle,
      entry.id,
      entry.title,
      entry.team,
      entry.owner,
      entry.status,
      entry.revision,
      entry.version,
      entry.updatedAt,
    ];
    for (const field of entry.fields) {
      rows.push([...meta, "답변", field.label, materialText(field)]);
      field.materials?.forEach((item, index) =>
        rows.push([
          ...meta,
          "물품",
          `${field.label} · ${index + 1}`,
          "",
          item.name,
          item.specification,
          item.s2b,
          numeric(item.quantity),
          numeric(item.unitPrice),
          numeric(item.shipping),
          cost(item) ?? "계산 불가",
        ]),
      );
    }
    if (entry.instruction)
      rows.push([...meta, "안내", "작성 당시 활동 안내", entry.instruction]);
    for (const feedback of entry.feedback)
      rows.push([
        ...meta,
        "교사 피드백",
        `${feedback.authorName} · ${feedback.createdAt} · ${statuses[feedback.status]}`,
        feedback.text,
      ]);
    if (entry.fileName)
      rows.push([
        ...meta,
        "첨부파일",
        "파일명 (원본 별도 다운로드)",
        entry.fileName,
      ]);
  }
  return rows.map((row) => [
    ...row,
    ...Array<string>(Math.max(0, 19 - row.length)).fill(""),
  ]);
}

/** ZIP STORE writer with CRC32. No filesystem, compression dependency or external service. */
function zip(files: [string, string][]): Uint8Array<ArrayBuffer> {
  const chunks: Uint8Array[] = [],
    directory: Uint8Array[] = [];
  let offset = 0;
  for (const [path, content] of files) {
    const name = encoder.encode(path),
      data = encoder.encode(content);
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const header = new Uint8Array(30 + name.length),
      view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true);
    view.setUint16(12, 33, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);
    const central = new Uint8Array(46 + name.length),
      centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x800, true);
    centralView.setUint16(14, 33, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    chunks.push(header, data);
    directory.push(central);
    offset += header.length + data.length;
  }
  const size = directory.reduce((n, chunk) => n + chunk.length, 0),
    end = new Uint8Array(22),
    endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, size, true);
  endView.setUint32(16, offset, true);
  const output = new Uint8Array(offset + size + end.length);
  let cursor = 0;
  for (const chunk of [...chunks, ...directory, end]) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relationships =
  "http://schemas.openxmlformats.org/package/2006/relationships";
const officeRelationship =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
function column(index: number) {
  let name = "";
  for (let n = index + 1; n; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}
function worksheet(rows: Cell[][], widths: number[]) {
  return `${declaration}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, index) => `<c r="${column(index)}${rowIndex + 1}" s="${rowIndex ? 1 : 2}"${typeof value === "number" ? `><v>${value}</v>` : ` t="inlineStr"><is><t xml:space="preserve">${inquiryExportXml(value)}</t></is>`}</c>`).join("")}</row>`).join("")}</sheetData>${rows.length > 1 ? `<autoFilter ref="A1:${column(rows[0].length - 1)}${rows.length}"/>` : ""}</worksheet>`;
}
function xlsx(projectTitle: string, entries: ExportRecord[]) {
  const overview: Cell[][] = [
    [
      "기록 ID",
      "양식",
      "모둠",
      "작성 주체",
      "상태",
      "양식 판",
      "저장 버전",
      "마지막 저장 (ISO)",
      "첨부파일 (원본 별도)",
    ],
  ];
  const answers: Cell[][] = [
    ["기록 ID", "양식", "모둠 / 작성 주체", "문항 / 항목", "답변"],
  ];
  const materials: Cell[][] = [
    [
      "기록 ID",
      "모둠",
      "문항",
      "물품명/모델명",
      "규격",
      "S2B 물품번호",
      "수량",
      "단가 (원)",
      "배송비 (원)",
      "예상금액 (원)",
    ],
  ];
  const info: Cell[][] = [
    ["항목", "내용"],
    ["프로젝트", projectTitle],
    ["안내", note],
    [
      "표시 안내",
      "긴 답변은 답변 시트의 셀을 선택하여 전체 내용을 확인하거나 문서(DOCX)로 내려받으세요.",
    ],
    [
      "개인정보",
      "계정의 조회 권한에 해당하는 기록만 포함됩니다. 다운로드 파일을 외부에 공유할 때 주의하세요.",
    ],
  ];
  for (const entry of entries) {
    overview.push([
      entry.id,
      entry.title,
      entry.team,
      entry.owner,
      entry.status,
      entry.revision,
      entry.version,
      entry.updatedAt,
      entry.fileName,
    ]);
    const prefix = [entry.id, entry.title, `${entry.team} / ${entry.owner}`];
    for (const field of entry.fields) {
      answers.push([...prefix, field.label, materialText(field)]);
      field.materials?.forEach((item) =>
        materials.push([
          entry.id,
          entry.team,
          field.label,
          item.name,
          item.specification,
          item.s2b,
          numeric(item.quantity),
          numeric(item.unitPrice),
          numeric(item.shipping),
          cost(item) ?? "계산 불가",
        ]),
      );
      if (field.materials?.length) {
        materials.push([
          entry.id,
          entry.team,
          field.label,
          "합계 (배송비 포함)",
          "",
          "",
          "",
          "",
          "",
          totalCost(field.materials) ?? "미완성 항목으로 계산 불가",
        ]);
      }
    }
    if (entry.instruction)
      answers.push([...prefix, "작성 당시 활동 안내", entry.instruction]);
    for (const feedback of entry.feedback)
      answers.push([
        ...prefix,
        `교사 피드백 · ${feedback.authorName} · ${feedback.createdAt} · ${statuses[feedback.status]}`,
        feedback.text,
      ]);
  }
  const sheets = [
    { name: "안내", rows: info, widths: [25, 110] },
    {
      name: "기록 목록",
      rows: overview,
      widths: [39, 30, 24, 30, 20, 12, 12, 28, 40],
    },
    { name: "답변", rows: answers, widths: [39, 30, 32, 42, 100] },
    {
      name: "물품",
      rows: materials,
      widths: [39, 24, 32, 30, 20, 25, 10, 16, 16, 18],
    },
  ];
  return zip([
    [
      "[Content_Types].xml",
      `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ],
    [
      "_rels/.rels",
      `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationship}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `${declaration}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${officeRelationship}"><sheets>${sheets.map((sheet, i) => `<sheet name="${sheet.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `${declaration}<Relationships xmlns="${relationships}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${officeRelationship}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId5" Type="${officeRelationship}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "xl/styles.xml",
      `${declaration}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1" applyFont="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    ],
    ...sheets.map((sheet, i): [string, string] => [
      `xl/worksheets/sheet${i + 1}.xml`,
      worksheet(sheet.rows, sheet.widths),
    ]),
  ]);
}
function paragraph(text: string, style = "Normal", pageBreak = false) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(
      (line, index) =>
        `<w:p><w:pPr><w:pStyle w:val="${style}"/>${pageBreak && index === 0 ? "<w:pageBreakBefore/>" : ""}</w:pPr><w:r><w:t xml:space="preserve">${inquiryExportXml(line || " ")}</w:t></w:r></w:p>`,
    )
    .join("");
}
function docx(projectTitle: string, entries: ExportRecord[]) {
  let body =
    paragraph(projectTitle, "Title") +
    paragraph("탐구 프로젝트 기록") +
    paragraph(note);
  for (const [index, entry] of entries.entries()) {
    body += paragraph(entry.title, "Heading1", index > 0);
    body += paragraph(`${entry.team} · ${entry.owner}`);
    body += paragraph(
      `상태: ${entry.status} | 양식 ${entry.revision}판 | 저장 버전 ${entry.version}\n마지막 저장: ${entry.updatedAt}\n기록 ID: ${entry.id}`,
    );
    if (entry.instruction)
      body +=
        paragraph("작성 당시 활동 안내", "Heading2") +
        paragraph(entry.instruction);
    for (const field of entry.fields)
      body +=
        paragraph(field.label, "Heading2") +
        paragraph(materialText(field) || "(미작성)");
    if (entry.fileName)
      body +=
        paragraph("첨부파일 (원본 별도 다운로드)", "Heading2") +
        paragraph(entry.fileName);
    if (entry.feedback.length) body += paragraph("교사 피드백", "Heading2");
    for (const feedback of entry.feedback)
      body +=
        paragraph(
          `${feedback.authorName} · ${feedback.createdAt} · ${statuses[feedback.status]}`,
        ) + paragraph(feedback.text);
  }
  return zip([
    [
      "[Content_Types].xml",
      `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    ],
    [
      "_rels/.rels",
      `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationship}/officeDocument" Target="word/document.xml"/></Relationships>`,
    ],
    [
      "word/_rels/document.xml.rels",
      `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeRelationship}/styles" Target="styles.xml"/></Relationships>`,
    ],
    [
      "word/styles.xml",
      `${declaration}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/><w:wordWrap w:val="1"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`,
    ],
    [
      "word/document.xml",
      `${declaration}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`,
    ],
  ]);
}

/** Input MUST already be filtered by canReadInquiryEntry on the server. */
export function buildInquiryExport(
  board: InquiryBoard,
  format: InquiryExportFormat,
) {
  if (
    board.entries.length > INQUIRY_EXPORT_MAX_ENTRIES ||
    JSON.stringify(board).length > INQUIRY_EXPORT_MAX_TEXT
  )
    throw new InquiryExportLimitError(
      "다운로드 범위가 큽니다. 모둠 또는 양식을 선택하여 나누어 내려받으세요. 한 번에 최대 500건 / 텍스트 200만 자까지 가능합니다.",
    );
  const items = records(board);
  const body =
    format === "csv"
      ? encoder.encode(
          "\uFEFF" +
            csvRows(board.project.title, items)
              .map((row) => row.map(inquiryCsvCell).join(","))
              .join("\r\n") +
            "\r\n",
        )
      : format === "xlsx"
        ? xlsx(board.project.title, items)
        : docx(board.project.title, items);
  // Never split a surrogate pair while shortening Korean/emoji download names.
  const title = Array.from(board.project.title)
    .map((char) => {
      const point = char.codePointAt(0)!;
      return /[<>:"/\\|?*]/.test(char) ||
        point < 32 ||
        point === 127 ||
        (point >= 0xd800 && point <= 0xdfff)
        ? "_"
        : char;
    })
    .join("")
    .trim();
  const safeTitle = Array.from(title).slice(0, 70).join("") || "탐구 프로젝트";
  const filename = `${safeTitle}_기록.${format}`;
  return {
    body,
    filename,
    contentType:
      format === "csv"
        ? "text/csv; charset=utf-8"
        : format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    disposition: `attachment; filename="inquiry-records.${format}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
  };
}
