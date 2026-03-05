import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await prisma.chatSession.findUnique({
    where: { id: (await params).sessionId },
    include: { messages: true },
  });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const transcript = session.messages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  return new NextResponse(transcript, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
