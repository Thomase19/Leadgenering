"use client";

import { useEffect } from "react";

export function DemoWidget({ siteId, baseUrl }: { siteId: string; baseUrl: string }) {
  useEffect(() => {
    (window as unknown as { LEADBOT_SITE_ID: string }).LEADBOT_SITE_ID = siteId;
    (window as unknown as { LEADBOT_BASE_URL: string }).LEADBOT_BASE_URL = baseUrl;
    const existing = document.querySelector('script[data-leadbot-demo="true"]');
    if (existing) return;
    const script = document.createElement("script");
    script.src = `${baseUrl}/widget/leadbot.js`;
    script.async = true;
    script.setAttribute("data-leadbot-demo", "true");
    document.body.appendChild(script);
    return () => {
      script.remove();
      const root = document.getElementById("leadbot-root");
      if (root) root.remove();
    };
  }, [siteId, baseUrl]);
  return null;
}
