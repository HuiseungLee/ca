"use client";

import { useId, useState } from "react";
import { BookOpen, ExternalLink, Paperclip } from "lucide-react";
import {
  entryStageFields,
  entryStatusLabels,
  inquiryStages,
  stageEntry,
  stageIds,
  type InquiryBoard,
  type InquiryTeam,
  type StageId,
} from "@/lib/inquiry";
import "./inquiry-reference-panel.css";

export function InquiryReferencePanel({
  board,
  team,
  stageId,
  ownerId,
}: {
  board: InquiryBoard;
  team: InquiryTeam;
  stageId: StageId;
  ownerId: string;
}) {
  const previous = stageIds.slice(0, stageIds.indexOf(stageId));
  const [selected, setSelected] = useState<StageId>(
    previous.at(-1) || "sources",
  );
  const selectId = useId();
  if (!previous.length) return null;
  const stage = inquiryStages.find((item) => item.id === selected)!;
  const record = stageEntry(board.entries, selected, team.id, ownerId);
  const fields = entryStageFields(
    selected,
    board.project.stages.find((item) => item.id === selected),
    record,
  );
  return (
    <section className="iw-reference-panel" aria-label="이전 단계 기록 참고">
      <div className="iw-reference-heading">
        <BookOpen size={19} />
        <h3>이전 기록 보며 작성하기</h3>
      </div>
      <p className="iw-reference-intro">
        {team.name}의 기록입니다. 단계를 바꾸어도 작성 중인 답변은 그대로
        유지됩니다.
      </p>
      <label htmlFor={selectId}>참고할 이전 단계</label>
      <select
        id={selectId}
        value={selected}
        onChange={(event) => setSelected(event.target.value as StageId)}
      >
        {previous.map((id, index) => (
          <option key={id} value={id}>
            {index + 1}. {inquiryStages.find((item) => item.id === id)!.title}
          </option>
        ))}
      </select>
      <div className="iw-reference-summary">
        <b>{stage.title}</b>
        <span>{record ? entryStatusLabels[record.status] : "기록 없음"}</span>
      </div>
      <div
        className="iw-reference-body"
        role="region"
        aria-label={`${stage.title} 참고 내용`}
        tabIndex={0}
      >
        {record ? (
          <>
            {record.status === "draft" && (
              <p className="iw-reference-draft">
                아직 제출하지 않은 임시저장 기록입니다.
              </p>
            )}
            {fields.map((field) => {
              const text = record.answers[field.id] || "";
              const links = [
                ...new Set(text.match(/https?:\/\/[^\s<>"']+/g) || []),
              ]
                .filter((link) => {
                  try {
                    return ["http:", "https:"].includes(new URL(link).protocol);
                  } catch {
                    return false;
                  }
                })
                .slice(0, 20);
              return (
                <article key={field.id}>
                  <h4>{field.label}</h4>
                  <p>{text || "작성 내용 없음"}</p>
                  {links.length > 0 && (
                    <div className="iw-reference-links">
                      {links.map((link, index) => (
                        <a
                          href={link}
                          key={link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={13} />
                          출처 {index + 1} 열기
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
            {record.fileName && (
              <a
                className="iw-reference-file"
                href={`/api/inquiry/files?entryId=${encodeURIComponent(record.id)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Paperclip size={15} />
                {record.fileName}
              </a>
            )}
          </>
        ) : (
          <p className="iw-reference-empty">
            이 단계에서 조회할 수 있는 기록이 아직 없습니다. 앞 단계에서
            임시저장하거나 제출한 내용을 이곳에서 확인할 수 있습니다.
          </p>
        )}
      </div>
      <small>참고용으로 표시됩니다. 수정은 해당 단계에서 해주세요.</small>
    </section>
  );
}
