import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantForUser, getSiteForTenant } from "@/lib/tenancy";
import { prisma } from "@/lib/prisma";
import { chunkText, embedText } from "@/lib/ai/embeddings";

function stripHtml(html: string): string {
  const noScript = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  const noStyle = noScript.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  const text = noStyle.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: siteId } = await params;
  const site = await getSiteForTenant(siteId, ctx.tenantId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { siteId },
    orderBy: { createdAt: "desc" },
    select: { id: true, source: true, content: true, metadata: true, createdAt: true },
  });
  return NextResponse.json(chunks);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ctx = await getTenantForUser(session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: siteId } = await params;
  const site = await getSiteForTenant(siteId, ctx.tenantId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const type = body.type === "url" ? "url" : "text";
  let text: string;

  if (type === "url") {
    const url = typeof body.url === "string" ? body.url.trim() : "";
    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "LeadBot/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      text = stripHtml(html);
      if (!text || text.length < 50) {
        return NextResponse.json({ error: "Could not extract enough text from URL" }, { status: 400 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fetch failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  } else {
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "Missing content" }, { status: 400 });
    text = content;
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return NextResponse.json({ error: "No content to add" }, { status: 400 });
  if (chunks.length > 50) {
    return NextResponse.json({ error: "Too many chunks; use shorter text or split into smaller uploads" }, { status: 400 });
  }

  const metadata = type === "url" ? { url: body.url } : null;
  const created: { id: string }[] = [];

  for (const content of chunks) {
    try {
      const embedding = await embedText(content);
      const chunk = await prisma.knowledgeChunk.create({
        data: {
          siteId,
          source: type,
          content,
          metadata: metadata as object | null,
          embedding: embedding as object,
        },
      });
      created.push({ id: chunk.id });
    } catch (e) {
      console.error("Embedding failed for chunk", e);
      await prisma.knowledgeChunk.create({
        data: { siteId, source: type, content, metadata: metadata as object | null },
      });
    }
  }

  return NextResponse.json({ ok: true, added: created.length });
}
