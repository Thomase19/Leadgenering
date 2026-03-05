import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) return NextResponse.redirect(new URL("/login", req.url));

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const tenantId = searchParams.get("state") ?? session.user.tenantId;

  if (!code) {
    if (!HUBSPOT_CLIENT_ID) {
      return NextResponse.redirect(new URL("/integrations?error=hubspot_not_configured", req.url));
    }
    const redirectUri = `${BASE_URL}/api/integrations/hubspot/connect`;
    const scope = "crm.objects.contacts.write";
    const state = session.user.tenantId;
    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    return NextResponse.redirect(authUrl);
  }

  if (!HUBSPOT_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/integrations?error=hubspot_not_configured", req.url));
  }

  const redirectUri = `${BASE_URL}/api/integrations/hubspot/connect`;
  const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: HUBSPOT_CLIENT_ID!,
      client_secret: HUBSPOT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("HubSpot token error", err);
    return NextResponse.redirect(new URL("/integrations?error=hubspot_token", req.url));
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const { prisma } = await import("@/lib/prisma");
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  await prisma.crmConnection.upsert({
    where: { tenantId_provider: { tenantId, provider: "HUBSPOT" } },
    create: {
      tenantId,
      provider: "HUBSPOT",
      hubspotAccessToken: tokens.access_token,
      hubspotRefreshToken: tokens.refresh_token ?? null,
      expiresAt,
    },
    update: {
      hubspotAccessToken: tokens.access_token,
      hubspotRefreshToken: tokens.refresh_token ?? null,
      expiresAt,
    },
  });

  return NextResponse.redirect(new URL("/integrations", req.url));
}
