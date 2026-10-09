"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ClipboardList,
  Eye,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InquiryMaterialsField } from "@/components/inquiry-materials-field";
import {
  inquiryFieldType,
  getProjectStages,
  publishedStageFields,
  type InquiryAction,
  type InquiryBoard,
  type InquiryField,
  type StageId,
} from "@/lib/inquiry";
import "./inquiry-form-editor.css";

type PublishAction = Extract<InquiryAction, { action: "publish_form" }>;
type DraftField = InquiryField & { choicesText: string };
type FieldType = NonNullable<InquiryField["type"]>;
const typeLabels: Record<FieldType, string> = {
  short_text: "짧은 글",
  long_text: "긴 글",
  select: "선택형",
  url: "링크",
  materials: "물품 신청 표 (20만 원 이내)",
};

function draftFields(fields: InquiryField[]): DraftField[] {
  return fields.map((field) => ({
    ...field,
    type: inquiryFieldType(field),
    options: field.options ? [...field.options] : undefined,
    choicesText: (field.options || []).join("\n"),
  }));
}

function cleanOptions(text: string) {
  return text
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean);
}

function dateLabel(value?: string) {
  if (!value) return "기본 활동지 준비됨";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "배포됨"
    : `${date.toLocaleDateString("ko-KR")} ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 배포`;
}

export function InquiryFormEditor({
  board,
  busy,
  onPublish,
  onDirty,
  initialStageId,
}: {
  board: InquiryBoard;
  busy: boolean;
  onPublish: (action: PublishAction) => Promise<InquiryBoard | null>;
  onDirty: (value: boolean) => void;
  initialStageId?: StageId;
}) {
  const inquiryStages = getProjectStages(board.project);
  const initial =
    inquiryStages.find((stage) => stage.id === initialStageId)?.id ||
    inquiryStages[0].id;
  const [stageId, setStageId] = useState<StageId>(initial);
  const stage = inquiryStages.find((item) => item.id === stageId)!;
  const setting = board.project.stages.find((item) => item.id === stageId);
  const [fields, setFields] = useState<DraftField[]>(() =>
    draftFields(
      publishedStageFields(
        initial,
        board.project.stages.find((item) => item.id === initial),
      ),
    ),
  );
  const [revision, setRevision] = useState(
    () =>
      board.project.stages.find((item) => item.id === initial)?.revision ?? 1,
  );
  const [baseline, setBaseline] = useState(() => JSON.stringify(fields));
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const editRegion = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(fields) !== baseline;
  const locked = busy || publishing || board.project.archived;
  const serverRevision = setting?.revision ?? 1;
  const isNewer = serverRevision !== revision;
  const started = board.entries.filter(
    (entry) => entry.stageId === stageId,
  ).length;

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  // Adopt a newer published form before rendering only when no local draft exists.
  // Keeping the draft's original revision lets the server reject conflicts safely.
  if (!dirty && !publishing && serverRevision > revision) {
    const current = draftFields(publishedStageFields(stageId, setting));
    setFields(current);
    setBaseline(JSON.stringify(current));
    setRevision(serverRevision);
  }

  function chooseStage(next: StageId) {
    if (busy || publishing || next === stageId) return;
    if (
      dirty &&
      !window.confirm(
        "아직 배포하지 않은 문항 변경이 있습니다. 변경 내용을 저장하지 않고 다른 단계로 이동할까요?",
      )
    )
      return;
    const nextSetting = board.project.stages.find((item) => item.id === next);
    const nextFields = draftFields(publishedStageFields(next, nextSetting));
    setStageId(next);
    setFields(nextFields);
    setBaseline(JSON.stringify(nextFields));
    setRevision(nextSetting?.revision ?? 1);
    setError("");
    setNotice("");
    onDirty(false);
  }

  function updateField(id: string, patch: Partial<DraftField>) {
    setFields((current) =>
      current.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    );
    setNotice("");
    setError("");
  }

  function changeType(id: string, type: FieldType) {
    setFields((current) =>
      current.map((field) =>
        field.id === id
          ? {
              ...field,
              type,
              choicesText:
                type === "select" && !field.choicesText
                  ? "선택지 1\n선택지 2"
                  : field.choicesText,
            }
          : field,
      ),
    );
    setNotice("");
    setError("");
  }

  function addField() {
    if (locked || fields.length >= 20) return;
    const id = `q_${crypto.randomUUID().replace(/-/g, "")}`;
    setFields((current) => [
      ...current,
      {
        id,
        label: "",
        placeholder: "",
        required: false,
        type: "long_text",
        choicesText: "",
      },
    ]);
    setNotice("새 문항을 추가했습니다. 질문을 입력해 주세요.");
    setError("");
    requestAnimationFrame(() => {
      editRegion.current
        ?.querySelector<HTMLInputElement>(`[data-question-label="${id}"]`)
        ?.focus();
    });
  }

  function removeField(field: DraftField) {
    if (locked || fields.length <= 1) return;
    if (
      !window.confirm(
        `‘${field.label.trim() || "새 문항"}’ 문항을 이 활동지에서 삭제할까요? 이미 시작한 학생 기록의 문항과 답변은 유지됩니다.`,
      )
    )
      return;
    setFields((current) => current.filter((item) => item.id !== field.id));
    setNotice(
      "편집 중인 활동지에서 문항을 삭제했습니다. 저장·배포하면 반영됩니다.",
    );
    setError("");
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (locked || target < 0 || target >= fields.length) return;
    setFields((current) => {
      const result = [...current];
      [result[index], result[target]] = [result[target], result[index]];
      return result;
    });
    setNotice(`${index + 1}번 문항을 ${target + 1}번으로 이동했습니다.`);
    setError("");
  }

  async function publish() {
    if (locked) return;
    setError("");
    setNotice("");
    if (fields.length < 1 || fields.length > 20) {
      setError("활동지에는 문항을 1개 이상, 20개 이하로 구성해 주세요.");
      return;
    }
    for (const [index, field] of fields.entries()) {
      if (!field.label.trim()) {
        setError(`${index + 1}번 문항의 질문을 입력해 주세요.`);
        editRegion.current
          ?.querySelector<HTMLInputElement>(
            `[data-question-label="${field.id}"]`,
          )
          ?.focus();
        return;
      }
      if (inquiryFieldType(field) === "select") {
        const options = cleanOptions(field.choicesText);
        if (options.length < 1 || options.length > 20) {
          setError(
            `${index + 1}번 문항의 선택지를 한 줄에 하나씩, 1개 이상 20개 이하로 입력해 주세요.`,
          );
          return;
        }
        if (new Set(options).size !== options.length) {
          setError(
            `${index + 1}번 문항에 같은 선택지가 반복됩니다. 선택지를 서로 다르게 작성해 주세요.`,
          );
          return;
        }
        if (options.some((option) => option.length > 300)) {
          setError(
            `${index + 1}번 문항의 선택지는 각각 300자 이하로 작성해 주세요.`,
          );
          return;
        }
      }
    }
    const nextFields: InquiryField[] = fields.map((field) => ({
      id: field.id,
      label: field.label.trim(),
      placeholder: field.placeholder.trim(),
      required: field.required,
      type: inquiryFieldType(field),
      ...(inquiryFieldType(field) === "select"
        ? { options: cleanOptions(field.choicesText) }
        : {}),
    }));
    setPublishing(true);
    try {
      const updated = await onPublish({
        action: "publish_form",
        projectId: board.project.id,
        stageId,
        fields: nextFields,
        revision,
      });
      if (!updated) {
        setError(
          "문항을 저장·배포하지 못했습니다. 편집 내용은 유지되어 있습니다. 화면 위쪽의 오류 안내를 확인해 주세요.",
        );
        return;
      }
      const updatedSetting = updated.project.stages.find(
        (item) => item.id === stageId,
      );
      const saved = draftFields(publishedStageFields(stageId, updatedSetting));
      setFields(saved);
      setBaseline(JSON.stringify(saved));
      setRevision(updatedSetting?.revision ?? revision + 1);
      setNotice(
        `‘${stage.title}’ 활동지를 저장·배포했습니다. 새로 작성을 시작하는 참가자에게 적용됩니다.`,
      );
      onDirty(false);
    } catch (failure) {
      setError(
        `${failure instanceof Error ? failure.message : "문항을 저장·배포하지 못했습니다."} 편집 내용은 그대로 유지했습니다.`,
      );
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section
      className="inquiry-form-editor"
      aria-label="단계별 활동지 편집과 배포"
    >
      <div className="ife-intro">
        <div className="ife-intro-icon">
          <ClipboardList size={24} />
        </div>
        <div>
          <h2>프로젝트에 맞는 활동지를 준비하세요</h2>
          <p>
            {inquiryStages.length}종의 기본 활동지가 준비되어 있습니다. 질문을
            수정하고, 학생 화면을 미리 본 뒤 배포하세요.
          </p>
        </div>
      </div>

      <nav
        className={`ife-stage-nav ${board.project.template === "fusion" ? "ife-four-stages" : ""}`}
        aria-label="편집할 활동 단계"
      >
        {inquiryStages.map((item, index) => (
          <button
            key={item.id}
            type="button"
            disabled={busy || publishing}
            aria-current={stageId === item.id ? "step" : undefined}
            onClick={() => chooseStage(item.id)}
          >
            <span>{index + 1}</span>
            <b>{item.short}</b>
          </button>
        ))}
      </nav>

      <div className="ife-distribution-note">
        <div>
          <strong>배포 대상</strong>
          <p>
            이 프로젝트의 선발된 참가자 전체 · 현재{" "}
            {board.project.selectedIds.length}명
          </p>
        </div>
        <div>
          <strong>작성 방식</strong>
          <p>
            {stageId === "reflection"
              ? "학생마다 자신의 개인 성찰을 작성합니다. 본인과 교사만 조회합니다."
              : "모둠 대표가 공동 기록을 작성하고, 모둠원은 조회와 토론에 참여합니다."}
          </p>
        </div>
        <div>
          <strong>문항 변경 적용</strong>
          <p>
            임시저장을 포함해 이미 시작한 기록은 원래 문항을 유지합니다. 변경한
            문항은 배포 후 새로 시작하는 기록에 적용됩니다.
            {started > 0 &&
              ` 현재 이 단계에서 시작한 기록은 ${started}건입니다.`}
          </p>
        </div>
      </div>

      {board.project.archived && (
        <p className="ife-notice" role="status">
          보관된 프로젝트의 활동지입니다. 운영 설정에서 프로젝트를 다시 열면
          문항을 편집·배포할 수 있습니다.
        </p>
      )}
      {isNewer && dirty && (
        <p className="ife-notice" role="status">
          이 활동지는 다른 화면에서 변경되었습니다. 현재 편집 내용은 보존되어
          있습니다. 필요한 내용을 복사한 뒤 최신 활동지를 불러와 주세요.
        </p>
      )}
      {error && (
        <p className="ife-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="ife-notice ife-success" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}

      <div className="ife-editor-grid">
        <form
          className="ife-edit-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void publish();
          }}
        >
          <div className="ife-panel-heading">
            <div>
              <span className="ife-kicker">
                STEP{" "}
                {inquiryStages.findIndex((item) => item.id === stageId) + 1}
              </span>
              <h3>{stage.title} 활동지</h3>
              <p>
                현재 배포 버전 {serverRevision} ·{" "}
                {dateLabel(setting?.publishedAt)}
              </p>
            </div>
            <span className="ife-count">{fields.length} / 20 문항</span>
          </div>
          <fieldset disabled={locked} className="ife-fields">
            <legend className="ife-sr-only">활동지 문항 편집</legend>
            <div ref={editRegion} className="ife-question-list">
              {fields.map((field, index) => (
                <article
                  className="ife-question-card"
                  key={field.id}
                  aria-label={`${index + 1}번 문항 편집`}
                >
                  <div className="ife-question-toolbar">
                    <span className="ife-question-number">
                      문항 {index + 1}
                    </span>
                    <div className="ife-order-buttons">
                      <button
                        type="button"
                        title="문항 위로 이동"
                        aria-label={`${index + 1}번 문항 위로 이동`}
                        disabled={locked || index === 0}
                        onClick={() => moveField(index, -1)}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        title="문항 아래로 이동"
                        aria-label={`${index + 1}번 문항 아래로 이동`}
                        disabled={locked || index === fields.length - 1}
                        onClick={() => moveField(index, 1)}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        className="ife-remove"
                        title="문항 삭제"
                        aria-label={`${index + 1}번 문항 삭제`}
                        disabled={locked || fields.length <= 1}
                        onClick={() => removeField(field)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <label htmlFor={`ife-label-${field.id}`}>
                    질문
                    <input
                      id={`ife-label-${field.id}`}
                      data-question-label={field.id}
                      value={field.label}
                      required
                      maxLength={300}
                      placeholder="학생에게 묻고 싶은 질문을 적어주세요."
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                    />
                  </label>
                  <div className="ife-type-row">
                    <label htmlFor={`ife-type-${field.id}`}>
                      응답 형식
                      <select
                        id={`ife-type-${field.id}`}
                        value={inquiryFieldType(field)}
                        onChange={(event) =>
                          changeType(field.id, event.target.value as FieldType)
                        }
                      >
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ife-required">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          updateField(field.id, {
                            required: event.target.checked,
                          })
                        }
                      />
                      필수 응답
                    </label>
                  </div>
                  <label htmlFor={`ife-help-${field.id}`}>
                    작성 도움말 <span className="ife-optional">선택</span>
                    <textarea
                      id={`ife-help-${field.id}`}
                      rows={2}
                      maxLength={1500}
                      value={field.placeholder}
                      placeholder="예시, 작성할 분량, 확인할 점 등을 안내해 주세요."
                      onChange={(event) =>
                        updateField(field.id, {
                          placeholder: event.target.value,
                        })
                      }
                    />
                  </label>
                  {inquiryFieldType(field) === "select" && (
                    <label htmlFor={`ife-options-${field.id}`}>
                      선택지
                      <textarea
                        id={`ife-options-${field.id}`}
                        rows={Math.min(
                          7,
                          Math.max(3, field.choicesText.split("\n").length),
                        )}
                        value={field.choicesText}
                        maxLength={6500}
                        placeholder={
                          "선택지를 한 줄에 하나씩 입력하세요.\n예: 찬성\n반대\n판단 보류"
                        }
                        onChange={(event) =>
                          updateField(field.id, {
                            choicesText: event.target.value,
                          })
                        }
                        aria-describedby={`ife-options-help-${field.id}`}
                      />
                      <small
                        className="ife-field-help"
                        id={`ife-options-help-${field.id}`}
                      >
                        한 줄에 하나씩, 1~20개 · 현재{" "}
                        {cleanOptions(field.choicesText).length}개
                      </small>
                    </label>
                  )}
                  {inquiryFieldType(field) === "url" && (
                    <p className="ife-field-help">
                      학생이 기사·영상 등의 http:// 또는 https:// 링크를 한 줄에
                      하나씩 입력합니다.
                    </p>
                  )}
                </article>
              ))}
            </div>
            <Button
              className="ife-add-question"
              type="button"
              variant="outline"
              onClick={addField}
              disabled={locked || fields.length >= 20}
            >
              <Plus size={17} />
              {fields.length >= 20
                ? "문항은 최대 20개까지 추가할 수 있습니다"
                : "문항 추가"}
            </Button>
          </fieldset>
          <div className="ife-publish-bar">
            <div>
              <b>
                {dirty
                  ? "아직 배포하지 않은 변경 내용이 있습니다"
                  : "현재 배포된 문항입니다"}
              </b>
              <p>미리보기에서 확인한 뒤 저장·배포해 주세요.</p>
            </div>
            <Button type="submit" disabled={locked || !dirty}>
              <Send size={16} />
              {publishing ? "저장·배포 중…" : "문항 저장·배포"}
            </Button>
          </div>
        </form>

        <aside
          className="ife-preview-panel"
          aria-label="학생에게 보일 활동지 미리보기"
        >
          <div className="ife-preview-heading">
            <span>
              <Eye size={17} />
              학생 화면 미리보기
            </span>
            <small>
              {dirty ? "편집 중 · 아직 미배포" : `배포 버전 ${serverRevision}`}
            </small>
          </div>
          <div className="ife-preview-sheet">
            <span className="ife-kicker">
              STEP {inquiryStages.findIndex((item) => item.id === stageId) + 1}
            </span>
            <h3>{stage.title}</h3>
            <p className="ife-preview-instruction">
              {setting?.instruction || stage.description}
            </p>
            {stageId === "reflection" && (
              <p className="ife-preview-private">
                나의 기록 · 본인과 교사만 볼 수 있어요
              </p>
            )}
            <fieldset disabled>
              <legend className="ife-sr-only">
                학생 활동지 미리보기 · 입력할 수 없음
              </legend>
              {fields.map((field, index) => {
                const type = inquiryFieldType(field);
                if (type === "materials")
                  return (
                    <div className="ife-materials-preview" key={field.id}>
                      <p className="ife-preview-label">
                        {index + 1}. {field.label || "물품 신청 표"}{" "}
                        {field.required && <small>필수</small>}
                      </p>
                      <small>{field.placeholder}</small>
                      <InquiryMaterialsField
                        readOnly
                        value={JSON.stringify([
                          {
                            name: "예시: 실험용 비커",
                            specification: "500mL",
                            s2b: "",
                            quantity: "3",
                            unitPrice: "10000",
                            shipping: "5000",
                          },
                        ])}
                      />
                      <small>
                        위 물품은 미리보기 예시입니다. 학생은 행을 추가하거나
                        ‘신청할 물품 없음’을 선택할 수 있습니다.
                      </small>
                    </div>
                  );
                return (
                  <label key={field.id} htmlFor={`ife-preview-${field.id}`}>
                    <span className="ife-preview-label">
                      {index + 1}.{" "}
                      {field.label.trim() || "질문을 입력해 주세요"}
                      {field.required && <small>필수</small>}
                    </span>
                    {type === "select" ? (
                      <select id={`ife-preview-${field.id}`} defaultValue="">
                        <option value="">선택해 주세요</option>
                        {cleanOptions(field.choicesText)
                          .slice(0, 20)
                          .map((option, optionIndex) => (
                            <option key={`${option}-${optionIndex}`}>
                              {option}
                            </option>
                          ))}
                      </select>
                    ) : type === "short_text" ? (
                      <input
                        id={`ife-preview-${field.id}`}
                        type="text"
                        placeholder={field.placeholder || "짧게 입력해 주세요."}
                      />
                    ) : (
                      <textarea
                        id={`ife-preview-${field.id}`}
                        rows={type === "url" ? 2 : 4}
                        placeholder={
                          field.placeholder ||
                          (type === "url"
                            ? "https:// 로 시작하는 링크를 입력해 주세요."
                            : "생각을 자유롭게 적어주세요.")
                        }
                      />
                    )}
                    {type === "select" && field.placeholder && (
                      <small className="ife-field-help">
                        {field.placeholder}
                      </small>
                    )}
                  </label>
                );
              })}
            </fieldset>
            <div className="ife-preview-footer">
              <span>임시저장</span>
              <span>이 단계 제출 →</span>
            </div>
            <p className="ife-preview-caption">
              편집한 문항의 미리보기입니다. 이곳에서는 답변을 입력하거나
              제출하지 않습니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
