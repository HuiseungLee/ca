import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { inquiryEntries } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import { allStageIds, getProjectStages } from "@/lib/inquiry";
import {
  assertInquiryOrigin,
  canReadInquiryEntry,
  inquiryBoard,
  inquiryContext,
  InquiryError,
  inquiryFailure,
  inquiryJson,
} from "@/lib/inquiry-access";
import {
  buildInquiryExport,
  InquiryExportLimitError,
  isOwnInquiryExportEntry,
} from "@/lib/inquiry-export";

const id = z.string().min(1).max(100);
const querySchema = z.object({
  projectId: id,
  format: z.enum(["csv", "xlsx", "docx"]),
  entryId: id.optional(),
  teamId: id.optional(),
  stageId: z.enum(allStageIds).optional(),
});

export async function GET(request: Request) {
  try {
    assertInquiryOrigin(request);
    const auth = await requireProfile(request);
    if (!auth) return inquiryJson({ error: "로그인이 필요합니다." }, 401);
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new InquiryError(
        "프로젝트와 다운로드 형식을 확인해 주세요. CSV, XLSX, DOCX를 지원합니다.",
      );
    const { projectId, format, entryId, teamId, stageId } = parsed.data;
    const context = await inquiryContext(projectId, auth.profile);
    if (teamId) {
      const team = context.teams.find((item) => item.id === teamId);
      if (!team) throw new InquiryError("모둠을 찾을 수 없습니다.", 404);
      if (
        auth.profile.role !== "teacher" &&
        !team.memberIds.includes(auth.profile.id)
      )
        throw new InquiryError("본인 모둠의 기록만 내려받을 수 있습니다.", 403);
    }
    if (entryId) {
      const [entry] = await getDb()
        .select()
        .from(inquiryEntries)
        .where(
          and(
            eq(inquiryEntries.id, entryId),
            eq(inquiryEntries.projectId, projectId),
          ),
        )
        .limit(1);
      if (!entry) throw new InquiryError("활동 기록을 찾을 수 없습니다.", 404);
      if (
        !canReadInquiryEntry(entry, context, auth.profile) ||
        (auth.profile.role !== "teacher" &&
          !isOwnInquiryExportEntry(entry, auth.profile.id, context.teams))
      )
        throw new InquiryError("이 기록을 내려받을 권한이 없습니다.", 403);
    }
    const board = await inquiryBoard(context, auth.profile);
    if (
      stageId &&
      !getProjectStages(board.project).some((stage) => stage.id === stageId)
    )
      throw new InquiryError("프로젝트에 없는 양식입니다.");
    board.entries = board.entries.filter(
      (entry) =>
        (auth.profile.role === "teacher" ||
          isOwnInquiryExportEntry(entry, auth.profile.id, context.teams)) &&
        (!entryId || entry.id === entryId) &&
        (!teamId || entry.teamId === teamId) &&
        (!stageId || entry.stageId === stageId),
    );
    // Discussion is outside the document download scope.
    board.comments = [];
    if (!board.entries.length)
      throw new InquiryError("내려받을 저장된 기록이 없습니다.", 404);
    const result = buildInquiryExport(board, format);
    return new Response(result.body, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": result.disposition,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof InquiryExportLimitError)
      return inquiryJson({ error: error.message }, 413);
    return inquiryFailure(error);
  }
}
