"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AgentMessage, AgentResponse, DiagnosticAgentState, FinalSummaryResponse } from "@/lib/agent/diagnostic-state";

type StageId = "process" | "mapping" | "roi" | "feasibility" | "recommendation";
type FlowStatus = "idle" | "running" | "done";
type AppMode = "guided" | "agent";
type Recommendation = "Ne rien faire" | "Audit complémentaire" | "POC" | "MVP" | "Projet complet";
type Complexity = "Simple" | "Moyen" | "Complexe";
type InterestLevel = "Faible" | "Moyen" | "Fort";
type ProcessCategory = "emails" | "documents" | "crm" | "support" | "backoffice" | "logistics" | "other";
type AnswerKind = "text" | "number" | "yesno" | "choice";
type DiagnosticSkillId = "process-discovery" | "manual-work-detection" | "roi-diagnostic" | "automation-feasibility" | "poc-mvp-recommendation" | "commercial-synthesis";

type DiagnosticSkill = {
  id: DiagnosticSkillId;
  label: string;
  objective: string;
  whenToUse: string;
  questions: string[];
  signals: string[];
  reasoning: string;
  output: string;
  pitfalls: string[];
};

type CategoryConfig = {
  label: string;
  description: string;
  typicalTasks: string[];
  typicalInputs: string[];
  typicalOutputs: string[];
  typicalControls: string[];
  typicalTools: string[];
  filesToRequest: string;
};

type ProspectInfo = {
  company: string;
  contact: string;
  activity: string;
  context: string;
  meetingDate: string;
};

type ProcessMap = {
  trigger: string;
  inputs: string;
  treatment: string;
  controls: string;
  output: string;
  transmission: string;
};

type RoiInputs = {
  currentMinutes: string;
  targetMinutes: string;
  monthlyVolume: string;
  hourlyCost: string;
};

type FeasibilityInputs = {
  hasExamples: boolean;
  stableStructure: boolean;
  rulesDocumented: boolean;
  validatorIdentified: boolean;
  outputTemplate: boolean;
  manyExceptions: boolean;
  needsErp: boolean;
  notes: string;
};

type DiagnosticState = {
  prospect: ProspectInfo;
  category: ProcessCategory;
  processName: string;
  pain: string;
  tools: string;
  people: string;
  frequentErrors: string;
  errorCost: string;
  dependencies: string;
  idealResult: string;
  processMap: ProcessMap;
  roi: RoiInputs;
  qualitativeGains: string[];
  feasibility: FeasibilityInputs;
  nextAction: string;
  interestLevel: InterestLevel;
  objections: string;
  filesToRequest: string;
  followUpDate: string;
};

type TranscriptItem = {
  id: string;
  questionId?: string;
  stage: StageId;
  question: string;
  answer: string;
};

type Question = {
  id: string;
  stage: StageId;
  title: string;
  objective: string;
  prompt: string;
  why: string;
  placeholder?: string;
  kind?: AnswerKind;
  choices?: string[];
};

const STORAGE_KEY = "diagnostic-agent:guided-diagnostic";
const AGENT_STORAGE_KEY = "diagnostic-agent:agent-diagnostic";
const SETTINGS_STORAGE_KEY = "diagnostic-agent:llm-settings";
const EXPORT_VERSION = 3;

type LlmSettings = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

const DEFAULT_LLM_SETTINGS: LlmSettings = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  baseUrl: "https://openrouter.ai/api/v1",
};

function readLlmSettings(): LlmSettings {
  if (typeof window === "undefined") return DEFAULT_LLM_SETTINGS;
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return stored ? { ...DEFAULT_LLM_SETTINGS, ...JSON.parse(stored) } : DEFAULT_LLM_SETTINGS;
  } catch {
    return DEFAULT_LLM_SETTINGS;
  }
}

function emptyAgentState(): DiagnosticAgentState {
  return {
    stage: "process_discovery",
    painPoints: [],
    toolsUsed: [],
    filesUsed: [],
    manualTasks: [],
    risks: [],
    missingInformation: ["entreprise", "processus", "volume mensuel", "temps par dossier", "exemples réels"],
    conversation: [],
  };
}

const CATEGORY_CONFIGS: Record<ProcessCategory, CategoryConfig> = {
  emails: {
    label: "Emails & relances",
    description: "Traitement de boîtes mail, demandes entrantes, relances et réponses préparées.",
    typicalTasks: ["trier les emails entrants", "préparer une réponse", "relancer les clients ou fournisseurs", "extraire une demande depuis un email"],
    typicalInputs: ["emails", "pièces jointes", "historique client", "modèles de réponse"],
    typicalOutputs: ["réponse prête à valider", "ticket", "ligne CRM", "relance planifiée"],
    typicalControls: ["ton de la réponse", "données client", "pièce jointe correcte", "validation humaine avant envoi"],
    typicalTools: ["Gmail/Outlook", "IMAP", "CRM", "Drive", "ERP"],
    filesToRequest: "5 à 10 emails représentatifs, modèles de réponse, règles de tri et exemples de relances",
  },
  documents: {
    label: "Documents, PDF & Excel",
    description: "Lecture, contrôle, extraction ou génération de documents métier.",
    typicalTasks: ["extraire des informations d'un PDF", "contrôler un fichier Excel", "comparer deux documents", "générer un document standard"],
    typicalInputs: ["PDF", "Excel", "CSV", "bons de commande", "factures", "contrats"],
    typicalOutputs: ["tableau contrôlé", "rapport d'écarts", "document généré", "alerte d'anomalie"],
    typicalControls: ["champs obligatoires", "montants", "dates", "cohérence entre documents", "format attendu"],
    typicalTools: ["Excel", "Drive/SharePoint", "ERP", "logiciel métier", "email"],
    filesToRequest: "3 à 5 documents d'entrée, un exemple de sortie attendue et les règles de contrôle",
  },
  crm: {
    label: "CRM, ventes & relances",
    description: "Qualification prospect, compte rendu, scoring, relance et mise à jour CRM.",
    typicalTasks: ["résumer un rendez-vous", "mettre à jour une fiche CRM", "préparer une relance", "qualifier une opportunité"],
    typicalInputs: ["notes de RDV", "emails", "fiche prospect", "historique CRM", "critères de qualification"],
    typicalOutputs: ["fiche CRM complétée", "email de relance", "score d'intérêt", "prochaine action"],
    typicalControls: ["prochaine étape claire", "décisionnaire", "budget", "échéance", "objections"],
    typicalTools: ["HubSpot", "Pipedrive", "Notion", "Airtable", "Google Sheets", "email"],
    filesToRequest: "2 à 3 fiches CRM exemples, notes de rendez-vous, relances existantes et critères de qualification",
  },
  support: {
    label: "Support client",
    description: "Classification, réponse, escalade et suivi des demandes client.",
    typicalTasks: ["classer les demandes", "proposer une réponse", "détecter une urgence", "créer ou mettre à jour un ticket"],
    typicalInputs: ["tickets", "emails support", "FAQ", "historique client", "captures"],
    typicalOutputs: ["réponse brouillon", "priorité", "catégorie", "ticket enrichi", "escalade"],
    typicalControls: ["niveau d'urgence", "client concerné", "promesse commerciale", "validation avant réponse sensible"],
    typicalTools: ["Zendesk", "Freshdesk", "Intercom", "email", "Slack/Teams", "base de connaissances"],
    filesToRequest: "10 tickets ou emails support anonymisés, catégories actuelles, FAQ et exemples de bonnes réponses",
  },
  backoffice: {
    label: "Back-office administratif",
    description: "Saisie, contrôle, rapprochement, classement et reporting administratif.",
    typicalTasks: ["saisir des données", "rapprocher des informations", "préparer un reporting", "classer des documents"],
    typicalInputs: ["formulaires", "emails", "Excel", "exports ERP", "pièces administratives"],
    typicalOutputs: ["dossier complété", "tableau mis à jour", "rapport", "alerte"],
    typicalControls: ["champs manquants", "doublons", "cohérence dossier", "validation responsable"],
    typicalTools: ["Excel", "ERP", "Drive", "SharePoint", "logiciel métier", "email"],
    filesToRequest: "exports ou tableaux actuels, exemples de dossiers complets/incomplets et règles de validation",
  },
  logistics: {
    label: "Logistique, commandes & fichiers",
    description: "Contrôle de commandes, packing lists, expéditions, stocks et échanges fournisseurs.",
    typicalTasks: ["contrôler une packing list", "rapprocher commande et livraison", "détecter un écart", "préparer une notification"],
    typicalInputs: ["commandes", "packing lists", "factures", "exports stock", "emails fournisseur"],
    typicalOutputs: ["écarts détectés", "statut de contrôle", "email fournisseur", "mise à jour ERP"],
    typicalControls: ["références", "quantités", "prix", "dates", "incoterms", "doublons"],
    typicalTools: ["ERP", "Excel", "email", "WMS", "Drive/SharePoint"],
    filesToRequest: "3 à 5 commandes, packing lists ou exports réels, plus un exemple de contrôle validé",
  },
  other: {
    label: "Autre / à cadrer",
    description: "Sujet spécifique à clarifier avant de choisir un scénario d'automatisation.",
    typicalTasks: ["identifier un processus répétitif", "clarifier les règles", "définir un résultat utile"],
    typicalInputs: ["documents", "emails", "tableaux", "outils métier", "règles internes"],
    typicalOutputs: ["synthèse", "fichier mis à jour", "recommandation", "alerte", "tâche préparée"],
    typicalControls: ["règles métier", "exceptions", "validation humaine", "qualité des données"],
    typicalTools: ["Excel", "email", "Drive", "CRM", "ERP", "outil métier"],
    filesToRequest: "3 à 5 exemples représentatifs et une sortie idéale validée",
  },
};

function getCategoryConfig(category: ProcessCategory) {
  return CATEGORY_CONFIGS[category] ?? CATEGORY_CONFIGS.other;
}

function categoryLabel(category: ProcessCategory) {
  return getCategoryConfig(category).label;
}

function formatExamples(values: string[]) {
  return values.slice(0, 4).join(", ");
}

const DIAGNOSTIC_SKILLS: DiagnosticSkill[] = [
  {
    id: "process-discovery",
    label: "Process discovery",
    objective: "Faire décrire au client le processus réel, les personnes, fichiers, déclencheurs, volumes et erreurs.",
    whenToUse: "Dès le début du rendez-vous, avant toute recommandation ou solution.",
    questions: ["Quel est le processus aujourd’hui ?", "Qui intervient ?", "Quels fichiers ou outils sont utilisés ?", "À quel moment le problème commence ?", "Combien de fois par mois ?", "Combien de temps par dossier ?"],
    signals: ["processus flou", "plusieurs intervenants", "fichiers récurrents", "volume mensuel", "erreurs fréquentes"],
    reasoning: "Isoler un flux précis et assez fréquent avant de parler d’automatisation.",
    output: "Processus cadré avec déclencheur, entrées, traitement, contrôles, sortie et acteurs.",
    pitfalls: ["partir sur un sujet trop large", "parler solution avant d’avoir compris le flux", "oublier le volume"],
  },
  {
    id: "manual-work-detection",
    label: "Manual work detection",
    objective: "Repérer les tâches répétitives qui peuvent être préparées, contrôlées ou automatisées.",
    whenToUse: "Quand le client décrit les étapes, outils, fichiers et irritants.",
    questions: ["Qu’est-ce qui est fait à la main ?", "Y a-t-il du copier-coller ?", "Faut-il lire des PDF, transformer Excel, renommer ou envoyer des fichiers ?", "Quels contrôles sont répétitifs ?"],
    signals: ["copier-coller", "saisie manuelle", "renommage de fichiers", "lecture PDF", "transformation Excel", "emails répétitifs", "recherche d’informations", "contrôle entre fichiers"],
    reasoning: "Distinguer un simple problème d’outil d’un vrai processus répétitif avec règles métier.",
    output: "Liste des tâches automatisables et des tâches à garder en validation humaine.",
    pitfalls: ["tout automatiser trop vite", "ignorer les contrôles humains", "confondre inconfort ponctuel et processus récurrent"],
  },
  {
    id: "roi-diagnostic",
    label: "ROI diagnostic",
    objective: "Transformer le temps perdu et les erreurs en ordre de grandeur business.",
    whenToUse: "Après avoir identifié un processus et un volume minimal.",
    questions: ["Combien de minutes par dossier ?", "Combien de dossiers par mois ?", "Quel coût horaire utiliser ?", "Quelle erreur coûte le plus cher ?", "Quelle valeur commerciale indirecte ?"],
    signals: ["temps par tâche", "volume mensuel", "coût horaire", "risque d’erreur", "retard client", "litige"],
    reasoning: "Calculer gain mensuel et annuel, puis vérifier si le gain justifie POC, MVP ou projet.",
    output: "Temps gagné, gain mensuel, gain annuel et valeur qualitative.",
    pitfalls: ["recommander sans ROI", "supposer 100 % d’automatisation", "oublier le coût des erreurs"],
  },
  {
    id: "automation-feasibility",
    label: "Automation feasibility",
    objective: "Vérifier si l’automatisation est réaliste sans promettre trop vite.",
    whenToUse: "Avant de recommander POC, MVP ou projet complet.",
    questions: ["Les données sont-elles structurées ?", "Les règles sont-elles stables ?", "Les fichiers changent-ils souvent ?", "Y a-t-il beaucoup d’exceptions ?", "Faut-il OCR, ERP ou validation humaine ?"],
    signals: ["données sales", "règles floues", "exceptions nombreuses", "OCR", "ERP", "modèle de sortie absent", "validateur non identifié"],
    reasoning: "Qualifier la complexité et réduire la promesse si les données ou règles ne sont pas prouvées.",
    output: "Niveau de faisabilité, risques, prérequis et fichiers à demander.",
    pitfalls: ["promettre une automatisation totale", "ne pas demander d’exemples", "ignorer les exceptions"],
  },
  {
    id: "poc-mvp-recommendation",
    label: "POC / MVP recommendation",
    objective: "Choisir la suite prudente : ne rien faire, audit, POC, MVP ou projet complet.",
    whenToUse: "Une fois douleur, ROI, risques et faisabilité collectés.",
    questions: ["Le gain justifie-t-il d’avancer ?", "Les règles sont-elles assez claires ?", "Le client a-t-il des exemples ?", "La prochaine étape doit-elle être audit, POC, MVP ou projet complet ?"],
    signals: ["gain faible", "règles instables", "gain moyen", "règles claires", "processus fréquent", "plusieurs services impactés"],
    reasoning: "Adapter l’ambition au couple valeur business / maturité des données.",
    output: "Recommandation justifiée avec prochaine étape concrète.",
    pitfalls: ["vendre un MVP quand un audit suffit", "bloquer sur un POC si le ROI et la clarté justifient un MVP", "oublier la validation humaine"],
  },
  {
    id: "commercial-synthesis",
    label: "Commercial synthesis",
    objective: "Produire une synthèse exploitable après rendez-vous pour relance, CRM ou proposition.",
    whenToUse: "À la fin du diagnostic.",
    questions: ["Quel besoin résumer ?", "Quelle douleur principale ?", "Quel ROI ?", "Quels risques ?", "Quelle phrase commerciale envoyer au client ?"],
    signals: ["besoin clair", "douleur exprimée", "ROI estimé", "risques cadrés", "prochaine étape acceptée"],
    reasoning: "Transformer le diagnostic en décision commerciale claire, prudente et actionnable.",
    output: "Résumé du besoin, processus, douleurs, opportunité, ROI, risques, recommandation et prochaine étape.",
    pitfalls: ["rédiger trop technique", "oublier les risques", "ne pas terminer par une action"],
  },
];

function getSkill(id: DiagnosticSkillId) {
  return DIAGNOSTIC_SKILLS.find((skill) => skill.id === id) ?? DIAGNOSTIC_SKILLS[0];
}

function activeSkillIdsForQuestion(questionId?: string): DiagnosticSkillId[] {
  if (["company", "contact", "activity", "context", "category", "processName", "people", "trigger", "inputs", "transmission"].includes(questionId ?? "")) {
    return ["process-discovery"];
  }
  if (["pain", "tools", "treatment", "controls", "output", "frequentErrors"].includes(questionId ?? "")) {
    return ["manual-work-detection", "process-discovery"];
  }
  if (["currentMinutes", "targetMinutes", "monthlyVolume", "hourlyCost", "errorCost"].includes(questionId ?? "")) {
    return ["roi-diagnostic"];
  }
  if (["hasExamples", "stableStructure", "rulesDocumented", "validatorIdentified", "outputTemplate", "exceptions"].includes(questionId ?? "")) {
    return ["automation-feasibility"];
  }
  if (["idealResult", "nextAction", "interestLevel", "objections"].includes(questionId ?? "")) {
    return ["poc-mvp-recommendation", "commercial-synthesis"];
  }
  return ["process-discovery"];
}

function formatSkillLabels(ids: DiagnosticSkillId[]) {
  return ids.map((id) => getSkill(id).label).join(" + ");
}

function detectManualWorkSignals(diagnostic: DiagnosticState) {
  const source = [diagnostic.pain, diagnostic.tools, diagnostic.processMap.treatment, diagnostic.frequentErrors, diagnostic.processMap.controls].join(" ").toLowerCase();
  const signals: Array<[string, RegExp]> = [
    ["copier-coller", /copier|coller|copy|paste/],
    ["saisie manuelle", /saisie|ressais|manuel|à la main/],
    ["lecture PDF", /pdf|scan|ocr/],
    ["transformation Excel", /excel|csv|tableau|spreadsheet/],
    ["emails répétitifs", /mail|email|e-mail|relance/],
    ["contrôle entre fichiers", /contrôl|controle|compar|rapproch|écart/],
    ["recherche d’informations", /recherch|retrouver|chercher/],
    ["génération de documents", /génér|document|rapport|pdf/],
  ];
  return signals.filter(([, pattern]) => pattern.test(source)).map(([label]) => label);
}

function buildMethodSummary(diagnostic: DiagnosticState) {
  const signals = detectManualWorkSignals(diagnostic);
  return [
    `Skills métier utilisées : ${DIAGNOSTIC_SKILLS.map((skill) => skill.label).join(", ")}.`,
    `Signaux de travail manuel détectés : ${signals.length ? signals.join(", ") : "à confirmer pendant l’entretien"}.`,
    `Garde-fous : demander des exemples réels, vérifier la qualité des données, estimer le ROI, garder une validation humaine et ne pas promettre d’automatisation totale trop tôt.`,
  ].join("\n");
}

const questions: Question[] = [
  {
    id: "company",
    stage: "process",
    title: "Contexte client",
    objective: "Nommer l’entreprise sans jargon commercial.",
    prompt: "Pour commencer, vous pouvez me rappeler le nom de votre entreprise ?",
    why: "Je note le nom dès le départ pour que la synthèse finale soit claire et directement réutilisable.",
    placeholder: "Ex. ACME Logistics",
  },
  {
    id: "contact",
    stage: "process",
    title: "Contexte client",
    objective: "Comprendre le rôle de la personne présente.",
    prompt: "Et vous, quel est votre rôle dans l’entreprise ?",
    why: "Je veux savoir avec quel regard vous décrivez le problème : direction, opérationnel, commercial, support, administratif, etc.",
    placeholder: "Ex. responsable ADV, dirigeant, office manager",
  },
  {
    id: "activity",
    stage: "process",
    title: "Contexte client",
    objective: "Comprendre rapidement l’activité avant de parler automatisation.",
    prompt: "Vous pouvez me décrire simplement votre activité en une phrase ?",
    why: "Le contexte métier m’aide à adapter les prochaines questions et à éviter une recommandation générique.",
  },
  {
    id: "context",
    stage: "process",
    title: "Contexte du rendez-vous",
    objective: "Clarifier l’enjeu principal du prospect.",
    prompt: "Qu’est-ce qui fait que vous voulez regarder ce sujet maintenant ?",
    why: "Je cherche le déclencheur concret : surcharge, erreurs, croissance, nouveau client, audit, retard, etc.",
  },
  {
    id: "category",
    stage: "process",
    title: "Type de projet",
    objective: "Adapter immédiatement les questions au cas d’usage du client.",
    prompt: "Dans quelle famille se situe le sujet que vous voulez explorer ?",
    why: "Je vais adapter les prochaines questions avec des exemples métier plutôt que dérouler un questionnaire générique.",
    kind: "choice",
    choices: ["emails", "documents", "crm", "support", "backoffice", "logistics", "other"],
  },
  {
    id: "processName",
    stage: "process",
    title: "1. Identifier le processus",
    objective: "Trouver un flux manuel, répétitif et assez fréquent.",
    prompt: "Quel processus précis voulez-vous diagnostiquer aujourd’hui ?",
    why: "Je dois éviter les sujets trop larges et isoler un flux automatisable.",
    placeholder: "Ex. contrôle de packing list fournisseur",
  },
  {
    id: "pain",
    stage: "process",
    title: "1. Identifier le processus",
    objective: "Qualifier la douleur opérationnelle.",
    prompt: "Qu’est-ce qui fait perdre du temps, crée du stress ou bloque l’équipe dans ce processus ?",
    why: "Sans douleur réelle, il vaut mieux ne rien automatiser.",
  },
  {
    id: "people",
    stage: "process",
    title: "1. Identifier le processus",
    objective: "Identifier les personnes impliquées et les dépendances humaines.",
    prompt: "Qui intervient dans ce processus aujourd’hui ?",
    why: "Les dépendances à une personne clé augmentent souvent la valeur d’un POC ou d’un MVP.",
  },
  {
    id: "tools",
    stage: "process",
    title: "1. Identifier le processus",
    objective: "Repérer les outils et fichiers utilisés.",
    prompt: "Quels outils ou documents sont utilisés ? Excel, ERP, mail, Drive, PDF, autre ?",
    why: "Je repère les doubles saisies, fichiers récurrents et connexions éventuelles.",
  },
  {
    id: "trigger",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Décrire le début du flux.",
    prompt: "Qu’est-ce qui déclenche le processus ?",
    why: "Un bon automatisme commence par un déclencheur clair : email reçu, fichier déposé, demande client, commande, etc.",
  },
  {
    id: "inputs",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Lister les données entrantes.",
    prompt: "Quelles données, fichiers ou documents entrent dans le processus ?",
    why: "Je dois savoir si l’automatisation peut lire des entrées stables et représentatives.",
  },
  {
    id: "treatment",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Comprendre le travail manuel réalisé.",
    prompt: "Que fait concrètement la personne, étape par étape ?",
    why: "Je cherche les règles métier, copier-coller, contrôles et calculs répétitifs.",
  },
  {
    id: "controls",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Identifier les contrôles métier.",
    prompt: "Comment vérifiez-vous que le résultat est juste ?",
    why: "Les contrôles sont essentiels pour construire un agent fiable et éviter une automatisation dangereuse.",
  },
  {
    id: "output",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Décrire le livrable produit.",
    prompt: "Quel est le résultat attendu à la fin : fichier, email, PDF, décision, mise à jour ERP ?",
    why: "Le livrable final permet de cadrer un POC concret.",
  },
  {
    id: "transmission",
    stage: "mapping",
    title: "2. Cartographier l’existant",
    objective: "Comprendre ce qui se passe après la sortie.",
    prompt: "À qui le résultat est-il transmis, et par quel canal ?",
    why: "Je vérifie si le MVP doit intégrer un workflow, une notification ou une validation humaine.",
  },
  {
    id: "currentMinutes",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Mesurer le temps actuel.",
    prompt: "Combien de minutes prend un traitement complet aujourd’hui ?",
    why: "C’est la base du calcul ROI.",
    kind: "number",
    placeholder: "Ex. 45",
  },
  {
    id: "targetMinutes",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Estimer un temps cible réaliste.",
    prompt: "Après automatisation, combien de minutes resterait-il idéalement avec contrôle humain ?",
    why: "Je ne suppose pas 100 % d’automatisation : je garde une estimation prudente.",
    kind: "number",
    placeholder: "Ex. 10",
  },
  {
    id: "monthlyVolume",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Mesurer la fréquence.",
    prompt: "Combien de fois par mois ce processus est-il réalisé ?",
    why: "Un faible volume peut conduire à recommander de ne rien faire.",
    kind: "number",
    placeholder: "Ex. 30",
  },
  {
    id: "hourlyCost",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Valoriser le temps gagné.",
    prompt: "Quel coût horaire estimé faut-il utiliser pour ce travail ?",
    why: "Je transforme le temps gagné en ordre de grandeur mensuel et annuel.",
    kind: "number",
    placeholder: "Ex. 45",
  },
  {
    id: "frequentErrors",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Qualifier les gains au-delà du temps.",
    prompt: "Quelles erreurs arrivent le plus souvent ?",
    why: "La valeur d’un projet vient aussi des erreurs évitées, du stress et de la fiabilité.",
  },
  {
    id: "errorCost",
    stage: "roi",
    title: "3. Mesurer le ROI",
    objective: "Chiffrer ou qualifier le coût d’une erreur.",
    prompt: "Que coûte une erreur typique : temps, argent, retard, image client, litige ?",
    why: "Cela peut transformer un simple gain de temps en vrai enjeu opérationnel.",
  },
  {
    id: "hasExamples",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Vérifier si un POC peut être testé.",
    prompt: "Avez-vous 3 à 5 exemples réels représentatifs ?",
    why: "Sans fichiers représentatifs, il faut d’abord collecter de la matière avant de promettre un POC.",
    kind: "yesno",
  },
  {
    id: "stableStructure",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Mesurer la variabilité des entrées.",
    prompt: "Les fichiers ou demandes ont-ils toujours à peu près la même structure ?",
    why: "Plus la structure varie, plus le projet demande cadrage, règles et tests.",
    kind: "yesno",
  },
  {
    id: "rulesDocumented",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Vérifier la clarté des règles métier.",
    prompt: "Les règles métier sont-elles écrites quelque part ?",
    why: "Des règles non documentées peuvent imposer un atelier ou un POC limité.",
    kind: "yesno",
  },
  {
    id: "validatorIdentified",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Identifier le validateur humain.",
    prompt: "Qui peut valider qu’un résultat généré est correct ?",
    why: "Un MVP opérationnel nécessite un responsable métier capable de valider les sorties.",
  },
  {
    id: "outputTemplate",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Repérer un modèle cible.",
    prompt: "Existe-t-il déjà un modèle de sortie Excel, PDF, email ou autre ?",
    why: "Un modèle existant accélère fortement un POC.",
    kind: "yesno",
  },
  {
    id: "exceptions",
    stage: "feasibility",
    title: "4. Évaluer la faisabilité",
    objective: "Évaluer les cas limites.",
    prompt: "Y a-t-il beaucoup d’exceptions ou de cas particuliers ? Lesquels ?",
    why: "Les exceptions déterminent si l’on peut faire un POC simple ou s’il faut cadrer un MVP robuste.",
  },
  {
    id: "idealResult",
    stage: "recommendation",
    title: "5. Recommandation",
    objective: "Définir le résultat attendu par le prospect.",
    prompt: "Si on automatise 80 % du processus, quel résultat concret serait déjà utile ?",
    why: "Je cherche un premier périmètre réaliste, pas une promesse trop large.",
  },
  {
    id: "nextAction",
    stage: "recommendation",
    title: "5. Recommandation",
    objective: "Préparer l’étape commerciale suivante.",
    prompt: "Quelle prochaine étape serait acceptable : envoyer des fichiers, cadrer un POC, planifier un atelier MVP, ou ne rien faire pour l’instant ?",
    why: "La synthèse finale doit finir par une action claire.",
  },
  {
    id: "interestLevel",
    stage: "recommendation",
    title: "5. Recommandation",
    objective: "Qualifier le niveau d’intérêt CRM.",
    prompt: "Quel est le niveau d’intérêt du prospect ?",
    why: "Je l’ajoute à la fiche CRM pour prioriser la relance.",
    kind: "choice",
    choices: ["Faible", "Moyen", "Fort"],
  },
  {
    id: "objections",
    stage: "recommendation",
    title: "5. Recommandation",
    objective: "Noter les risques commerciaux.",
    prompt: "Quelles objections, contraintes ou risques faut-il noter ?",
    why: "Budget, disponibilité, qualité des données ou décisionnaire absent peuvent changer la recommandation.",
  },
];

const emptyDiagnostic: DiagnosticState = {
  prospect: {
    company: "",
    contact: "",
    activity: "",
    context: "",
    meetingDate: new Date().toISOString().slice(0, 10),
  },
  category: "other",
  processName: "",
  pain: "",
  tools: "",
  people: "",
  frequentErrors: "",
  errorCost: "",
  dependencies: "",
  idealResult: "",
  processMap: {
    trigger: "",
    inputs: "",
    treatment: "",
    controls: "",
    output: "",
    transmission: "",
  },
  roi: {
    currentMinutes: "",
    targetMinutes: "",
    monthlyVolume: "",
    hourlyCost: "",
  },
  qualitativeGains: [],
  feasibility: {
    hasExamples: false,
    stableStructure: false,
    rulesDocumented: false,
    validatorIdentified: false,
    outputTemplate: false,
    manyExceptions: false,
    needsErp: false,
    notes: "",
  },
  nextAction: "",
  interestLevel: "Moyen",
  objections: "",
  filesToRequest: CATEGORY_CONFIGS.other.filesToRequest,
  followUpDate: "",
};

function numberFrom(value: string) {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, style: "currency", currency: "EUR" }).format(value);
}

function formatHours(minutes: number) {
  if (minutes < 60) return `${Math.max(minutes, 0).toFixed(0)} min`;
  return `${(minutes / 60).toFixed(1).replace(".", ",")} h`;
}

function parseYes(answer: string) {
  return /^(oui|yes|y|o|ok|disponible|stable|claire?|document)/i.test(answer.trim());
}

function getChoiceLabel(question: Question, choice: string) {
  if (question.id === "category") return categoryLabel(choice as ProcessCategory);
  return choice;
}

function buildContextualQuestion(question: Question, diagnostic: DiagnosticState) {
  const config = getCategoryConfig(diagnostic.category);
  const process = diagnostic.processName || "ce processus";
  const company = diagnostic.prospect.company || "votre entreprise";
  const activity = diagnostic.prospect.activity || "votre activité";

  switch (question.id) {
    case "category":
      return "Pour que je vous pose les bonnes questions, votre sujet ressemble plutôt à quel type de besoin ?";
    case "processName":
      return `Dans ${activity}, quel processus précis voulez-vous qu’on regarde aujourd’hui ? Par exemple : ${formatExamples(config.typicalTasks)}.`;
    case "pain":
      return `Sur ${process}, qu’est-ce qui vous fait perdre le plus de temps ou crée le plus de stress aujourd’hui ?`;
    case "people":
      return `Qui intervient concrètement sur ${process}, et qui valide quand il y a un doute ?`;
    case "tools":
      return `Quels outils, fichiers ou boîtes mail utilisez-vous pour ${process} ? Par exemple : ${formatExamples(config.typicalTools)}.`;
    case "trigger":
      return `Qu’est-ce qui déclenche ${process} chez ${company} : un email, un fichier reçu, une commande, une demande client, autre chose ?`;
    case "inputs":
      return `Quelles informations arrivent au départ ? Sur ce type de sujet, je pense par exemple à : ${formatExamples(config.typicalInputs)}.`;
    case "treatment":
      return `Quand la demande arrive, qu’est-ce que la personne fait étape par étape, même si cela paraît évident ?`;
    case "controls":
      return `Pour éviter une erreur, quels contrôles faites-vous avant de considérer le résultat comme bon ? Exemples possibles : ${formatExamples(config.typicalControls)}.`;
    case "output":
      return `À la fin, quel résultat concret doit sortir ? Par exemple : ${formatExamples(config.typicalOutputs)}.`;
    case "transmission":
      return `Une fois le résultat prêt, qui doit le recevoir ou le valider, et par quel canal ?`;
    case "currentMinutes":
      return `Sur ${process}, combien de minutes prend un traitement complet aujourd’hui, en moyenne ?`;
    case "targetMinutes":
      return `Si un agent prépare 80 % du travail mais qu’un humain garde le contrôle, combien de minutes resteraient à passer ?`;
    case "monthlyVolume":
      return `Combien de fois par mois ce cas se présente environ ?`;
    case "hourlyCost":
      return `Quel coût horaire approximatif dois-je utiliser pour valoriser ce temps ? Si vous ne savez pas, on peut partir sur 45 €.`;
    case "frequentErrors":
      return `Sur ${process}, quelles erreurs ou oublis reviennent le plus souvent ?`;
    case "errorCost":
      return `Quand une erreur arrive, qu’est-ce que ça coûte concrètement : temps perdu, retard, argent, image client ou litige ?`;
    case "hasExamples":
      return `Est-ce que vous avez quelques exemples réels à me montrer ? Idéalement : ${config.filesToRequest}.`;
    case "stableStructure":
      return `Les demandes ou fichiers se ressemblent-ils la plupart du temps, ou est-ce très variable selon les cas ?`;
    case "rulesDocumented":
      return `Les règles à appliquer sont-elles écrites quelque part, ou sont-elles surtout dans la tête de l’équipe ?`;
    case "validatorIdentified":
      return `Qui serait la bonne personne pour valider les premiers résultats produits par l’agent ?`;
    case "outputTemplate":
      return `Avez-vous déjà un modèle de sortie attendu, comme un email type, un Excel, un PDF ou une fiche CRM ?`;
    case "exceptions":
      return `Quels sont les cas particuliers qui feraient sortir l’agent du chemin standard ?`;
    case "idealResult":
      return `Si on automatise seulement la partie la plus répétitive, quel résultat serait déjà vraiment utile pour vous ?`;
    case "nextAction":
      return `Pour avancer sans perdre de temps, quelle prochaine étape vous paraît réaliste : m’envoyer des exemples, cadrer un POC, faire un atelier, ou attendre ?`;
    case "objections":
      return `Qu’est-ce qui pourrait bloquer le projet : budget, disponibilité, données, décisionnaire, outil interne ou autre ?`;
    default:
      return question.prompt;
  }
}

function buildContextualWhy(question: Question, diagnostic: DiagnosticState) {
  if (question.id === "category") return question.why;
  const config = getCategoryConfig(diagnostic.category);
  if (diagnostic.category !== "other" && ["processName", "inputs", "controls", "output", "hasExamples"].includes(question.id)) {
    return `${question.why} Catégorie détectée : ${config.label}. Je garde donc les exemples centrés sur ${config.description.toLowerCase()}`;
  }
  return question.why;
}

function calculateRoi(roi: RoiInputs) {
  const current = numberFrom(roi.currentMinutes);
  const target = numberFrom(roi.targetMinutes);
  const volume = numberFrom(roi.monthlyVolume);
  const hourlyCost = numberFrom(roi.hourlyCost);
  const savedMinutes = Math.max(current - target, 0);
  const monthlyHours = (savedMinutes * volume) / 60;
  const monthlyGain = monthlyHours * hourlyCost;

  return { savedMinutes, monthlyHours, monthlyGain, annualGain: monthlyGain * 12 };
}

function classifyComplexity(feasibility: FeasibilityInputs): Complexity {
  const positive = [
    feasibility.hasExamples,
    feasibility.stableStructure,
    feasibility.rulesDocumented,
    feasibility.validatorIdentified,
    feasibility.outputTemplate,
  ].filter(Boolean).length;
  const risk = [feasibility.manyExceptions, feasibility.needsErp].filter(Boolean).length;

  if (positive >= 4 && risk === 0) return "Simple";
  if (risk >= 2 || positive <= 1) return "Complexe";
  return "Moyen";
}

function hasErpOrMultiToolDependency(diagnostic: DiagnosticState) {
  return /erp|wms|crm|api|connecteur|intégration|integration|plusieurs outils|multi/i.test([diagnostic.tools, diagnostic.dependencies, diagnostic.processMap.transmission].join(" "));
}

function recommend(diagnostic: DiagnosticState): { recommendation: Recommendation; reason: string } {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const volume = numberFrom(diagnostic.roi.monthlyVolume);
  const hasPain = [diagnostic.pain, diagnostic.frequentErrors, diagnostic.errorCost].some((value) => value.trim().length > 8);
  const hasEnoughEvidence = diagnostic.feasibility.hasExamples || diagnostic.feasibility.rulesDocumented || diagnostic.feasibility.outputTemplate;

  if (!hasPain || volume < 3 || roi.monthlyGain < 250) {
    return {
      recommendation: "Ne rien faire",
      reason: "Le volume, la douleur ou le gain estimé ne justifie pas encore un investissement d’automatisation.",
    };
  }

  if (complexity === "Complexe" && !hasEnoughEvidence) {
    return {
      recommendation: "Audit complémentaire",
      reason: "Le potentiel existe, mais les règles, exemples ou données ne sont pas assez prouvés pour promettre directement un POC ou un MVP.",
    };
  }

  if (roi.monthlyGain >= 2500 && volume >= 20 && hasErpOrMultiToolDependency(diagnostic)) {
    return {
      recommendation: "Projet complet",
      reason: "Le gain potentiel est fort et le processus semble toucher plusieurs outils ou équipes ; il faut cadrer un projet complet avec intégrations, gouvernance et validation métier.",
    };
  }

  if (roi.monthlyGain >= 1200 && volume >= 10 && complexity !== "Complexe") {
    return {
      recommendation: "MVP",
      reason: "Le processus est fréquent, coûteux et suffisamment clair pour viser une première version opérationnelle avec validation métier.",
    };
  }

  return {
    recommendation: "POC",
    reason: "Le besoin est réel et mérite une preuve courte avec quelques fichiers représentatifs avant de formaliser un MVP.",
  };
}

function buildProspectSummary(diagnostic: DiagnosticState) {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const decision = recommend(diagnostic);

  return `# Diagnostic processus — ${diagnostic.prospect.company || "Prospect"}

## 1. Processus analysé
- Catégorie : ${categoryLabel(diagnostic.category)}
- Processus : ${diagnostic.processName || "Processus à préciser"}

${diagnostic.pain || "La douleur principale reste à préciser."}

## 2. Situation actuelle
- Activité : ${diagnostic.prospect.activity || "à préciser"}
- Cas d’usage probables : ${formatExamples(getCategoryConfig(diagnostic.category).typicalTasks)}
- Outils utilisés : ${diagnostic.tools || "à préciser"}
- Personnes impliquées : ${diagnostic.people || "à préciser"}
- Étapes principales : ${diagnostic.processMap.trigger || "déclencheur à préciser"} → ${diagnostic.processMap.inputs || "entrées à préciser"} → ${diagnostic.processMap.treatment || "traitement à préciser"} → ${diagnostic.processMap.output || "sortie à préciser"}

## 3. Problèmes observés
- Temps perdu : ${formatHours(roi.savedMinutes)} par traitement estimé
- Erreurs : ${diagnostic.frequentErrors || "à préciser"}
- Risques : ${diagnostic.errorCost || "à préciser"}
- Contrôles actuels : ${diagnostic.processMap.controls || "à préciser"}

## 4. Estimation du gain
- Volume mensuel : ${diagnostic.roi.monthlyVolume || "0"} traitements
- Temps actuel : ${diagnostic.roi.currentMinutes || "0"} min
- Temps cible estimé : ${diagnostic.roi.targetMinutes || "0"} min
- Gain mensuel : ${formatCurrency(roi.monthlyGain)}
- Gain annuel : ${formatCurrency(roi.annualGain)}

## 5. Faisabilité
- Fichiers disponibles : ${diagnostic.feasibility.hasExamples ? "oui" : "à confirmer"}
- Structure stable : ${diagnostic.feasibility.stableStructure ? "oui" : "à confirmer"}
- Règles métier : ${diagnostic.feasibility.rulesDocumented ? "documentées" : "à clarifier"}
- Modèle de sortie : ${diagnostic.feasibility.outputTemplate ? "existant" : "à construire"}
- Complexité technique : ${complexity}

## 6. Méthode de diagnostic
${buildMethodSummary(diagnostic)}

## 7. Risques et garde-fous
- Données : ${diagnostic.feasibility.hasExamples ? "exemples disponibles" : "exemples réels à demander"}
- Règles : ${diagnostic.feasibility.rulesDocumented ? "règles documentées" : "règles à clarifier"}
- Exceptions : ${diagnostic.feasibility.manyExceptions ? "nombreuses, à cadrer" : "à confirmer"}
- Validation humaine : ${diagnostic.feasibility.validatorIdentified ? "validateur identifié" : "validateur à identifier"}

## 8. Recommandation
${decision.recommendation} — ${decision.reason}

## 9. Phrase commerciale pour le client
${decision.recommendation === "Ne rien faire" ? "À ce stade, je ne vous conseille pas de lancer un projet d’automatisation : il vaut mieux revisiter le sujet si le volume ou la douleur augmente." : `Le sujet semble avoir un potentiel, mais je vous propose d’avancer prudemment : d’abord vérifier ${diagnostic.filesToRequest || getCategoryConfig(diagnostic.category).filesToRequest}, puis décider du bon format (${decision.recommendation}).`}

## 10. Prochaine étape
${diagnostic.nextAction || (decision.recommendation === "Ne rien faire" ? "Ne pas lancer de projet pour l’instant ; revisiter si le volume augmente." : `Demander ${diagnostic.filesToRequest || getCategoryConfig(diagnostic.category).filesToRequest} et cadrer la suite.`)}`;
}

function buildCrmSummary(diagnostic: DiagnosticState, transcript: TranscriptItem[]) {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const decision = recommend(diagnostic);

  return `# Fiche CRM interne — ${diagnostic.prospect.company || "Prospect"}

- Entreprise : ${diagnostic.prospect.company || "à renseigner"}
- Contact : ${diagnostic.prospect.contact || "à renseigner"}
- Activité : ${diagnostic.prospect.activity || "à renseigner"}
- Catégorie : ${categoryLabel(diagnostic.category)}
- Date RDV : ${diagnostic.prospect.meetingDate || "à renseigner"}
- Contexte : ${diagnostic.prospect.context || "à préciser"}
- Problème principal : ${diagnostic.pain || "à préciser"}
- Processus analysé : ${diagnostic.processName || "à préciser"}
- Volume mensuel : ${diagnostic.roi.monthlyVolume || "0"}
- Temps actuel : ${diagnostic.roi.currentMinutes || "0"} min
- Gain mensuel / annuel estimé : ${formatCurrency(roi.monthlyGain)} / ${formatCurrency(roi.annualGain)}
- Complexité : ${complexity}
- Signaux de travail manuel : ${detectManualWorkSignals(diagnostic).join(", ") || "à confirmer"}
- Recommandation : ${decision.recommendation}
- Justification : ${decision.reason}
- Prochaine action : ${diagnostic.nextAction || "à définir"}
- Niveau d’intérêt : ${diagnostic.interestLevel}
- Objections / risques : ${diagnostic.objections || "à compléter"}
- Fichiers à demander : ${diagnostic.filesToRequest || "3 à 5 exemples représentatifs"}
- Date de relance : ${diagnostic.followUpDate || "à fixer"}

## Réponses brutes utiles
${transcript.map((item) => `- ${item.question} → ${item.answer}`).join("\n") || "Aucune réponse enregistrée."}`;
}

function safeJsonParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as {
      status?: FlowStatus;
      currentIndex?: number;
      diagnostic?: DiagnosticState;
      transcript?: TranscriptItem[];
    };
  } catch {
    return null;
  }
}

function safeAgentJsonParse(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as {
      agentState?: DiagnosticAgentState;
      agentMessages?: AgentMessage[];
      lastUsedSkill?: string;
      finalSummary?: FinalSummaryResponse | null;
    };
  } catch {
    return null;
  }
}

function decisionLabel(decision?: string) {
  return ({
    nothing: "Ne rien faire",
    audit: "Audit complémentaire",
    poc: "POC",
    mvp: "MVP",
    full_project: "Projet complet",
  } as Record<string, string>)[decision ?? ""] ?? "à définir";
}

function formatAgentStage(stage: DiagnosticAgentState["stage"]) {
  return ({
    process_discovery: "Découverte processus",
    manual_work_detection: "Travail manuel",
    roi_diagnostic: "ROI",
    automation_feasibility: "Faisabilité",
    recommendation: "Recommandation",
    commercial_synthesis: "Synthèse commerciale",
  } as Record<DiagnosticAgentState["stage"], string>)[stage];
}

function applyAnswer(current: DiagnosticState, question: Question, rawAnswer: string): DiagnosticState {
  const answer = rawAnswer.trim();
  const yes = parseYes(answer);

  switch (question.id) {
    case "company":
      return { ...current, prospect: { ...current.prospect, company: answer } };
    case "contact":
      return { ...current, prospect: { ...current.prospect, contact: answer } };
    case "activity":
      return { ...current, prospect: { ...current.prospect, activity: answer } };
    case "context":
      return { ...current, prospect: { ...current.prospect, context: answer } };
    case "category": {
      const category = (Object.keys(CATEGORY_CONFIGS).includes(answer) ? answer : "other") as ProcessCategory;
      return { ...current, category, filesToRequest: getCategoryConfig(category).filesToRequest };
    }
    case "processName":
      return { ...current, processName: answer };
    case "pain":
      return { ...current, pain: answer };
    case "people":
      return { ...current, people: answer, dependencies: answer };
    case "tools":
      return { ...current, tools: answer };
    case "trigger":
      return { ...current, processMap: { ...current.processMap, trigger: answer } };
    case "inputs":
      return { ...current, processMap: { ...current.processMap, inputs: answer } };
    case "treatment":
      return { ...current, processMap: { ...current.processMap, treatment: answer } };
    case "controls":
      return { ...current, processMap: { ...current.processMap, controls: answer } };
    case "output":
      return { ...current, processMap: { ...current.processMap, output: answer } };
    case "transmission":
      return { ...current, processMap: { ...current.processMap, transmission: answer } };
    case "currentMinutes":
      return { ...current, roi: { ...current.roi, currentMinutes: answer } };
    case "targetMinutes":
      return { ...current, roi: { ...current.roi, targetMinutes: answer } };
    case "monthlyVolume":
      return { ...current, roi: { ...current.roi, monthlyVolume: answer } };
    case "hourlyCost":
      return { ...current, roi: { ...current.roi, hourlyCost: answer } };
    case "frequentErrors":
      return { ...current, frequentErrors: answer };
    case "errorCost":
      return { ...current, errorCost: answer };
    case "hasExamples":
      return { ...current, feasibility: { ...current.feasibility, hasExamples: yes } };
    case "stableStructure":
      return { ...current, feasibility: { ...current.feasibility, stableStructure: yes } };
    case "rulesDocumented":
      return { ...current, feasibility: { ...current.feasibility, rulesDocumented: yes } };
    case "validatorIdentified":
      return { ...current, feasibility: { ...current.feasibility, validatorIdentified: answer.length > 0, notes: [current.feasibility.notes, `Validateur : ${answer}`].filter(Boolean).join("\n") } };
    case "outputTemplate":
      return { ...current, feasibility: { ...current.feasibility, outputTemplate: yes } };
    case "exceptions":
      return {
        ...current,
        feasibility: {
          ...current.feasibility,
          manyExceptions: !/^(non|no|peu|pas vraiment)/i.test(answer),
          notes: [current.feasibility.notes, `Exceptions : ${answer}`].filter(Boolean).join("\n"),
        },
      };
    case "idealResult":
      return { ...current, idealResult: answer };
    case "nextAction":
      return { ...current, nextAction: answer };
    case "interestLevel":
      return { ...current, interestLevel: (question.choices?.includes(answer) ? answer : "Moyen") as InterestLevel };
    case "objections":
      return { ...current, objections: answer };
    default:
      return current;
  }
}

function stageLabel(stage: StageId) {
  return {
    process: "Processus",
    mapping: "Cartographie",
    roi: "ROI",
    feasibility: "Faisabilité",
    recommendation: "Recommandation",
  }[stage];
}

export default function Home() {
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>(emptyDiagnostic);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [mode, setMode] = useState<AppMode>("guided");
  const [agentInput, setAgentInput] = useState("");
  const [agentState, setAgentState] = useState<DiagnosticAgentState>(() => emptyAgentState());
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [lastUsedSkill, setLastUsedSkill] = useState("process-discovery");
  const [finalSummary, setFinalSummary] = useState<FinalSummaryResponse | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
      if (stored) {
        setStatus(stored.status ?? "idle");
        setCurrentIndex(stored.currentIndex ?? 0);
        setDiagnostic({ ...emptyDiagnostic, ...stored.diagnostic });
        setTranscript(stored.transcript ?? []);
      }
      const storedAgent = safeAgentJsonParse(window.localStorage.getItem(AGENT_STORAGE_KEY));
      if (storedAgent) {
        setAgentState({ ...emptyAgentState(), ...storedAgent.agentState });
        setAgentMessages(storedAgent.agentMessages ?? []);
        setLastUsedSkill(storedAgent.lastUsedSkill ?? "process-discovery");
        setFinalSummary(storedAgent.finalSummary ?? null);
      }
      setHasHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: EXPORT_VERSION, status, currentIndex, diagnostic, transcript }),
    );
  }, [hasHydrated, status, currentIndex, diagnostic, transcript]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      AGENT_STORAGE_KEY,
      JSON.stringify({ version: EXPORT_VERSION, agentState, agentMessages, lastUsedSkill, finalSummary }),
    );
  }, [hasHydrated, agentState, agentMessages, lastUsedSkill, finalSummary]);

  const currentQuestion = questions[Math.min(currentIndex, questions.length - 1)];
  const currentPrompt = currentQuestion ? buildContextualQuestion(currentQuestion, diagnostic) : "";
  const currentWhy = currentQuestion ? buildContextualWhy(currentQuestion, diagnostic) : "";
  const activeSkillIds = currentQuestion ? activeSkillIdsForQuestion(currentQuestion.id) : ["process-discovery" as DiagnosticSkillId];
  const progress = status === "done" ? 100 : Math.round((currentIndex / questions.length) * 100);
  const remaining = Math.max(questions.length - currentIndex, 0);
  const roi = useMemo(() => calculateRoi(diagnostic.roi), [diagnostic.roi]);
  const complexity = useMemo(() => classifyComplexity(diagnostic.feasibility), [diagnostic.feasibility]);
  const decision = useMemo(() => recommend(diagnostic), [diagnostic]);
  const prospectSummary = useMemo(() => buildProspectSummary(diagnostic), [diagnostic]);
  const crmSummary = useMemo(() => buildCrmSummary(diagnostic, transcript), [diagnostic, transcript]);

  function startDiagnostic() {
    setStatus("running");
    setCurrentIndex(0);
    setAnswer("");
    setDiagnostic({ ...emptyDiagnostic, prospect: { ...emptyDiagnostic.prospect, meetingDate: new Date().toISOString().slice(0, 10) } });
    setTranscript([]);
  }

  function submitAnswer(event?: FormEvent<HTMLFormElement>, forcedAnswer?: string) {
    event?.preventDefault();
    const cleanAnswer = (forcedAnswer ?? answer).trim();
    if (!cleanAnswer || status !== "running") return;

    setDiagnostic((current) => applyAnswer(current, currentQuestion, cleanAnswer));
    setTranscript((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        questionId: currentQuestion.id,
        stage: currentQuestion.stage,
        question: currentPrompt,
        answer: cleanAnswer,
      },
    ]);
    setAnswer("");

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setCurrentIndex(questions.length);
      setStatus("done");
    } else {
      setCurrentIndex(nextIndex);
    }
  }

  function goBack() {
    if (currentIndex === 0 || transcript.length === 0) return;
    const previousTranscript = transcript.slice(0, -1);
    const rebuilt = previousTranscript.reduce((state, item) => {
      const question = questions.find((candidate) => candidate.id === item.questionId) ?? questions.find((candidate) => candidate.prompt === item.question);
      return question ? applyAnswer(state, question, item.answer) : state;
    }, { ...emptyDiagnostic, prospect: { ...emptyDiagnostic.prospect, meetingDate: diagnostic.prospect.meetingDate } });

    setTranscript(previousTranscript);
    setDiagnostic(rebuilt);
    setCurrentIndex((current) => Math.max(current - 1, 0));
    setStatus("running");
    setAnswer("");
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2200);
  }

  function downloadExport() {
    const payload = JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), mode, diagnostic, transcript, agentState, agentMessages, finalSummary }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diagnostic-${diagnostic.prospect.company || agentState.company || "prospect"}.json`.toLowerCase().replace(/[^a-z0-9-.]+/g, "-");
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetAgentDiagnostic() {
    setAgentState(emptyAgentState());
    setAgentMessages([]);
    setAgentInput("");
    setAgentError(null);
    setLastUsedSkill("process-discovery");
    setFinalSummary(null);
  }

  async function sendAgentMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = agentInput.trim();
    if (!message || agentLoading) return;

    const settings = readLlmSettings();
    const optimisticMessages: AgentMessage[] = [...agentMessages, { role: "user", content: message }];
    setAgentMessages(optimisticMessages);
    setAgentInput("");
    setAgentLoading(true);
    setAgentError(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, state: agentState, ...settings }),
      });
      const data = (await response.json()) as AgentResponse | { error?: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "Erreur agent.");
      const agentResponse = data as AgentResponse;

      setAgentState(agentResponse.updatedState);
      setLastUsedSkill(agentResponse.usedSkill);
      setAgentMessages([...optimisticMessages, { role: "assistant", content: agentResponse.answer }]);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Erreur agent.");
      setAgentMessages(agentMessages);
    } finally {
      setAgentLoading(false);
    }
  }

  async function generateFinalSummary() {
    if (agentLoading) return;
    const settings = readLlmSettings();
    setAgentLoading(true);
    setAgentError(null);
    try {
      const response = await fetch("/api/agent/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: agentState, ...settings }),
      });
      const data = (await response.json()) as FinalSummaryResponse | { error?: string };
      if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "Erreur synthèse.");
      setFinalSummary(data as FinalSummaryResponse);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : "Erreur synthèse.");
    } finally {
      setAgentLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8">
        <header className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200">Packing Factory · Diagnostic guidé</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">Un agent IA spécialisé accompagne le diagnostic</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Pensé pour une personne non technique : elle clique sur Démarrer, répond à une question à la fois, voit le thème et l’avancement, puis l’agent génère la synthèse prospect et la fiche CRM quand il a toutes les informations.
            </p>
          </div>
          <Link href="/settings" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-center text-sm font-medium transition hover:border-cyan-300/40 hover:bg-cyan-300/10">
            Settings LLM
          </Link>
        </header>

        <section className="mb-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Avancement</p>
              <p className="mt-1 text-2xl font-semibold">{progress}%</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${Math.max(progress, status === "idle" ? 0 : 4)}%` }} />
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-5">
                {["process", "mapping", "roi", "feasibility", "recommendation"].map((stage) => {
                  const stageQuestions = questions.filter((question) => question.stage === stage);
                  const answered = transcript.filter((item) => item.stage === stage).length;
                  const active = currentQuestion?.stage === stage && status === "running";
                  const done = answered >= stageQuestions.length;
                  return (
                    <div key={stage} className={`rounded-2xl border px-3 py-2 text-xs ${active ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50" : done ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-black/20 text-zinc-400"}`}>
                      <p className="font-semibold">{stageLabel(stage as StageId)}</p>
                      <p>{answered}/{stageQuestions.length}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
              {status === "idle" ? "Prêt à démarrer" : status === "done" ? "Diagnostic terminé" : `${remaining} question(s) restantes`}
            </div>
          </div>
        </section>

        <section className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Mode de diagnostic</p>
            <p className="text-xs text-zinc-500">Le mode guidé reste disponible ; le mode Agent IA utilise les skills métier et fonctionne aussi sans clé LLM.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setMode("guided")} type="button" className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "guided" ? "bg-cyan-300 text-slate-950" : "border border-white/10 text-zinc-300 hover:bg-white/10"}`}>
              Mode guidé
            </button>
            <button onClick={() => setMode("agent")} type="button" className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "agent" ? "bg-cyan-300 text-slate-950" : "border border-white/10 text-zinc-300 hover:bg-white/10"}`}>
              Agent IA
            </button>
          </div>
        </section>

        {mode === "agent" ? (
          <AgentModePanel
            agentInput={agentInput}
            agentLoading={agentLoading}
            agentMessages={agentMessages}
            agentState={agentState}
            error={agentError}
            finalSummary={finalSummary}
            lastUsedSkill={lastUsedSkill}
            onCopy={copyText}
            onDownload={downloadExport}
            onGenerateSummary={generateFinalSummary}
            onInputChange={setAgentInput}
            onReset={resetAgentDiagnostic}
            onSubmit={sendAgentMessage}
          />
        ) : null}

        {mode === "guided" && status === "idle" ? (
          <section className="grid flex-1 place-items-center rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">Mode entretien</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Démarrer un diagnostic prospect</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">
                L’agent spécialisé pose les questions dans le bon ordre. Une personne non technique peut répondre simplement avec les mots du prospect. À la fin, l’agent génère automatiquement la recommandation, la synthèse courte prospect et la fiche CRM interne.
              </p>
              <button onClick={startDiagnostic} className="mt-8 rounded-full bg-cyan-300 px-8 py-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200" type="button">
                Démarrer
              </button>
            </div>
          </section>
        ) : null}

        {mode === "guided" && status === "running" ? (
          <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 md:p-8">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Thème : {currentQuestion.title}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-zinc-400">
                  Question {currentIndex + 1}/{questions.length}
                </span>
              </div>

              <p className="text-sm font-medium text-zinc-400">Objectif</p>
              <p className="mt-2 text-lg leading-7 text-zinc-100">{currentQuestion.objective}</p>

              <div className="my-8 rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Agent IA</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight md:text-4xl">{currentPrompt}</h2>
                <p className="mt-4 text-sm leading-6 text-cyan-50/80">{currentWhy}</p>
                <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-cyan-50/75">
                  Skill métier active : {formatSkillLabels(activeSkillIds)}
                </p>
              </div>

              <form onSubmit={submitAnswer} className="space-y-4">
                {currentQuestion.kind === "choice" ? (
                  <div className="flex flex-wrap gap-3">
                    {currentQuestion.choices?.map((choice) => (
                      <button key={choice} onClick={() => submitAnswer(undefined, choice)} type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                        {getChoiceLabel(currentQuestion, choice)}
                      </button>
                    ))}
                  </div>
                ) : currentQuestion.kind === "yesno" ? (
                  <div className="flex flex-wrap gap-3">
                    {['Oui', 'Non'].map((choice) => (
                      <button key={choice} onClick={() => submitAnswer(undefined, choice)} type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                        {getChoiceLabel(currentQuestion, choice)}
                      </button>
                    ))}
                    <input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Ou préciser en quelques mots…" className="min-w-[240px] flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-zinc-600 focus:border-cyan-300/60" />
                  </div>
                ) : (
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={currentQuestion.kind === "number" ? 2 : 5}
                    inputMode={currentQuestion.kind === "number" ? "decimal" : "text"}
                    placeholder={currentQuestion.placeholder ?? "Réponse du prospect…"}
                    className="w-full resize-y rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-4 text-base leading-7 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
                    autoFocus
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <button onClick={goBack} disabled={currentIndex === 0} type="button" className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">
                    Question précédente
                  </button>
                  <button disabled={!answer.trim() || currentQuestion.kind === "choice"} type="submit" className="rounded-full bg-cyan-300 px-7 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
                    Répondre et passer à la suivante
                  </button>
                </div>
              </form>
            </section>

            <aside className="space-y-5">
              <SummaryCard title="Contexte adapté" rows={[`Catégorie : ${categoryLabel(diagnostic.category)}`, `À demander : ${diagnostic.filesToRequest}`, `Exemples : ${formatExamples(getCategoryConfig(diagnostic.category).typicalTasks)}`]} />
              <SummaryCard title="Skills métier" rows={[`Active : ${formatSkillLabels(activeSkillIds)}`, `Signaux manuels : ${detectManualWorkSignals(diagnostic).join(", ") || "à confirmer"}`, "Garde-fou : ROI + exemples réels avant recommandation"]} />
              <SummaryCard title="ROI estimé" rows={[`Gain/traitement : ${formatHours(roi.savedMinutes)}`, `Gain mensuel : ${formatCurrency(roi.monthlyGain)}`, `Gain annuel : ${formatCurrency(roi.annualGain)}`]} />
              <SummaryCard title="Décision provisoire" rows={[`Complexité : ${complexity}`, `Recommandation : ${decision.recommendation}`, decision.reason]} />
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold">Réponses déjà collectées</h3>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-1">
                  {transcript.length ? transcript.slice().reverse().map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
                      <p className="text-xs font-semibold text-cyan-200">{stageLabel(item.stage)}</p>
                      <p className="mt-1 text-zinc-400">{item.question}</p>
                      <p className="mt-2 whitespace-pre-wrap text-zinc-100">{item.answer}</p>
                    </article>
                  )) : <p className="text-sm text-zinc-500">Aucune réponse pour l’instant.</p>}
                </div>
              </section>
            </aside>
          </div>
        ) : null}

        {mode === "guided" && status === "done" ? (
          <div className="grid flex-1 gap-5 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-6 shadow-2xl shadow-black/20 lg:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Diagnostic terminé</p>
              <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-4xl font-semibold">{decision.recommendation}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-50/85">{decision.reason}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={startDiagnostic} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/10" type="button">
                    Nouveau diagnostic
                  </button>
                  <button onClick={downloadExport} className="rounded-full bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200" type="button">
                    Export JSON
                  </button>
                </div>
              </div>
            </section>

            <FinalDocument title="Synthèse prospect" content={prospectSummary} onCopy={() => copyText("synthèse prospect", prospectSummary)} />
            <FinalDocument title="Fiche CRM interne" content={crmSummary} onCopy={() => copyText("fiche CRM", crmSummary)} />
            {copied ? <p className="text-sm text-emerald-300 lg:col-span-2">Copié : {copied}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function AgentModePanel({
  agentInput,
  agentLoading,
  agentMessages,
  agentState,
  error,
  finalSummary,
  lastUsedSkill,
  onCopy,
  onDownload,
  onGenerateSummary,
  onInputChange,
  onReset,
  onSubmit,
}: {
  agentInput: string;
  agentLoading: boolean;
  agentMessages: AgentMessage[];
  agentState: DiagnosticAgentState;
  error: string | null;
  finalSummary: FinalSummaryResponse | null;
  lastUsedSkill: string;
  onCopy: (label: string, text: string) => Promise<void>;
  onDownload: () => void;
  onGenerateSummary: () => Promise<void>;
  onInputChange: (value: string) => void;
  onReset: () => void;
  onSubmit: (event?: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const roi = agentState.roi;
  const recommendation = agentState.recommendation;
  const liveSummaryRows = [
    `Entreprise : ${agentState.company || "à préciser"}`,
    `Processus : ${agentState.processName || "à préciser"}`,
    `Douleurs : ${agentState.painPoints.join(" ; ") || "à préciser"}`,
    `Outils : ${agentState.toolsUsed.join(", ") || "à préciser"}`,
    `Tâches manuelles : ${agentState.manualTasks.join(", ") || "à confirmer"}`,
    `Risques : ${agentState.risks.join(" ; ") || "à vérifier"}`,
  ];

  return (
    <div className="grid flex-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Chat diagnostic</p>
            <h2 className="mt-2 text-2xl font-semibold">Issa / Client → Agent IA</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onReset} type="button" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10">Réinitialiser</button>
            <button onClick={onDownload} type="button" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10">Export JSON</button>
          </div>
        </div>

        <div className="min-h-[360px] max-h-[520px] space-y-3 overflow-auto rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
          {agentMessages.length ? agentMessages.map((message, index) => (
            <article key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm leading-6 ${message.role === "assistant" ? "bg-cyan-300/10 text-cyan-50" : "bg-white/[0.06] text-zinc-100"}`}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{message.role === "assistant" ? "Agent IA" : "Issa / client"}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </article>
          )) : (
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5 text-sm leading-6 text-cyan-50/90">
              <p className="font-semibold">Question de départ</p>
              <p className="mt-2">Pour commencer, vous pouvez me rappeler le nom de votre entreprise et le processus que vous voulez regarder ?</p>
            </div>
          )}
          {agentLoading ? <p className="text-sm text-cyan-200">L’agent réfléchit…</p> : null}
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <textarea
            value={agentInput}
            onChange={(event) => onInputChange(event.target.value)}
            rows={4}
            placeholder="Note ou réponse du client…"
            className="w-full resize-y rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-4 text-base leading-7 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">Skill utilisée : {lastUsedSkill}</p>
            <button disabled={!agentInput.trim() || agentLoading} type="submit" className="rounded-full bg-cyan-300 px-7 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">Envoyer à l’agent</button>
          </div>
          {error ? <p className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">{error}</p> : null}
        </form>
      </section>

      <aside className="space-y-5">
        <SummaryCard title="État du diagnostic" rows={[
          `Étape : ${formatAgentStage(agentState.stage)}`,
          `Skill : ${lastUsedSkill}`,
          `Infos manquantes : ${agentState.missingInformation.join(", ") || "aucune"}`,
          `ROI : ${roi ? `${formatHours(roi.monthlyHoursSaved * 60)}/mois · ${formatCurrency(roi.monthlyGain)}/mois · ${formatCurrency(roi.annualGain)}/an` : "à compléter"}`,
          `Recommandation : ${decisionLabel(recommendation?.decision)}${recommendation ? ` (${recommendation.confidence})` : ""}`,
        ]} />

        <SummaryCard title="Synthèse live" rows={liveSummaryRows} />

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Synthèse finale</h3>
            <button onClick={onGenerateSummary} disabled={agentLoading} type="button" className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:opacity-40">Générer</button>
          </div>
          {finalSummary ? (
            <div className="space-y-3">
              <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/35 p-4 text-xs leading-5 text-zinc-300">{finalSummary.summaryMarkdown}</pre>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onCopy("synthèse finale", finalSummary.summaryMarkdown)} type="button" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10">Copier synthèse</button>
                <button onClick={() => onCopy("mail de suivi", finalSummary.followUpEmail)} type="button" className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/10">Copier mail</button>
              </div>
            </div>
          ) : <p className="text-sm leading-6 text-zinc-500">Générez la synthèse quand le diagnostic contient assez d’éléments. Si le ROI manque, la synthèse l’indiquera.</p>}
        </section>
      </aside>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">
        {rows.map((row) => <li key={row}>{row}</li>)}
      </ul>
    </section>
  );
}

function FinalDocument({ title, content, onCopy }: { title: string; content: string; onCopy: () => void }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">{title}</h3>
        <button onClick={onCopy} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200" type="button">
          Copier
        </button>
      </div>
      <pre className="max-h-[620px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-zinc-300">
        {content}
      </pre>
    </section>
  );
}
