(function () {
  const siteId = (window as unknown as { LEADBOT_SITE_ID?: string }).LEADBOT_SITE_ID;
  const baseUrl =
    (window as unknown as { LEADBOT_BASE_URL?: string }).LEADBOT_BASE_URL ||
    (() => {
      const script = document.currentScript as HTMLScriptElement | null;
      if (script?.src) {
        try {
          const u = new URL(script.src);
          return `${u.protocol}//${u.host}`;
        } catch {}
      }
      return "";
    })();

  if (!siteId || !baseUrl) return;
  const siteIdStr: string = siteId;
  const baseUrlStr: string = baseUrl;

  let visitorId: string =
    localStorage.getItem("leadbot_visitor_id") ||
    "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem("leadbot_visitor_id", visitorId);

  // Lightweight traffic beacon: one per page load (same visitorId across pages = one visitor)
  try {
    const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    const referrer = typeof document !== "undefined" ? document.referrer || undefined : undefined;
    const payload = JSON.stringify({
      siteId: siteIdStr,
      visitorId,
      path,
      referrer,
    });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(`${baseUrlStr}/api/widget/beacon`, new Blob([payload], { type: "application/json" }));
    } else {
      fetch(`${baseUrlStr}/api/widget/beacon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (_) {}

  let sessionId: string | null = null;
  let config: Config | null = null;
  let isOpen = false;

  type Config = {
    botName: string;
    avatarUrl: string | null;
    avatarEmoji: string | null;
    primaryColor: string;
    greetingText: string;
    offlineMessage: string;
    qualificationQuestions: { id: string; question: string; required: boolean }[];
    leadThreshold: number;
    businessHoursStart: number | null;
    businessHoursEnd: number | null;
    collectEmailPhoneFirst: boolean;
    toneOfVoice: string | null;
    inputPlaceholder: string | null;
    typingText: string | null;
    sendButtonLabel: string | null;
    isWithinBusinessHours: boolean;
  };

  async function api<T>(path: string, opts?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrlStr}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts?.headers },
    });
    if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
    return res.json() as Promise<T>;
  }

  function resolveAvatarUrl(url: string | null): string {
    if (!url?.trim()) return "";
    const u = url.trim();
    return u.startsWith("http") ? u : baseUrlStr + (u.startsWith("/") ? u : "/" + u);
  }

  async function loadConfig(): Promise<Config> {
    if (config) return config;
    config = await api<Config>(`/api/widget/config?siteId=${encodeURIComponent(siteIdStr)}`);
    return config;
  }

  async function createSession(): Promise<string> {
    if (sessionId) return sessionId;
    const url = window.location.href;
    const referrer = document.referrer || undefined;
    const utm: Record<string, string> = {};
    const params = new URLSearchParams(window.location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k.replace("utm_", "")] = v;
    });
    const body = await api<{ sessionId: string }>("/api/widget/session", {
      method: "POST",
      body: JSON.stringify({
        siteId: siteIdStr,
        visitorId,
        pageUrl: url,
        referrer,
        utm: Object.keys(utm).length ? utm : undefined,
      }),
    });
    sessionId = body.sessionId;
    return sessionId;
  }

  async function sendMessage(content: string): Promise<{ content: string }> {
    await createSession();
    const data = await api<{ botMessage?: { content: string }; ok: boolean }>(
      "/api/widget/message",
      {
        method: "POST",
        body: JSON.stringify({ sessionId, content }),
      }
    );
    return { content: data.botMessage?.content ?? "Sorry, I couldn't process that." };
  }

  async function sendLeadCapture(data: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    message?: string;
  }): Promise<void> {
    await createSession();
    await api("/api/widget/lead-capture", {
      method: "POST",
      body: JSON.stringify({ sessionId, ...data }),
    });
  }

  function injectStyles() {
    if (document.getElementById("leadbot-styles")) return;
    const style = document.createElement("style");
    style.id = "leadbot-styles";
    style.textContent = `
      #leadbot-root { font-family: system-ui, -apple-system, sans-serif; }
      .leadbot-bubble { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; outline: none; }
      .leadbot-bubble:focus-visible { box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 0 0 2px rgba(255,255,255,0.9); }
      .leadbot-bubble.has-avatar { padding: 3px; background: #fff !important; box-shadow: 0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06); }
      .leadbot-bubble.has-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-sizing: border-box; }
      .leadbot-panel { position: fixed; bottom: 90px; right: 20px; width: 380px; max-width: calc(100vw - 40px); height: 520px; max-height: calc(100vh - 120px); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); display: flex; flex-direction: column; background: #fff; z-index: 999998; }
      .leadbot-header { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 10px; }
      .leadbot-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e2e8f0; object-fit: cover; }
      .leadbot-avatar-emoji { display: flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1; }
      .leadbot-title { font-weight: 600; color: #0f172a; }
      .leadbot-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .leadbot-msg { max-width: 85%;; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.45; }
      .leadbot-msg.bot { align-self: flex-start; background: #f1f5f9; color: #0f172a; }
      .leadbot-msg.visitor { align-self: flex-end; background: #2563eb; color: #fff; }
      .leadbot-typing { align-self: flex-start; padding: 10px 14px; background: #f1f5f9; border-radius: 12px; font-size: 12px; color: #64748b; }
      .leadbot-input-area { padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; }
      .leadbot-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; outline: none; }
      .leadbot-input:focus { border-color: #2563eb; }
      .leadbot-send { padding: 10px 16px; border-radius: 8px; border: none; font-weight: 500; font-size: 14px; cursor: pointer; }
      .leadbot-offline-form { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
      .leadbot-offline-form input, .leadbot-offline-form textarea { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 14px; }
      .leadbot-offline-form button { padding: 10px; border-radius: 8px; border: none; font-weight: 500; cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  function renderBubble(primaryColor: string, avatarUrl: string | null, avatarEmoji: string | null) {
    const bubble = document.createElement("button");
    bubble.className = "leadbot-bubble";
    bubble.style.background = primaryColor;
    bubble.setAttribute("aria-label", "Open chat");
    if (avatarUrl) {
      bubble.classList.add("has-avatar");
      const img = document.createElement("img");
      img.src = resolveAvatarUrl(avatarUrl);
      img.alt = "";
      bubble.appendChild(img);
    } else if (avatarEmoji?.trim()) {
      const span = document.createElement("span");
      span.className = "leadbot-bubble-emoji";
      span.textContent = avatarEmoji.trim().slice(0, 2); // allow 1–2 chars (emoji)
      span.style.fontSize = "28px";
      span.style.lineHeight = "1";
      span.style.display = "flex";
      span.style.alignItems = "center";
      span.style.justifyContent = "center";
      bubble.appendChild(span);
    } else {
      bubble.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    }
    return bubble;
  }

  function addMessage(container: HTMLElement, role: "bot" | "visitor", text: string) {
    const div = document.createElement("div");
    div.className = `leadbot-msg ${role}`;
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping(container: HTMLElement, show: boolean, typingText: string) {
    let el = container.querySelector(".leadbot-typing");
    if (show && !el) {
      el = document.createElement("div");
      el.className = "leadbot-typing";
      el.textContent = typingText;
      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
    } else if (!show && el) {
      el.remove();
    }
  }

  let rootEl: HTMLDivElement | null = null;
  let bubble: HTMLButtonElement | null = null;
  let panel: HTMLDivElement | null = null;

  async function toggle() {
    if (isOpen) {
      panel?.remove();
      panel = null;
      isOpen = false;
      return;
    }
    await loadConfig();
    if (!config) return;

    injectStyles();
    if (!rootEl) {
      rootEl = document.getElementById("leadbot-root") as HTMLDivElement | null;
      if (!rootEl) {
        rootEl = document.createElement("div");
        rootEl.id = "leadbot-root";
        document.body.appendChild(rootEl);
      }
    }
    const root = rootEl;

    const primaryColor = config.primaryColor || "#2563eb";

    panel = document.createElement("div");
    panel.className = "leadbot-panel";
    panel.id = "leadbot-panel";

    const header = document.createElement("div");
    header.className = "leadbot-header";
    if (config.avatarUrl) {
      const avatar = document.createElement("img");
      avatar.className = "leadbot-avatar";
      avatar.src = resolveAvatarUrl(config.avatarUrl);
      avatar.alt = "";
      header.appendChild(avatar);
    } else if (config.avatarEmoji?.trim()) {
      const emojiEl = document.createElement("span");
      emojiEl.className = "leadbot-avatar leadbot-avatar-emoji";
      emojiEl.textContent = config.avatarEmoji.trim().slice(0, 2);
      header.appendChild(emojiEl);
    }
    const title = document.createElement("span");
    title.className = "leadbot-title";
    title.textContent = config.botName;
    header.appendChild(title);
    panel.appendChild(header);

    const messagesContainer = document.createElement("div");
    messagesContainer.className = "leadbot-messages";

    addMessage(messagesContainer, "bot", config.greetingText);
    panel.appendChild(messagesContainer);

    const inputPlaceholder = config.inputPlaceholder?.trim() || "Type a message...";
    const typingText = config.typingText?.trim() || "Typing...";
    const sendButtonLabel = config.sendButtonLabel?.trim() || "Send";

    const inputArea = document.createElement("div");
    inputArea.className = "leadbot-input-area";
    const input = document.createElement("input");
    input.className = "leadbot-input";
    input.placeholder = inputPlaceholder;
    input.type = "text";
    const sendBtn = document.createElement("button");
    sendBtn.className = "leadbot-send";
    sendBtn.style.background = primaryColor;
    sendBtn.style.color = "white";
    sendBtn.textContent = sendButtonLabel;

    async function onSend() {
      const text = input.value.trim();
      if (!text || !sessionId) return;
      input.value = "";
      addMessage(messagesContainer, "visitor", text);
      showTyping(messagesContainer, true, typingText);
      try {
        const { content } = await sendMessage(text);
        showTyping(messagesContainer, false, typingText);
        addMessage(messagesContainer, "bot", content);
      } catch (e) {
        showTyping(messagesContainer, false, typingText);
        addMessage(messagesContainer, "bot", "Sorry, something went wrong. Please try again.");
      }
    }

    sendBtn.addEventListener("click", onSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    });

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);

    root.appendChild(panel);
    isOpen = true;
    createSession().catch(() => {});
  }

  injectStyles();
  rootEl = document.getElementById("leadbot-root") as HTMLDivElement | null;
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = "leadbot-root";
    document.body.appendChild(rootEl);
  }
  loadConfig().then((c) => {
    config = c;
    bubble = renderBubble(c.primaryColor || "#2563eb", c.avatarUrl, c.avatarEmoji);
    rootEl!.appendChild(bubble!);
    bubble!.addEventListener("click", toggle);
  }).catch(() => {});
})();
