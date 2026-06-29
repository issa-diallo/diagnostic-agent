"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type LlmSettings = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

const SETTINGS_STORAGE_KEY = "diagnostic-agent:llm-settings";
const DEFAULT_SETTINGS: LlmSettings = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  baseUrl: "https://openrouter.ai/api/v1",
};

const suggestedModels = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-70b-instruct",
];

function readSettings(): LlmSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function maskKey(apiKey: string) {
  if (!apiKey) return "Aucune clé enregistrée";
  if (apiKey.length <= 10) return "••••••";
  return `${apiKey.slice(0, 6)}••••••${apiKey.slice(-4)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setSettings(readSettings()));
  }, []);

  const keyStatus = useMemo(() => maskKey(settings.apiKey), [settings.apiKey]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSettings = {
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_SETTINGS.model,
      baseUrl: settings.baseUrl.trim().replace(/\/$/, "") || DEFAULT_SETTINGS.baseUrl,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleanSettings));
    setSettings(cleanSettings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function clearSettings() {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
    setSaved(false);
  }

  return (
    <main className="min-h-screen bg-[#08090d] px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Configuration</p>
            <h1 className="text-3xl font-semibold tracking-tight">Settings LLM</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
          >
            Retour au chat
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-black/30">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">Ajouter sa clé API</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                La clé est stockée dans le navigateur avec localStorage. Elle est envoyée uniquement au proxy API Next.js au moment d’un message, puis transmise au fournisseur compatible OpenAI/OpenRouter.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="apiKey" className="mb-2 block text-sm font-medium text-zinc-200">
                  Clé API
                </label>
                <div className="flex gap-2">
                  <input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={settings.apiKey}
                    onChange={(event) => setSettings((current) => ({ ...current, apiKey: event.target.value }))}
                    placeholder="sk-or-v1-…"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((current) => !current)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 text-sm transition hover:bg-white/10"
                  >
                    {showApiKey ? "Masquer" : "Voir"}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="baseUrl" className="mb-2 block text-sm font-medium text-zinc-200">
                  Base URL compatible OpenAI
                </label>
                <input
                  id="baseUrl"
                  type="url"
                  value={settings.baseUrl}
                  onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
                  placeholder="https://openrouter.ai/api/v1"
                />
              </div>

              <div>
                <label htmlFor="model" className="mb-2 block text-sm font-medium text-zinc-200">
                  Modèle
                </label>
                <input
                  id="model"
                  list="models"
                  value={settings.model}
                  onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
                  placeholder="openai/gpt-4o-mini"
                />
                <datalist id="models">
                  {suggestedModels.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={clearSettings}
                className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
              >
                Réinitialiser
              </button>
              {saved ? <span className="text-sm text-emerald-300">Configuration enregistrée.</span> : null}
            </div>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-lg font-semibold">État</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500">Clé</dt>
                <dd className="mt-1 font-mono text-zinc-200">{keyStatus}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Fournisseur</dt>
                <dd className="mt-1 break-all text-zinc-200">{settings.baseUrl}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Modèle</dt>
                <dd className="mt-1 text-zinc-200">{settings.model}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">
              Ne partagez jamais votre clé dans le chat. Pour une version multi-utilisateur, remplacez localStorage par un coffre de secrets côté serveur.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
