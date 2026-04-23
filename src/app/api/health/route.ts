import { json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return json({
    status: "ok",
    service: "jvwithniche",
    time: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? "local",
  });
}
