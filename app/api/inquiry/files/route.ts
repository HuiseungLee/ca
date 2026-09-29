import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { inquiryEntries } from "@/db/schema";
import { requireProfile } from "@/lib/auth";
import {
  assertEntryWriter,
  assertInquiryOrigin,
  assertWritable,
  canReadInquiryEntry,
  inquiryContext,
  InquiryError,
  inquiryFailure,
  inquiryJson,
  serializeInquiryEntry,
} from "@/lib/inquiry-access";

export async function GET(request: Request) {
  try {
    const auth = await requireProfile(request);
    if (!auth) return inquiryJson({ error: "로그인이 필요합니다." }, 401);
    const entryId = new URL(request.url).searchParams.get("entryId") ?? "";
    const [entry] = await getDb()
      .select()
      .from(inquiryEntries)
      .where(eq(inquiryEntries.id, entryId))
      .limit(1);
    if (!entry) throw new InquiryError("첨부파일을 찾을 수 없습니다.", 404);
    const context = await inquiryContext(entry.projectId, auth.profile);
    if (!canReadInquiryEntry(entry, context, auth.profile))
      throw new InquiryError("첨부파일을 볼 권한이 없습니다.", 403);
    const file =
      entry.fileKey && env.BUCKET ? await env.BUCKET.get(entry.fileKey) : null;
    if (!file) throw new InquiryError("첨부파일을 찾을 수 없습니다.", 404);
    return new Response(file.body, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(entry.fileName ?? "inquiry")}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return inquiryFailure(error);
  }
}

export async function POST(request: Request) {
  let uploadedKey: string | null = null;
  try {
    assertInquiryOrigin(request);
    const auth = await requireProfile(request);
    if (!auth) return inquiryJson({ error: "로그인이 필요합니다." }, 401);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 21 * 1024 * 1024)
      throw new InquiryError("파일은 20MB 이하만 첨부할 수 있습니다.");
    const data = await request.formData();
    const entryId = String(data.get("entryId") ?? "");
    const version = Number(data.get("version"));
    const file = data.get("file");
    if (
      !entryId ||
      !Number.isInteger(version) ||
      version < 1 ||
      !(file instanceof File) ||
      !file.size ||
      file.size > 20 * 1024 * 1024
    )
      throw new InquiryError(
        "저장된 활동과 20MB 이하의 첨부파일을 확인해 주세요.",
      );
    const db = getDb();
    const [entry] = await db
      .select()
      .from(inquiryEntries)
      .where(eq(inquiryEntries.id, entryId))
      .limit(1);
    if (!entry) throw new InquiryError("활동을 찾을 수 없습니다.", 404);
    const context = await inquiryContext(entry.projectId, auth.profile);
    assertWritable(context);
    assertEntryWriter(entry, context, auth.profile);
    if (entry.status === "approved")
      throw new InquiryError(
        "확인된 활동은 먼저 임시저장으로 수정한 뒤 파일을 첨부해 주세요.",
        409,
      );
    if (entry.version !== version)
      throw new InquiryError(
        "다른 화면에서 수정된 내용이 있습니다. 새로고침 후 확인해 주세요.",
        409,
      );
    if (!env.BUCKET)
      throw new InquiryError("파일 저장소에 연결하지 못했습니다.", 503);
    uploadedKey = `inquiry/${entry.id}/${crypto.randomUUID()}`;
    await env.BUCKET.put(uploadedKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    const [updated] = await db
      .update(inquiryEntries)
      .set({
        fileKey: uploadedKey,
        fileName: file.name.slice(0, 240),
        status: "draft",
        version: version + 1,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(inquiryEntries.id, entry.id),
          eq(inquiryEntries.version, version),
        ),
      )
      .returning();
    if (!updated)
      throw new InquiryError(
        "다른 화면에서 수정된 내용이 있습니다. 새로고침 후 확인해 주세요.",
        409,
      );
    uploadedKey = null;
    if (entry.fileKey)
      await env.BUCKET.delete(entry.fileKey).catch(() => undefined);
    return inquiryJson({ entry: serializeInquiryEntry(updated) });
  } catch (error) {
    if (uploadedKey && env.BUCKET)
      await env.BUCKET.delete(uploadedKey).catch(() => undefined);
    return inquiryFailure(error);
  }
}
