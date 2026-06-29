import { NextRequest, NextResponse } from "next/server";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  messages?: IncomingMessage[];
};

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const SYSTEM_PROMPT = `Tu es Diagnostic Agent, un assistant français spécialisé en diagnostic d'automatisation pour PME.
Ton objectif est d'aider à décider entre : ne rien automatiser, lancer un POC, ou construire un MVP.
Pose des questions utiles si le contexte manque. Quand c'est possible, structure la réponse avec : processus, volume, règles, exceptions, risques, ROI, recommandation et prochaines étapes.`;

function normalizeBaseUrl(baseUrl?: string) {
  const cleaned = (baseUrl || "https://openrouter.ai/api/v1").trim().replace(/\/$/, "");
  if (!cleaned.startsWith("https://")) {
    throw new Error("La Base URL doit être en HTTPS.");
  }
  return cleaned;
}

function validateMessages(messages?: IncomingMessage[]) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error("Aucun message à envoyer.");
  }

  return messages.slice(-12).map((message) => ({
    role: message.role,
    content: String(message.content ?? "").slice(0, 8_000),
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim() || "openai/gpt-4o-mini";
    const baseUrl = normalizeBaseUrl(body.baseUrl);
    const messages = validateMessages(body.messages);

    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante." }, { status: 400 });
    }

    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": request.nextUrl.origin,
        "X-Title": "Diagnostic Agent",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.3,
      }),
    });

    const data = (await upstreamResponse.json()) as OpenAiChatResponse;
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? "Erreur du fournisseur LLM." },
        { status: upstreamResponse.status },
      );
    }

    const message = data.choices?.[0]?.message?.content;
    if (!message) {
      return NextResponse.json({ error: "Réponse LLM vide." }, { status: 502 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
