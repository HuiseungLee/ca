"use client";

import { useId, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InquiryDownload({
  projectId,
  entryId,
  teamId,
  disabled,
  label = "기록 내려받기",
}: {
  projectId: string;
  entryId?: string;
  teamId?: string;
  disabled?: boolean;
  label?: string;
}) {
  const selectId = useId();
  const [format, setFormat] = useState("docx");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy || disabled) return;
    setBusy(true);
    setError("");
    try {
      const query = new URLSearchParams({ projectId, format });
      if (entryId) query.set("entryId", entryId);
      if (teamId) query.set("teamId", teamId);
      const response = await fetch(`/api/inquiry/export?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(result.error || "기록을 내려받지 못했습니다.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      let filename = `탐구기록.${format}`;
      if (encodedName) {
        try {
          filename = decodeURIComponent(encodedName).replace(
            /[\\/\x00-\x1f]/g,
            "_",
          );
        } catch {
          /* Keep the safe default filename. */
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "다운로드를 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="iw-download">
      <div className="iw-download-controls">
        <label htmlFor={selectId} className="iw-sr-only">
          {label} 파일 형식
        </label>
        <select
          id={selectId}
          value={format}
          disabled={disabled || busy}
          onChange={(event) => setFormat(event.target.value)}
        >
          <option value="docx">문서 DOCX</option>
          <option value="xlsx">엑셀 XLSX</option>
          <option value="csv">데이터 CSV</option>
        </select>
        <Button
          variant="outline"
          type="button"
          disabled={disabled || busy}
          onClick={() => void download()}
        >
          <Download size={16} />
          {busy ? "파일 준비 중…" : label}
        </Button>
      </div>
      <small>
        저장된 답변·교사 피드백을 내려받습니다. 첨부파일은 각 기록에서 별도로
        받으세요.
      </small>
      {error && (
        <p role="alert" className="iw-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
