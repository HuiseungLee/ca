import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { activityForms, studentGroups } from "@/db/schema";
import { defaultActivityForm, individualActivityForm } from "@/lib/default-content";

export async function submissionForm(id: string, profile: { id: string; role: string }) {
  if (id === individualActivityForm.id) return individualActivityForm;
  const [form] = await getDb().select().from(activityForms).where(eq(activityForms.id, id)).limit(1);
  if (!form) return id === defaultActivityForm.id ? defaultActivityForm : null;
  if (form.status !== "published") return null;
  if (profile.role === "teacher" || form.distributionMode === "all") return form;
  if (form.distributionMode === "individual") return form.targetIds.includes(profile.id) ? form : null;
  const groups = await getDb().select().from(studentGroups);
  return groups.some((group) => form.targetIds.includes(group.id) && group.memberIds.includes(profile.id)) ? form : null;
}
