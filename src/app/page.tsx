"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type StageId = "process" | "mapping" | "roi" | "feasibility" | "recommendation";
type FlowStatus = "idle" | "running" | "done";
type Recommendation = "Ne rien faire" | "POC" | "MVP";
type Complexity = "Simple" | "Moyen" | "Complexe";
type InterestLevel = "Faible" | "Moyen" | "Fort";
type AnswerKind = "text" | "number" | "yesno" | "choice";

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
const EXPORT_VERSION = 2;

const questions: Question[] = [
  {
    id: "company",
    stage: "process",
    title: "Informations prospect",
    objective: "Identifier qui est en face et le contexte du rendez-vous.",
    prompt: "Quelle est l’entreprise du prospect ?",
    why: "Je commence par nommer clairement le diagnostic pour que la synthèse finale soit directement exploitable.",
    placeholder: "Ex. ACME Logistics",
  },
  {
    id: "contact",
    stage: "process",
    title: "Informations prospect",
    objective: "Associer le diagnostic à un contact commercial.",
    prompt: "Qui est le contact principal et quel est son rôle ?",
    why: "Cette information servira dans la fiche CRM et pour la relance.",
    placeholder: "Ex. Marie Dupont, responsable ADV",
  },
  {
    id: "activity",
    stage: "process",
    title: "Informations prospect",
    objective: "Comprendre rapidement l’activité avant de parler automatisation.",
    prompt: "Quelle est l’activité de l’entreprise en une phrase ?",
    why: "Le contexte métier m’aide à adapter les relances et à éviter une recommandation générique.",
  },
  {
    id: "context",
    stage: "process",
    title: "Contexte du rendez-vous",
    objective: "Clarifier l’enjeu principal du prospect.",
    prompt: "Pourquoi ce sujet est-il important maintenant ?",
    why: "Je cherche le déclencheur commercial : surcharge, erreurs, croissance, nouveau client, audit, retard, etc.",
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
  filesToRequest: "3 à 5 exemples représentatifs",
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

function recommend(diagnostic: DiagnosticState): { recommendation: Recommendation; reason: string } {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const volume = numberFrom(diagnostic.roi.monthlyVolume);
  const hasPain = [diagnostic.pain, diagnostic.frequentErrors, diagnostic.errorCost].some((value) => value.trim().length > 8);

  if (!hasPain || volume < 3 || roi.monthlyGain < 250) {
    return {
      recommendation: "Ne rien faire",
      reason: "Le volume, la douleur ou le gain estimé ne justifie pas encore un investissement d’automatisation.",
    };
  }

  if (complexity === "Complexe") {
    return {
      recommendation: "POC",
      reason: "Le potentiel existe, mais les exceptions, formats ou dépendances doivent être prouvés sur un périmètre limité avant engagement.",
    };
  }

  if (roi.monthlyGain >= 1200 && volume >= 10) {
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
${diagnostic.processName || "Processus à préciser"}

${diagnostic.pain || "La douleur principale reste à préciser."}

## 2. Situation actuelle
- Activité : ${diagnostic.prospect.activity || "à préciser"}
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

## 6. Recommandation
${decision.recommendation} — ${decision.reason}

## 7. Prochaine étape
${diagnostic.nextAction || (decision.recommendation === "Ne rien faire" ? "Ne pas lancer de projet pour l’instant ; revisiter si le volume augmente." : "Demander 3 à 5 fichiers représentatifs et cadrer un POC court.")}`;
}

function buildCrmSummary(diagnostic: DiagnosticState, transcript: TranscriptItem[]) {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const decision = recommend(diagnostic);

  return `# Fiche CRM interne — ${diagnostic.prospect.company || "Prospect"}

- Entreprise : ${diagnostic.prospect.company || "à renseigner"}
- Contact : ${diagnostic.prospect.contact || "à renseigner"}
- Activité : ${diagnostic.prospect.activity || "à renseigner"}
- Date RDV : ${diagnostic.prospect.meetingDate || "à renseigner"}
- Contexte : ${diagnostic.prospect.context || "à préciser"}
- Problème principal : ${diagnostic.pain || "à préciser"}
- Processus analysé : ${diagnostic.processName || "à préciser"}
- Volume mensuel : ${diagnostic.roi.monthlyVolume || "0"}
- Temps actuel : ${diagnostic.roi.currentMinutes || "0"} min
- Gain mensuel / annuel estimé : ${formatCurrency(roi.monthlyGain)} / ${formatCurrency(roi.annualGain)}
- Complexité : ${complexity}
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

  useEffect(() => {
    queueMicrotask(() => {
      const stored = safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
      if (stored) {
        setStatus(stored.status ?? "idle");
        setCurrentIndex(stored.currentIndex ?? 0);
        setDiagnostic({ ...emptyDiagnostic, ...stored.diagnostic });
        setTranscript(stored.transcript ?? []);
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

  const currentQuestion = questions[Math.min(currentIndex, questions.length - 1)];
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
        stage: currentQuestion.stage,
        question: currentQuestion.prompt,
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
      const question = questions.find((candidate) => candidate.prompt === item.question);
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
    const payload = JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), diagnostic, transcript }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `diagnostic-${diagnostic.prospect.company || "prospect"}.json`.toLowerCase().replace(/[^a-z0-9-.]+/g, "-");
    anchor.click();
    URL.revokeObjectURL(url);
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

        {status === "idle" ? (
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

        {status === "running" ? (
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
                <h2 className="mt-3 text-2xl font-semibold leading-tight md:text-4xl">{currentQuestion.prompt}</h2>
                <p className="mt-4 text-sm leading-6 text-cyan-50/80">{currentQuestion.why}</p>
              </div>

              <form onSubmit={submitAnswer} className="space-y-4">
                {currentQuestion.kind === "choice" ? (
                  <div className="flex flex-wrap gap-3">
                    {currentQuestion.choices?.map((choice) => (
                      <button key={choice} onClick={() => submitAnswer(undefined, choice)} type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                        {choice}
                      </button>
                    ))}
                  </div>
                ) : currentQuestion.kind === "yesno" ? (
                  <div className="flex flex-wrap gap-3">
                    {['Oui', 'Non'].map((choice) => (
                      <button key={choice} onClick={() => submitAnswer(undefined, choice)} type="button" className="rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                        {choice}
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

        {status === "done" ? (
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
