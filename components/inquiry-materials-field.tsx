"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  MATERIALS_BUDGET,
  MATERIALS_MAX_ITEMS,
  materialTotal,
  parseMaterials,
  type MaterialItem,
} from "@/lib/inquiry-materials";
import "./inquiry-materials-field.css";

type Props = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
};

const blankItem = (): MaterialItem => ({
  name: "",
  specification: "",
  s2b: "",
  quantity: "1",
  unitPrice: "",
  shipping: "0",
});

const columns: {
  key: keyof MaterialItem;
  label: string;
  limit: number;
  numeric?: boolean;
}[] = [
  { key: "name", label: "물품명/모델명", limit: 200 },
  { key: "specification", label: "규격", limit: 200 },
  { key: "s2b", label: "S2B 물품번호", limit: 100 },
  { key: "quantity", label: "수량", limit: 3, numeric: true },
  { key: "unitPrice", label: "단가", limit: 6, numeric: true },
  { key: "shipping", label: "배송비", limit: 6, numeric: true },
];

function rowAmount(item: MaterialItem): number | null {
  const cells = [item.quantity, item.unitPrice, item.shipping];
  if (cells.some((value) => !/^\d+$/.test(value.trim()))) return null;
  const numbers = cells.map((value) => Number(value.trim()));
  if (numbers.some((value) => !Number.isSafeInteger(value))) return null;
  const result = numbers[0] * numbers[1] + numbers[2];
  return Number.isSafeInteger(result) ? result : null;
}

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

export function InquiryMaterialsField({
  value,
  onChange,
  readOnly = false,
  id,
  invalid = false,
  describedBy,
}: Props) {
  const generatedId = useId();
  const baseId = id ?? `materials-${generatedId}`;
  const parsed = parseMaterials(value);
  const malformed = Boolean(value.trim()) && parsed === null;
  const noMaterials = parsed !== null && parsed.length === 0;
  const editable = !readOnly && Boolean(onChange);
  const rows = parsed ?? (value.trim() ? [] : [blankItem()]);
  const totalReady = rows.every((item) => rowAmount(item) !== null);
  const total = materialTotal(rows);
  const overBudget = totalReady && total > MATERIALS_BUDGET;

  function updateRow(index: number, key: keyof MaterialItem, next: string) {
    const updated = rows.map((item, rowIndex) =>
      index === rowIndex ? { ...item, [key]: next } : item,
    );
    onChange?.(JSON.stringify(updated));
  }

  return (
    <div
      className={`imf ${invalid ? "imf-invalid" : ""}`}
      id={baseId}
      role="group"
      aria-label="융합탐구 물품 신청 목록"
      aria-describedby={describedBy}
      tabIndex={-1}
    >
      <p className="imf-help">
        모둠당 배송비 포함 {won(MATERIALS_BUDGET)} 이내입니다. 예상 금액은 수량
        × 단가 + 배송비로 자동 계산됩니다. 같은 주문의 배송비는 한 행에만 입력해
        주세요.
      </p>
      {malformed ? (
        <div className="imf-malformed" role="alert">
          <p>
            저장된 물품 정보를 표로 표시할 수 없습니다. 아래 원문을 확인하고
            물품 목록을 다시 작성해 주세요.
          </p>
          <pre>{value}</pre>
          {editable && (
            <button
              type="button"
              className="imf-button"
              onClick={() => onChange?.("")}
            >
              물품 목록 다시 작성
            </button>
          )}
        </div>
      ) : (
        <>
          {editable && (
            <label className="imf-no-materials" htmlFor={`${baseId}-none`}>
              <input
                id={`${baseId}-none`}
                type="checkbox"
                checked={noMaterials}
                onChange={(event) =>
                  onChange?.(event.target.checked ? "[]" : "")
                }
              />
              신청할 물품이 없습니다.
            </label>
          )}
          {noMaterials ? (
            <p className="imf-empty">신청할 물품 없음 · 총 신청 금액 0원</p>
          ) : !editable && !value.trim() ? (
            <p className="imf-empty">아직 작성한 물품 정보가 없습니다.</p>
          ) : (
            <div
              className="imf-scroll"
              role="region"
              aria-label="물품 신청 표, 좁은 화면에서는 좌우로 스크롤하세요"
              tabIndex={0}
            >
              <table className="imf-table">
                <caption className="imf-sr-only">
                  융합탐구 물품 신청 내역 (최대 20개)
                </caption>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        scope="col"
                        key={column.key}
                        className={`imf-col-${column.key}`}
                      >
                        {column.label}
                        {column.key === "s2b" && (
                          <span className="imf-optional">선택</span>
                        )}
                        {(column.key === "unitPrice" ||
                          column.key === "shipping") && (
                          <span className="imf-optional">원</span>
                        )}
                      </th>
                    ))}
                    <th scope="col" className="imf-col-amount">
                      예상 금액
                    </th>
                    {editable && (
                      <th scope="col" className="imf-col-remove">
                        <span className="imf-sr-only">물품 삭제</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.key}>
                          {editable ? (
                            <>
                              <label
                                className="imf-sr-only"
                                htmlFor={`${baseId}-${index}-${column.key}`}
                              >
                                {index + 1}번 물품 {column.label}
                                {column.key === "s2b" ? " (선택)" : ""}
                              </label>
                              <input
                                id={`${baseId}-${index}-${column.key}`}
                                type="text"
                                inputMode={
                                  column.numeric ? "numeric" : undefined
                                }
                                value={item[column.key]}
                                maxLength={column.limit}
                                onChange={(event) =>
                                  updateRow(
                                    index,
                                    column.key,
                                    event.target.value,
                                  )
                                }
                                placeholder={
                                  column.key === "name"
                                    ? "예: 실험용 비커"
                                    : column.key === "specification"
                                      ? "예: 500mL"
                                      : undefined
                                }
                                aria-invalid={invalid || undefined}
                                aria-describedby={describedBy}
                              />
                            </>
                          ) : (
                            <span>{item[column.key] || "—"}</span>
                          )}
                        </td>
                      ))}
                      <td className="imf-amount">
                        {rowAmount(item) === null
                          ? "입력 중"
                          : won(rowAmount(item)!)}
                      </td>
                      {editable && (
                        <td>
                          <button
                            type="button"
                            className="imf-remove"
                            aria-label={`${index + 1}번 물품 삭제`}
                            onClick={() => {
                              const remaining = rows.filter(
                                (_, rowIndex) => rowIndex !== index,
                              );
                              onChange?.(
                                remaining.length
                                  ? JSON.stringify(remaining)
                                  : "",
                              );
                            }}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {editable && !noMaterials && (
            <div className="imf-actions">
              <button
                type="button"
                className="imf-button"
                disabled={rows.length >= MATERIALS_MAX_ITEMS}
                onClick={() =>
                  onChange?.(JSON.stringify([...rows, blankItem()]))
                }
              >
                <Plus size={16} aria-hidden="true" /> 물품 추가
              </button>
              <span>
                {rows.length}/{MATERIALS_MAX_ITEMS}개
              </span>
            </div>
          )}
          {(editable || Boolean(value.trim())) && (
            <div
              className={`imf-summary ${overBudget ? "imf-over-budget" : ""}`}
              aria-live="polite"
            >
              <span>
                총 신청 금액{" "}
                <strong>
                  {totalReady ? won(total) : "금액을 입력해 주세요"}
                </strong>
              </span>
              <span>
                {totalReady
                  ? overBudget
                    ? `예산보다 ${won(total - MATERIALS_BUDGET)} 초과`
                    : `남은 예산 ${won(MATERIALS_BUDGET - total)}`
                  : "수량·단가·배송비를 정수로 입력해 주세요."}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
