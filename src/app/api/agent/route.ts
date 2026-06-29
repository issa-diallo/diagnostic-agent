import { NextResponse } from "next/server";
import { DiagnosticAgentState } from "@/lib/agent/diagnostic-state";
import { runDiagnosticAgent } from "@/lib/agent/diagnostic-agent";

type AgentRequestBody = {
  message?: unknown;
  state?: Partial<DiagnosticAgentState>;
  apiKey?: unknown;
  baseUrl?: unknown;
  model?: unknown;
};

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentRequestBody;
    const message = optionalString(body.message)?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message invalide." }, { status: 400 });
    }

    if (message.length > 4_000) {
      return NextResponse.json({ error: "Message trop long. Limite : 4000 caractères." }, { status: 400 });
    }

    const response = await runDiagnosticAgent({
      message,
      state: (body.state ?? {}) as DiagnosticAgentState,
      apiKey: optionalString(body.apiKey),
      baseUrl: optionalString(body.baseUrl),
      model: optionalString(body.model),
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = /Base URL|fournisseur LLM|HTTPS/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
