import { endSession } from "@/lib/auth";

export async function POST(req: Request) {
  return Response.json({ ok: true }, { headers: { "set-cookie": await endSession(req) } });
}
