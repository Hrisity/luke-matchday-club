declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CMS_ADMIN_USER_ID?: string;
    DEMO_AUTH_ENABLED?: string;
    BUCKET?: R2Bucket;
  }
}
