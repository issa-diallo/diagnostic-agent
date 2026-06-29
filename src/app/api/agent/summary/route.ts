import { NextResponse } from "next/server";
import { DiagnosticAgentState, DiagnosticRecommendation, FinalSummaryResponse } from "@/lib/agent/diagnostic-state";
import { computeRecommendation, normalizeState } from "@/lib/agent/agent-orchestrator";
import { loadDiagnosticSkills } from "@/lib/agent/skill-loader";

type SummaryRequestBody = {
  state?: Partial<DiagnosticAgentState>;
  apiKey?: unknown;
  baseUrl?: unknown;
  model?: unknown;
};

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function optionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeBaseUrl(baseUrl?: string) {
  const cleaned = (baseUrl || "https://openrouter.ai/api/v1").trim().replace(/\/$/, "");
  if (!cleaned.startsWith("https://")) throw new Error("La Base URL doit être en HTTPS.");
  return cleaned;
}

function decisionLabel(decision: DiagnosticRecommendation["decision"]) {
  return {
    nothing: "Ne rien faire",
    audit: "Audit complémentaire",
    poc: "POC",
    mvp: "MVP",
    full_project: "Projet complet",
  }[decision];
}

function formatCurrency(value?: number) {
  if (value === undefined) return "ROI à compléter";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, style: "currency", currency: "EUR" }).format(value);
}

function buildLocalSummary(state: DiagnosticAgentState): FinalSummaryResponse {
  const computed = computeRecommendation(state);
  const recommendation = computed.recommendation ?? {
    decision: "audit" as const,
    confidence: "low" as const,
    reason: "Les informations sont insuffisantes pour recommander un projet sans audit complémentaire.",
  };
  const roiLine = computed.roi
    ? `${computed.roi.monthlyHoursSaved.toFixed(1).replace(".", ",")} h/mois, ${formatCurrency(computed.roi.monthlyGain)} / mois, ${formatCurrency(computed.roi.annualGain)} / an`
    : "ROI à compléter";

  const summaryMarkdown = `# Synthèse diagnostic — ${computed.company || "Client"}

## 1. Contexte
- Entreprise : ${computed.company || "à préciser"}
- Contact : ${computed.contact || "à préciser"}
- Activité : ${computed.activity || "à préciser"}

## 2. Processus analysé
${computed.processName || "Processus à préciser"}

## 3. Douleurs identifiées
${computed.painPoints.length ? computed.painPoints.map((pain) => `- ${pain}`).join("\n") : "- À compléter"}

## 4. Opportunités d’automatisation
${computed.manualTasks.length ? computed.manualTasks.map((task) => `- ${task}`).join("\n") : "- À confirmer avec des exemples réels"}

## 5. ROI estimé
${roiLine}

## 6. Faisabilité
- Exemples réels : ${computed.hasExamples ? "oui" : "à demander"}
- Structure stable : ${computed.stableStructure === undefined ? "à confirmer" : computed.stableStructure ? "oui" : "non / variable"}
- Règles documentées : ${computed.rulesDocumented === undefined ? "à confirmer" : computed.rulesDocumented ? "oui" : "non"}
- Validateur : ${computed.validatorIdentified || "à identifier"}

## 7. Risques
${computed.risks.length ? computed.risks.map((risk) => `- ${risk}`).join("\n") : "- Données, exceptions et règles à vérifier sur exemples"}

## 8. Recommandation
${decisionLabel(recommendation.decision)} — ${recommendation.reason}

## 9. Prochaine étape
${recommendation.decision === "nothing" ? "Ne pas lancer de projet pour l’instant ; revisiter si le volume augmente." : "Demander quelques exemples réels et cadrer la prochaine étape avec un périmètre prudent."}`;

  const followUpEmail = `Bonjour,

Merci pour l’échange. Voici ce que je retiens : le processus concerné est ${computed.processName || "à préciser"}, avec un enjeu autour de ${computed.painPoints[0] || "temps, fiabilité ou charge manuelle"}.

Ma recommandation à ce stade : ${decisionLabel(recommendation.decision)}. ${recommendation.reason}

Pour avancer prudemment, l’étape utile serait de récupérer quelques exemples réels de fichiers/demandes et de valider les règles métier avant de promettre une automatisation complète.

Bien cordialement,
Issa`;

  const crmNote = `Diagnostic ${computed.company || "client"} — recommandation : ${decisionLabel(recommendation.decision)}. Processus : ${computed.processName || "à préciser"}. ROI : ${roiLine}. Infos manquantes : ${computed.missingInformation.join(", ") || "aucune"}.`;

  return { summaryMarkdown, followUpEmail, crmNote, recommendation };
}

function parseSummaryPayload(text: string): FinalSummaryResponse | null {
  try {
    return JSON.parse(text) as FinalSummaryResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as FinalSummaryResponse;
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummaryRequestBody;
    const state = computeRecommendation(normalizeState(body.state));
    const apiKey = optionalString(body.apiKey)?.trim();

    if (!apiKey) return NextResponse.json(buildLocalSummary(state));

    const skills = await loadDiagnosticSkills();
    const commercialSynthesis = skills["commercial-synthesis"] || "";
    const baseUrl = normalizeBaseUrl(optionalString(body.baseUrl));
    const model = optionalString(body.model)?.trim() || "openai/gpt-4o-mini";

    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://diagnostic-agent.local",
        "X-Title": "Diagnostic Agent",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Tu génères une synthèse commerciale prudente en français. Utilise cette skill:\n${commercialSynthesis}\nRetourne uniquement un JSON avec summaryMarkdown, followUpEmail, crmNote, recommendation. Ne jamais inventer les chiffres manquants.`,
          },
          { role: "user", content: JSON.stringify({ state }) },
        ],
        temperature: 0.2,
      }),
    });

    const data = (await upstreamResponse.json()) as OpenAiChatResponse;
    if (!upstreamResponse.ok) {
      return NextResponse.json(buildLocalSummary(state));
    }

    const parsed = data.choices?.[0]?.message?.content ? parseSummaryPayload(data.choices[0].message.content) : null;
    return NextResponse.json(parsed ?? buildLocalSummary(state));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = /Base URL|HTTPS/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
