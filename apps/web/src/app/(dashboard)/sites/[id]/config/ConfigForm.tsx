"use client";

import { useState, useEffect } from "react";
import type { Site, WidgetConfig } from "@prisma/client";

type Props = { site: Site; config: WidgetConfig | null };

const defaultQuestions = [{ id: "q1", question: "Hvad bringer dig her i dag?", required: true }];

export function ConfigForm({ site, config }: Props) {
  const [botName, setBotName] = useState(config?.botName ?? "LeadBot");
  const [avatarUrl, setAvatarUrl] = useState(config?.avatarUrl ?? "");
  const [avatarEmoji, setAvatarEmoji] = useState(config?.avatarEmoji ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(config?.primaryColor ?? "#2563eb");

  const DEFAULT_AVATARS = [
    { id: 1, path: "/avatars/default-1.svg", label: "Avatar 1" },
    { id: 2, path: "/avatars/default-2.svg", label: "Avatar 2" },
    { id: 3, path: "/avatars/default-3.svg", label: "Avatar 3" },
    { id: 4, path: "/avatars/default-4.svg", label: "Avatar 4" },
    { id: 5, path: "/avatars/default-5.svg", label: "Avatar 5" },
  ];
  const isDefaultAvatar = (url: string) => /^\/avatars\/default-\d\.svg$/.test(url);
  const selectedDefaultId = avatarUrl && isDefaultAvatar(avatarUrl) ? parseInt(avatarUrl.replace(/^\/avatars\/default-(\d)\.svg$/, "$1"), 10) : null;
  const [greetingText, setGreetingText] = useState(config?.greetingText ?? "Hi! How can I help you today?");
  const [offlineMessage, setOfflineMessage] = useState(
    config?.offlineMessage ?? "We're offline. Leave your details and we'll get back to you."
  );
  const [leadThreshold, setLeadThreshold] = useState(config?.leadThreshold ?? 60);
  const [businessHoursStart, setBusinessHoursStart] = useState<string>(
    config?.businessHoursStart != null ? String(config.businessHoursStart) : "8"
  );
  const [businessHoursEnd, setBusinessHoursEnd] = useState<string>(
    config?.businessHoursEnd != null ? String(config.businessHoursEnd) : "16"
  );
  const [collectEmailPhoneFirst, setCollectEmailPhoneFirst] = useState(
    config?.collectEmailPhoneFirst ?? true
  );
  const [toneOfVoice, setToneOfVoice] = useState(config?.toneOfVoice ?? "");
  const [inputPlaceholder, setInputPlaceholder] = useState(config?.inputPlaceholder ?? "");
  const [typingText, setTypingText] = useState(config?.typingText ?? "");
  const [sendButtonLabel, setSendButtonLabel] = useState(config?.sendButtonLabel ?? "");
  const [questions, setQuestions] = useState<{ id: string; question: string; required: boolean }[]>(
    Array.isArray(config?.qualificationQuestions)
      ? (config.qualificationQuestions as { id: string; question: string; required: boolean }[])
      : defaultQuestions
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/sites/${site.id}/config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botName,
        avatarUrl: avatarUrl || null,
        avatarEmoji: avatarEmoji.trim() || null,
        primaryColor,
        greetingText,
        offlineMessage,
        leadThreshold: Number(leadThreshold),
        businessHoursStart: businessHoursStart === "" ? null : Number(businessHoursStart),
        businessHoursEnd: businessHoursEnd === "" ? null : Number(businessHoursEnd),
        collectEmailPhoneFirst,
        toneOfVoice: toneOfVoice.trim() || null,
        inputPlaceholder: inputPlaceholder.trim() || null,
        typingText: typingText.trim() || null,
        sendButtonLabel: sendButtonLabel.trim() || null,
        qualificationQuestions: questions,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  function addQuestion() {
    setQuestions((q) => [...q, { id: `q${Date.now()}`, question: "", required: false }]);
  }

  function removeQuestion(i: number) {
    setQuestions((q) => q.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, field: "question" | "required", value: string | boolean) {
    setQuestions((q) => {
      const next = [...q];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`/api/sites/${site.id}/config/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Upload fejlede");
        return;
      }
      const { url } = await res.json();
      setAvatarUrl(url);
      setAvatarEmoji("");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Widget-indstillinger</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot-navn</label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Avatar</label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="avatar"
                checked={!avatarUrl && !avatarEmoji}
                onChange={() => {
                  setAvatarUrl("");
                  setAvatarEmoji("");
                }}
                className="rounded-full border-slate-300"
              />
              <span className="text-sm text-slate-700">Ingen avatar</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Standard:</span>
              {DEFAULT_AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(a.path);
                    setAvatarEmoji("");
                  }}
                  className={`w-12 h-12 rounded-full border-2 p-0.5 flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedDefaultId === a.id
                      ? "border-blue-600 ring-2 ring-blue-200"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                  title={a.label}
                >
                  <img src={a.path} alt={a.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <label htmlFor="avatar-upload" className="flex items-center gap-2 cursor-pointer">
              <input
                id="avatar-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
                className="hidden"
              />
              <span className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50">
                {avatarUploading ? "Uploader…" : "Upload eget billede"}
              </span>
            </label>
          </div>
          {avatarUrl && !isDefaultAvatar(avatarUrl) && (
            <div className="mt-2 flex items-center gap-2">
              <img src={avatarUrl} alt="Uploaded" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="text-sm text-red-600 hover:underline"
              >
                Fjern upload
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 mt-1">Vises på chat-boblen og i chat-hovedet. Max 2 MB, PNG/JPEG/SVG/WebP.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Primær farve</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-14 rounded border border-slate-300 cursor-pointer"
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Velkomst-tekst</label>
          <textarea
            value={greetingText}
            onChange={(e) => setGreetingText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Offline-besked</label>
          <textarea
            value={offlineMessage}
            onChange={(e) => setOfflineMessage(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Input-placeholder</label>
            <input
              type="text"
              value={inputPlaceholder}
              onChange={(e) => setInputPlaceholder(e.target.value)}
              placeholder="Type a message..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">F.eks. Skriv en besked… (tom = engelsk standard)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Typing-tekst</label>
            <input
              type="text"
              value={typingText}
              onChange={(e) => setTypingText(e.target.value)}
              placeholder="Typing..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Send-knap</label>
            <input
              type="text"
              value={sendButtonLabel}
              onChange={(e) => setSendButtonLabel(e.target.value)}
              placeholder="Send"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Lead-kvalifikationstrin (0–100): {leadThreshold}
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={leadThreshold}
            onChange={(e) => setLeadThreshold(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Åbningstid start (time)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={businessHoursStart}
              onChange={(e) => setBusinessHoursStart(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Åbningstid slut (time)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={businessHoursEnd}
              onChange={(e) => setBusinessHoursEnd(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="collectFirst"
            checked={collectEmailPhoneFirst}
            onChange={(e) => setCollectEmailPhoneFirst(e.target.checked)}
            className="rounded border-slate-300"
          />
          <label htmlFor="collectFirst" className="text-sm text-slate-700">
            Indsaml Navn/e-mail/telefon før kvalifikation
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tone / brandstemme</label>
          <textarea
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            placeholder="F.eks. Professionel men varm, brug vi/dig, undgå jargon. Lyde som vores salgsteam."
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">Chatboten bruger dette til at matche jeres brand, når den rådgiver og kvalificerer leads døgnet rundt.</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">Kvalifikationsspørgsmål</label>
            <button type="button" onClick={addQuestion} className="text-sm text-blue-600 hover:underline">
              + Tilføj
            </button>
          </div>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(i, "question", e.target.value)}
                  placeholder="Spørgsmålstekst"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-1 shrink-0 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(i, "required", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Påkrævet
                </label>
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Fjern
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 font-medium disabled:opacity-50"
          >
            {saving ? "Gemmer…" : "Gem"}
          </button>
          {saved && <span className="text-sm text-green-600">Gemt.</span>}
        </div>
      </form>
    </section>
  );
}
