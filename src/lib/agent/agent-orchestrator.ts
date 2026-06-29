import {
  createEmptyDiagnosticAgentState,
  DiagnosticAgentState,
  DiagnosticRecommendation,
  DiagnosticStage,
  RecommendationDecision,
} from "./diagnostic-state";

const MANUAL_SIGNAL_PATTERNS: Array<[string, RegExp]> = [
  ["copier-coller", /copier|coller|copy|paste/i],
  ["saisie manuelle", /saisie|ressais|manuel|à la main/i],
  ["lecture PDF", /pdf|scan|ocr/i],
  ["transformation Excel", /excel|csv|tableau|spreadsheet/i],
  ["emails répétitifs", /mail|email|e-mail|relance/i],
  ["contrôle entre fichiers", /contrôl|controle|compar|rapproch|écart/i],
  ["recherche d’informations", /recherch|retrouver|chercher/i],
  ["génération de documents", /génér|document|rapport|pdf/i],
];

const TOOL_PATTERNS: Array<[string, RegExp]> = [
  ["Excel", /excel|csv|tableau/i],
  ["PDF", /pdf|scan|ocr/i],
  ["email", /mail|email|e-mail|outlook|gmail/i],
  ["ERP", /erp|sage|sap|odoo|divalto/i],
  ["CRM", /crm|hubspot|pipedrive|salesforce/i],
  ["Google Drive", /drive|google drive/i],
];

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstNumber(message: string) {
  const match = message.match(/\d+(?:[,.]\d+)?/);
  if (!match) return undefined;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

function numberNear(message: string, pattern: RegExp) {
  const matches = Array.from(message.matchAll(/\d+(?:[,.]\d+)?/g));
  for (const match of matches) {
    const index = match.index ?? 0;
    const window = message.slice(Math.max(0, index - 30), index + 50);
    if (pattern.test(window)) {
      const value = Number(match[0].replace(",", "."));
      return Number.isFinite(value) ? value : undefined;
    }
  }
  return undefined;
}

function numberFromMatch(message: string, pattern: RegExp) {
  const match = message.match(pattern);
  const value = match?.find((part, index) => index > 0 && /^\d/.test(part ?? ""));
  if (!value) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function textFromMatch(message: string, pattern: RegExp) {
  const match = message.match(pattern);
  return match?.[1]?.trim().slice(0, 120);
}

function shortProcessName(state: DiagnosticAgentState) {
  if (!state.processName) return "ce processus";
  return state.processName.length > 80 ? "ce processus" : state.processName;
}

export function normalizeState(state?: Partial<DiagnosticAgentState>): DiagnosticAgentState {
  const empty = createEmptyDiagnosticAgentState();
  return {
    ...empty,
    ...state,
    painPoints: state?.painPoints ?? empty.painPoints,
    toolsUsed: state?.toolsUsed ?? empty.toolsUsed,
    filesUsed: state?.filesUsed ?? empty.filesUsed,
    manualTasks: state?.manualTasks ?? empty.manualTasks,
    risks: state?.risks ?? empty.risks,
    missingInformation: state?.missingInformation ?? empty.missingInformation,
    conversation: state?.conversation ?? empty.conversation,
  };
}

export function computeRoi(state: DiagnosticAgentState): DiagnosticAgentState {
  const volume = state.monthlyVolume;
  const current = state.timePerCaseMinutes;
  const target = state.targetTimeMinutes ?? 0;
  const hourlyCost = state.hourlyCost ?? 45;

  if (!volume || !current || current <= target) return state;

  const monthlyHoursSaved = ((current - target) * volume) / 60;
  const monthlyGain = monthlyHoursSaved * hourlyCost;
  return {
    ...state,
    hourlyCost,
    roi: {
      monthlyHoursSaved,
      monthlyGain,
      annualGain: monthlyGain * 12,
    },
  };
}

export function selectCurrentSkill(state: DiagnosticAgentState): string {
  if (!state.processName || !state.company || !state.activity) return "process-discovery";
  if (state.manualTasks.length === 0 && state.painPoints.length > 0) return "manual-work-detection";
  if (!state.monthlyVolume || !state.timePerCaseMinutes) return "roi-diagnostic";
  if (state.hasExamples === undefined || state.stableStructure === undefined || state.rulesDocumented === undefined) return "automation-feasibility";
  if (!state.recommendation) return "poc-mvp-recommendation";
  return "commercial-synthesis";
}

function stageForSkill(skill: string): DiagnosticStage {
  switch (skill) {
    case "manual-work-detection":
      return "manual_work_detection";
    case "roi-diagnostic":
      return "roi_diagnostic";
    case "automation-feasibility":
      return "automation_feasibility";
    case "poc-mvp-recommendation":
      return "recommendation";
    case "commercial-synthesis":
      return "commercial_synthesis";
    default:
      return "process_discovery";
  }
}

function computeMissingInformation(state: DiagnosticAgentState): string[] {
  const missing: string[] = [];
  if (!state.company) missing.push("entreprise");
  if (!state.activity) missing.push("activité");
  if (!state.processName) missing.push("processus précis");
  if (state.painPoints.length === 0) missing.push("douleur principale");
  if (state.manualTasks.length === 0) missing.push("tâches manuelles répétitives");
  if (!state.monthlyVolume) missing.push("volume mensuel");
  if (!state.timePerCaseMinutes) missing.push("temps par dossier");
  if (state.hasExamples === undefined) missing.push("exemples réels");
  if (state.stableStructure === undefined) missing.push("stabilité des fichiers");
  if (state.rulesDocumented === undefined) missing.push("règles métier documentées");
  if (!state.validatorIdentified) missing.push("validateur humain");
  return missing;
}

export function computeRecommendation(state: DiagnosticAgentState): DiagnosticAgentState {
  const withRoi = computeRoi(state);
  const monthlyGain = withRoi.roi?.monthlyGain ?? 0;
  const volume = withRoi.monthlyVolume ?? 0;
  const riskCount = withRoi.risks.length + (withRoi.stableStructure === false ? 1 : 0) + (withRoi.rulesDocumented === false ? 1 : 0);
  const hasDataProof = withRoi.hasExamples === true && withRoi.stableStructure !== false;
  const multiTool = withRoi.toolsUsed.some((tool) => /erp|crm|drive|pdf|excel|email/i.test(tool)) && withRoi.toolsUsed.length >= 3;

  let decision: RecommendationDecision = "poc";
  let confidence: DiagnosticRecommendation["confidence"] = "medium";
  let reason = "Le besoin semble réel, mais il faut le prouver sur quelques exemples représentatifs.";

  if (volume < 3 || monthlyGain < 250) {
    decision = "nothing";
    confidence = "medium";
    reason = "Le volume ou le gain estimé ne justifie pas encore un investissement d’automatisation.";
  } else if (!hasDataProof || riskCount >= 2) {
    decision = "audit";
    confidence = "medium";
    reason = "Les données, règles ou exemples ne sont pas assez prouvés pour promettre directement un POC/MVP fiable.";
  } else if (monthlyGain >= 2500 && volume >= 20 && multiTool) {
    decision = "full_project";
    confidence = "medium";
    reason = "L’enjeu est fort, récurrent et semble impliquer plusieurs outils ; il faut cadrer un projet complet avec intégrations et validation métier.";
  } else if (monthlyGain >= 1200 && volume >= 10 && riskCount === 0) {
    decision = "mvp";
    confidence = "high";
    reason = "Le ROI est clair et les règles semblent assez stables pour viser une première version opérationnelle.";
  }

  return {
    ...withRoi,
    recommendation: { decision, confidence, reason },
  };
}

export function updateStateFromMessage(message: string, state: DiagnosticAgentState): DiagnosticAgentState {
  const lower = message.toLowerCase();
  const detectedTools = TOOL_PATTERNS.filter(([, pattern]) => pattern.test(message)).map(([tool]) => tool);
  const detectedTasks = MANUAL_SIGNAL_PATTERNS.filter(([, pattern]) => pattern.test(message)).map(([task]) => task);
  const number = firstNumber(message);
  const monthlyVolume =
    numberFromMatch(message, /(\d+(?:[,.]\d+)?)\s*(?:fois|dossiers?|fichiers?|tickets?|commandes?|packing lists?)\s*(?:par|\/)?\s*mois/i) ??
    numberNear(message, /fois|dossier|fichier|ticket|commande|mois|mensuel/i);
  const timePerCase =
    numberFromMatch(message, /(\d+(?:[,.]\d+)?)\s*(?:minutes?|min)\b/i) ??
    numberNear(message, /minute|min|temps|prend|environ|par fichier|par dossier/i);
  const targetTime = numberFromMatch(message, /(\d+(?:[,.]\d+)?)\s*(?:minutes?|min).*?(?:cible|reste|restera|après|apres)/i) ?? numberNear(message, /cible|reste|restera|après|apres/i);
  const hourlyCost = numberFromMatch(message, /(\d+(?:[,.]\d+)?)\s*(?:€|eur).*?(?:heure|horaire|h\b)/i) ?? numberNear(message, /€|eur|heure|horaire|coût|cout/i);
  let next = { ...state };

  if (!next.company && /entreprise|société|societe|boîte|boite/i.test(lower)) next.company = textFromMatch(message, /(?:entreprise|société|societe|boîte|boite)\s+([^,.]+)/i) ?? message.slice(0, 120);
  if (!next.processName && /process|packing|facture|commande|relance|support|ticket|document|fichier/i.test(lower)) next.processName = message.slice(0, 160);
  if (!next.activity && /activité|metier|métier|logistique|commerce|service|industrie|cabinet/i.test(lower)) next.activity = textFromMatch(message, /(?:activité|metier|métier)\s+([^,.]+)/i) ?? message.slice(0, 160);
  if (/douleur|problème|probleme|bloque|stress|perd|retard|erreur/i.test(lower)) next.painPoints = unique([...next.painPoints, message.slice(0, 180)]);
  if (detectedTools.length) next.toolsUsed = unique([...next.toolsUsed, ...detectedTools]);
  if (detectedTasks.length) next.manualTasks = unique([...next.manualTasks, ...detectedTasks]);
  if (/risque|exception|donnée sale|donnees sales|règle floue|regle floue|variable/i.test(lower)) next.risks = unique([...next.risks, message.slice(0, 140)]);
  if (/exemple|fichier réel|fichier reel|document réel|document reel/i.test(lower)) next.hasExamples = !/pas|non|aucun/i.test(lower);
  if (/stable|même structure|meme structure|toujours pareil/i.test(lower)) next.stableStructure = !/pas|non|variable|change/i.test(lower);
  if (/règle|regle|documenté|documente|écrit|ecrit/i.test(lower)) next.rulesDocumented = !/pas|non|dans la tête|dans la tete/i.test(lower);

  if (monthlyVolume && !next.monthlyVolume) next.monthlyVolume = monthlyVolume;
  if (timePerCase && !next.timePerCaseMinutes) next.timePerCaseMinutes = timePerCase;
  if (targetTime && !next.targetTimeMinutes) next.targetTimeMinutes = targetTime;
  if (hourlyCost && !next.hourlyCost) next.hourlyCost = hourlyCost;
  if (number) {
    if (/fois|dossier|fichier|ticket|commande|mois|mensuel/i.test(lower) && !next.monthlyVolume) next.monthlyVolume = number;
    else if (/minute|min|temps|prend/i.test(lower) && !next.timePerCaseMinutes) next.timePerCaseMinutes = number;
    else if (/cible|reste|restera|après|apres/i.test(lower) && !next.targetTimeMinutes) next.targetTimeMinutes = number;
    else if (/€|eur|heure|horaire|coût|cout/i.test(lower) && !next.hourlyCost) next.hourlyCost = number;
  }

  next.missingInformation = computeMissingInformation(next);
  const skill = selectCurrentSkill(next);
  next.stage = stageForSkill(skill);
  next = computeRecommendation(next);
  next.missingInformation = computeMissingInformation(next);
  return next;
}

export function getNextQuestion(state: DiagnosticAgentState): string {
  const missing = computeMissingInformation(state);
  const process = shortProcessName(state);
  if (!state.company) return "Pour commencer, vous pouvez me rappeler le nom de votre entreprise ?";
  if (!state.activity) return "Vous pouvez me décrire simplement votre activité en une phrase ?";
  if (!state.processName) return "Quel processus précis voulez-vous qu’on regarde ensemble aujourd’hui ?";
  if (state.painPoints.length === 0) return `Sur ${process}, qu’est-ce qui vous fait perdre le plus de temps ou crée le plus de stress ?`;
  if (state.manualTasks.length === 0) return "Qu’est-ce qui est fait manuellement aujourd’hui : copier-coller, saisie, contrôle, lecture de fichiers, emails ?";
  if (!state.monthlyVolume) return "Combien de fois par mois ce cas se présente environ ?";
  if (!state.timePerCaseMinutes) return "Combien de minutes prend un traitement complet aujourd’hui ?";
  if (state.hasExamples === undefined) return "Est-ce que vous avez quelques exemples réels à me montrer pour vérifier la faisabilité ?";
  if (state.stableStructure === undefined) return "Les fichiers ou demandes se ressemblent-ils la plupart du temps, ou est-ce très variable ?";
  if (state.rulesDocumented === undefined) return "Les règles métier sont-elles écrites quelque part, ou surtout dans la tête de l’équipe ?";
  if (!state.validatorIdentified) return "Qui serait la bonne personne pour valider les premiers résultats de l’agent ?";
  if (missing.length > 0) return `Il me manque surtout : ${missing[0]}. Vous pouvez me préciser ce point ?`;
  return "J’ai assez d’éléments pour préparer une synthèse. Voulez-vous générer la synthèse finale ?";
}
