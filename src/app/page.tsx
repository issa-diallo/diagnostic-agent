"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

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

const STARTER_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Bonjour, je suis votre assistant de diagnostic. Décrivez un processus manuel et je vous aiderai à décider s’il faut ne rien automatiser, lancer un POC ou construire un MVP.",
  },
];

const quickPrompts = [
  "Qualifier les emails entrants du support client",
  "Automatiser la création de devis depuis un formulaire",
  "Relancer les prospects après un rendez-vous commercial",
  "Trier des documents et extraire les informations clés",
];

function loadSettings(): LlmSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Home() {
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => setSettings(loadSettings()));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const hasApiKey = useMemo(() => settings.apiKey.trim().length > 0, [settings.apiKey]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      if (!settings.apiKey.trim()) {
        throw new Error("Ajoutez d’abord votre clé API dans Settings.");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          baseUrl: settings.baseUrl,
          model: settings.model,
          messages: nextMessages.map(({ role, content: messageContent }) => ({
            role,
            content: messageContent,
          })),
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };
      const assistantMessage = data.message;
      if (!response.ok || !assistantMessage) {
        throw new Error(data.error ?? "Le modèle n’a pas renvoyé de réponse.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: assistantMessage,
        },
      ]);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur inconnue.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Je n’ai pas pu appeler le LLM : ${message}`,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-white/10 bg-black/30 p-4 lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30">
              DA
            </div>
            <div>
              <p className="font-semibold">Diagnostic Agent</p>
              <p className="text-xs text-zinc-500">POC ou MVP ?</p>
            </div>
          </div>

          <button className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-white/10">
            + Nouveau diagnostic
          </button>

          <div className="space-y-3 text-sm text-zinc-400">
            <p className="px-1 text-xs uppercase tracking-[0.2em] text-zinc-600">Cadre de décision</p>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-medium text-zinc-200">L’assistant évalue :</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5">
                <li>volume et répétition du processus</li>
                <li>règles métier et exceptions</li>
                <li>ROI et risques opérationnels</li>
                <li>recommandation : rien, POC ou MVP</li>
              </ul>
            </div>
          </div>

          <div className="mt-auto rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-100">
            {hasApiKey ? "Clé API configurée localement." : "Clé API à configurer dans Settings."}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#08090d]/85 px-4 py-4 backdrop-blur md:px-8">
            <div>
              <p className="text-sm text-zinc-500">Chat</p>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Assistant diagnostic automatisation</h1>
            </div>
            <Link
              href="/settings"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              Settings
            </Link>
          </header>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 md:px-8">
            <div className="mb-6 grid gap-3 md:grid-cols-4">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto pb-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[min(760px,90%)] rounded-3xl px-5 py-4 text-sm leading-7 shadow-2xl shadow-black/20 ${
                      message.role === "user"
                        ? "bg-cyan-300 text-slate-950"
                        : "border border-white/10 bg-white/[0.06] text-zinc-100"
                    }`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
                      {message.role === "user" ? "Vous" : "Diagnostic Agent"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </article>
              ))}

              {isSending ? (
                <div className="flex justify-start">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm text-zinc-300">
                    Analyse en cours…
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {error ? (
              <div className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/30 backdrop-blur">
              <label htmlFor="message" className="sr-only">
                Message
              </label>
              <textarea
                id="message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                placeholder="Décrivez le processus manuel à analyser…"
                rows={3}
                className="min-h-24 w-full resize-none bg-transparent px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
              <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 pt-3">
                <p className="text-xs text-zinc-500">
                  Modèle : <span className="text-zinc-300">{settings.model}</span>
                </p>
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
