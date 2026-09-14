declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    ACCOUNT_SERVICE_URL?: string;
    TEACHER_EMAILS?: string;
    STUDENT_EMAILS?: string;
  }
}
