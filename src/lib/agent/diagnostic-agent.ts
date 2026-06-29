import { AgentResponse, DiagnosticAgentState } from "./diagnostic-state";
import { getNextQuestion, normalizeState, selectCurrentSkill, updateStateFromMessage } from "./agent-orchestrator";
import { loadDiagnosticSkills } from "./skill-loader";
import { buildDiagnosticSystemPrompt } from "./prompts";

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

type LlmAgentPayload = {
  answer?: string;
  nextQuestion?: string;
  usedSkill?: string;
  stage?: DiagnosticAgentState["stage"];
  missingInformation?: string[];
  statePatch?: Partial<DiagnosticAgentState>;
  provisionalRecommendation?: AgentResponse["provisionalRecommendation"] | null;
};

function normalizeBaseUrl(baseUrl?: string) {
  const cleaned = (baseUrl || "https://openrouter.ai/api/v1").trim().replace(/\/$/, "");
  if (!cleaned.startsWith("https://")) throw new Error("La Base URL doit être en HTTPS.");
  return cleaned;
}

function safeJsonFromText(text: string): LlmAgentPayload | null {
  try {
    return JSON.parse(text) as LlmAgentPayload;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as LlmAgentPayload;
    } catch {
      return null;
    }
  }
}

function localFallback(message: string, state: DiagnosticAgentState): AgentResponse {
  const updatedState = updateStateFromMessage(message, state);
  const usedSkill = selectCurrentSkill(updatedState);
  const nextQuestion = getNextQuestion(updatedState);
  return {
    answer: `D’accord, je note. ${nextQuestion}`,
    nextQuestion,
    usedSkill,
    stage: updatedState.stage,
    missingInformation: updatedState.missingInformation,
    updatedState,
    provisionalRecommendation: updatedState.recommendation,
  };
}

export async function runDiagnosticAgent(input: {
  message: string;
  state: DiagnosticAgentState;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): Promise<AgentResponse> {
  const cleanMessage = input.message.trim().slice(0, 4_000);
  const state = normalizeState(input.state);
  const locallyUpdated = updateStateFromMessage(cleanMessage, {
    ...state,
    conversation: [...state.conversation, { role: "user", content: cleanMessage }],
  });

  if (!input.apiKey?.trim()) {
    return localFallback(cleanMessage, locallyUpdated);
  }

  const skills = await loadDiagnosticSkills();
  const systemPrompt = buildDiagnosticSystemPrompt(skills);
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const model = input.model?.trim() || "openai/gpt-4o-mini";

  const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey.trim()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://diagnostic-agent.local",
      "X-Title": "Diagnostic Agent",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            message: cleanMessage,
            state: locallyUpdated,
            instruction: "Retourne uniquement le JSON demandé. Mets à jour seulement les champs dont tu es sûr.",
          }),
        },
      ],
      temperature: 0.2,
    }),
  });

  const data = (await upstreamResponse.json()) as OpenAiChatResponse;
  if (!upstreamResponse.ok) {
    throw new Error(data.error?.message ?? "Erreur du fournisseur LLM.");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) return localFallback(cleanMessage, locallyUpdated);

  const parsed = safeJsonFromText(content);
  if (!parsed) return localFallback(cleanMessage, locallyUpdated);

  const mergedState = normalizeState({
    ...locallyUpdated,
    ...(parsed.statePatch ?? {}),
    conversation: [
      ...locallyUpdated.conversation,
      { role: "assistant", content: parsed.answer || parsed.nextQuestion || getNextQuestion(locallyUpdated) },
    ],
  });
  const updatedState = updateStateFromMessage("", mergedState);
  const nextQuestion = parsed.nextQuestion || getNextQuestion(updatedState);
  const usedSkill = parsed.usedSkill || selectCurrentSkill(updatedState);

  return {
    answer: parsed.answer || nextQuestion,
    nextQuestion,
    usedSkill,
    stage: parsed.stage || updatedState.stage,
    missingInformation: parsed.missingInformation ?? updatedState.missingInformation,
    updatedState,
    provisionalRecommendation: parsed.provisionalRecommendation ?? updatedState.recommendation,
  };
}
