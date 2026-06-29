"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type StageId = "process" | "mapping" | "roi" | "feasibility" | "recommendation";
type Recommendation = "Ne rien faire" | "POC" | "MVP";
type Complexity = "Simple" | "Moyen" | "Complexe";
type InterestLevel = "Faible" | "Moyen" | "Fort";

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

type Answer = {
  id: string;
  stage: StageId;
  question: string;
  response: string;
  createdAt: string;
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
  answers: Answer[];
};

type AgentStep = {
  stage: StageId;
  title: string;
  goal: string;
  guide: string;
  examples: string[];
};

const STORAGE_KEY = "diagnostic-agent:current-diagnostic";
const EXPORT_VERSION = 1;

const stages: AgentStep[] = [
  {
    stage: "process",
    title: "1. Processus",
    goal: "Identifier un flux répétitif, manuel, fréquent et assez clair pour être diagnostiqué.",
    guide: "Je commence par cadrer la douleur principale : processus, fréquence, documents, personnes dépendantes et erreurs qui coûtent cher.",
    examples: [
      "Quel processus vous prend trop de temps aujourd’hui ?",
      "Quel fichier Excel ou document revient souvent ?",
      "Quelle erreur crée du stress, un coût ou une perte d’image ?",
    ],
  },
  {
    stage: "mapping",
    title: "2. Cartographie",
    goal: "Comprendre Déclencheur → Entrées → Traitement → Contrôles → Sortie → Transmission.",
    guide: "Je découpe le processus actuel pour trouver les doubles saisies, contrôles manuels et dépendances humaines.",
    examples: [
      "Qu’est-ce qui déclenche ce processus ?",
      "Quelles données entrent, qui les transforme, puis qui contrôle ?",
      "Que se passe-t-il après la sortie du document ou fichier ?",
    ],
  },
  {
    stage: "roi",
    title: "3. ROI",
    goal: "Chiffrer le gain mensuel et annuel sans surpromettre.",
    guide: "Je calcule le temps économisé, le volume mensuel et le coût horaire pour vérifier si l’automatisation mérite un investissement.",
    examples: [
      "Combien de minutes prend un traitement aujourd’hui ?",
      "Combien de fois par mois ce cas revient-il ?",
      "Si on automatisait 80 %, est-ce déjà utile ?",
    ],
  },
  {
    stage: "feasibility",
    title: "4. Faisabilité",
    goal: "Évaluer fichiers, règles, exceptions, modèle de sortie et validation métier.",
    guide: "Je vérifie si un POC est testable avec des fichiers représentatifs ou si le sujet demande un cadrage MVP plus robuste.",
    examples: [
      "Avez-vous 3 à 5 exemples réels ?",
      "Les formats sont-ils stables ou très variables ?",
      "Qui peut valider les règles métier et les cas limites ?",
    ],
  },
  {
    stage: "recommendation",
    title: "5. Recommandation",
    goal: "Orienter honnêtement vers ne rien faire, POC ou MVP avec prochaine action commerciale.",
    guide: "Je transforme les réponses en synthèse prospect et fiche CRM exploitable, puis je propose une étape suivante.",
    examples: [
      "Quelle décision serait utile à la fin du rendez-vous ?",
      "Quel est le prochain micro-engagement acceptable ?",
      "Quelles objections ou risques faut-il noter côté CRM ?",
    ],
  },
];

const qualitativeGainOptions = [
  "Moins d’erreurs",
  "Moins de stress",
  "Meilleure traçabilité",
  "Moins de dépendance à une personne",
  "Documents plus fiables",
  "Meilleure image client",
  "Capacité à absorber plus de volume",
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
  filesToRequest: "",
  followUpDate: "",
  answers: [],
};

function numberFrom(value: string) {
  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, style: "currency", currency: "EUR" }).format(value);
}

function formatHours(minutes: number) {
  if (minutes < 60) return `${Math.max(minutes, 0).toFixed(0)} min`;
  return `${(minutes / 60).toFixed(1).replace(".", ",")} h`;
}

function calculateRoi(roi: RoiInputs) {
  const current = numberFrom(roi.currentMinutes);
  const target = numberFrom(roi.targetMinutes);
  const volume = numberFrom(roi.monthlyVolume);
  const hourlyCost = numberFrom(roi.hourlyCost);
  const savedMinutes = Math.max(current - target, 0);
  const monthlyHours = (savedMinutes * volume) / 60;
  const monthlyGain = monthlyHours * hourlyCost;

  return {
    savedMinutes,
    monthlyHours,
    monthlyGain,
    annualGain: monthlyGain * 12,
  };
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
  const hasPain = [diagnostic.pain, diagnostic.frequentErrors, diagnostic.dependencies].some((value) => value.trim().length > 10);

  if (!hasPain || volume < 3 || roi.monthlyGain < 250) {
    return {
      recommendation: "Ne rien faire",
      reason: "Le volume, la douleur ou le gain estimé ne justifie pas encore un investissement d’automatisation.",
    };
  }

  if (complexity === "Simple" && roi.monthlyGain < 1200) {
    return {
      recommendation: "POC",
      reason: "Le besoin est identifié et testable rapidement ; un POC avec 3 à 5 fichiers représentatifs permet de prouver le gain avant d’engager plus.",
    };
  }

  if (complexity === "Complexe") {
    return {
      recommendation: "POC",
      reason: "Le potentiel existe, mais les exceptions, formats ou dépendances imposent de prouver la faisabilité sur un périmètre limité.",
    };
  }

  if (roi.monthlyGain >= 1200 && volume >= 10) {
    return {
      recommendation: "MVP",
      reason: "Le processus est fréquent, coûteux et suffisamment structurant pour viser une première version opérationnelle avec validation métier.",
    };
  }

  return {
    recommendation: "POC",
    reason: "Le cas semble utile mais mérite une preuve courte avant de formaliser un MVP.",
  };
}

function missingQuestion(diagnostic: DiagnosticState, stage: StageId) {
  if (stage === "process") {
    if (!diagnostic.processName.trim()) return "Quel processus précis voulez-vous diagnostiquer aujourd’hui ?";
    if (!diagnostic.pain.trim()) return "Quelle douleur concrète ce processus crée-t-il : temps perdu, erreurs, stress, client mécontent ?";
    if (!diagnostic.frequentErrors.trim()) return "Quelles erreurs reviennent le plus souvent et que coûtent-elles quand elles arrivent ?";
    return "Si vous ne deviez garder qu’un résultat idéal après automatisation, lequel serait-il ?";
  }

  if (stage === "mapping") {
    if (!diagnostic.processMap.trigger.trim()) return "Qu’est-ce qui déclenche le processus et qui le reçoit en premier ?";
    if (!diagnostic.processMap.inputs.trim()) return "Quels fichiers, emails, PDF, Excel ou données entrent dans le processus ?";
    if (!diagnostic.processMap.controls.trim()) return "Comment la personne contrôle-t-elle que le résultat est juste ?";
    return "Quelle sortie est transmise, à qui, et par quel canal ?";
  }

  if (stage === "roi") {
    const roi = calculateRoi(diagnostic.roi);
    if (!diagnostic.roi.currentMinutes) return "Combien de minutes prend un traitement complet aujourd’hui ?";
    if (!diagnostic.roi.monthlyVolume) return "Combien de fois par mois ce traitement revient-il ?";
    if (!diagnostic.roi.hourlyCost) return "Quel coût horaire réaliste faut-il utiliser pour estimer le gain ?";
    return `Le gain estimé est ${formatCurrency(roi.monthlyGain)}/mois. Est-ce cohérent avec ce que vous observez sur le terrain ?`;
  }

  if (stage === "feasibility") {
    if (!diagnostic.feasibility.hasExamples) return "Pouvez-vous obtenir 3 à 5 fichiers réels représentatifs pour tester un POC ?";
    if (!diagnostic.feasibility.rulesDocumented) return "Les règles métier sont-elles écrites quelque part ou détenues par une personne clé ?";
    if (!diagnostic.feasibility.validatorIdentified) return "Qui peut valider qu’un résultat généré est correct avant usage client ?";
    return "Quelles exceptions ou variations de format risquent de bloquer l’automatisation ?";
  }

  if (!diagnostic.nextAction.trim()) return "Quelle prochaine étape commerciale est la plus naturelle : demander des fichiers, cadrer un POC, ou planifier un atelier MVP ?";
  if (!diagnostic.filesToRequest.trim()) return "Quels fichiers ou exemples faut-il demander avant la relance ?";
  return "Quelles objections ou risques dois-je noter dans la fiche CRM avant de conclure ?";
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
- Outils utilisés : ${diagnostic.tools || "à préciser"}
- Personnes impliquées : ${diagnostic.people || "à préciser"}
- Étapes principales : ${diagnostic.processMap.trigger || "déclencheur à préciser"} → ${diagnostic.processMap.inputs || "entrées à préciser"} → ${diagnostic.processMap.treatment || "traitement à préciser"} → ${diagnostic.processMap.output || "sortie à préciser"}

## 3. Problèmes observés
- Temps perdu : ${formatHours(roi.savedMinutes)} par traitement estimé
- Erreurs : ${diagnostic.frequentErrors || "à préciser"}
- Risques : ${diagnostic.errorCost || "à préciser"}
- Dépendances : ${diagnostic.dependencies || "à préciser"}
- Données dispersées : ${diagnostic.processMap.inputs || "à préciser"}

## 4. Estimation du gain
- Volume mensuel : ${diagnostic.roi.monthlyVolume || "0"} traitements
- Temps actuel : ${diagnostic.roi.currentMinutes || "0"} min
- Temps cible estimé : ${diagnostic.roi.targetMinutes || "0"} min
- Gain mensuel : ${formatCurrency(roi.monthlyGain)}
- Gain annuel : ${formatCurrency(roi.annualGain)}

## 5. Faisabilité
- Fichiers disponibles : ${diagnostic.feasibility.hasExamples ? "oui" : "à confirmer"}
- Règles métier : ${diagnostic.feasibility.rulesDocumented ? "documentées" : "à clarifier"}
- Exceptions : ${diagnostic.feasibility.manyExceptions ? "nombreuses" : "limitées ou à confirmer"}
- Complexité technique : ${complexity}

## 6. Recommandation
${decision.recommendation} — ${decision.reason}

## 7. Prochaine étape
${diagnostic.nextAction || (decision.recommendation === "Ne rien faire" ? "Ne pas lancer de projet pour l’instant ; revisiter si le volume augmente." : "Demander 3 à 5 fichiers représentatifs et cadrer un POC court.")}`;
}

function buildCrmSummary(diagnostic: DiagnosticState) {
  const roi = calculateRoi(diagnostic.roi);
  const complexity = classifyComplexity(diagnostic.feasibility);
  const decision = recommend(diagnostic);

  return `# Fiche CRM interne — ${diagnostic.prospect.company || "Prospect"}

- Entreprise : ${diagnostic.prospect.company || "à renseigner"}
- Contact : ${diagnostic.prospect.contact || "à renseigner"}
- Activité : ${diagnostic.prospect.activity || "à renseigner"}
- Date RDV : ${diagnostic.prospect.meetingDate || "à renseigner"}
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
- Gains qualitatifs : ${diagnostic.qualitativeGains.length ? diagnostic.qualitativeGains.join(", ") : "à qualifier"}`;
}

function safeJsonParse(value: string | null): DiagnosticState | null {
  if (!value) return null;
  try {
    return { ...emptyDiagnostic, ...JSON.parse(value) } as DiagnosticState;
  } catch {
    return null;
  }
}

export default function Home() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>(emptyDiagnostic);
  const [activeStage, setActiveStage] = useState<StageId>("process");
  const [answerDraft, setAnswerDraft] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
      if (stored) setDiagnostic(stored);
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diagnostic));
  }, [diagnostic]);

  const activeStep = stages.find((step) => step.stage === activeStage) ?? stages[0];
  const roi = useMemo(() => calculateRoi(diagnostic.roi), [diagnostic.roi]);
  const complexity = useMemo(() => classifyComplexity(diagnostic.feasibility), [diagnostic.feasibility]);
  const decision = useMemo(() => recommend(diagnostic), [diagnostic]);
  const prospectSummary = useMemo(() => buildProspectSummary(diagnostic), [diagnostic]);
  const crmSummary = useMemo(() => buildCrmSummary(diagnostic), [diagnostic]);
  const progress = useMemo(() => {
    const checks = [
      diagnostic.prospect.company,
      diagnostic.prospect.contact,
      diagnostic.processName,
      diagnostic.pain,
      diagnostic.processMap.trigger,
      diagnostic.processMap.inputs,
      diagnostic.roi.currentMinutes,
      diagnostic.roi.monthlyVolume,
      diagnostic.roi.hourlyCost,
      diagnostic.feasibility.hasExamples || diagnostic.feasibility.notes,
      diagnostic.nextAction,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [diagnostic]);

  function update<K extends keyof DiagnosticState>(key: K, value: DiagnosticState[K]) {
    setDiagnostic((current) => ({ ...current, [key]: value }));
  }

  function updateProspect<K extends keyof ProspectInfo>(key: K, value: ProspectInfo[K]) {
    setDiagnostic((current) => ({ ...current, prospect: { ...current.prospect, [key]: value } }));
  }

  function updateMap<K extends keyof ProcessMap>(key: K, value: ProcessMap[K]) {
    setDiagnostic((current) => ({ ...current, processMap: { ...current.processMap, [key]: value } }));
  }

  function updateRoi<K extends keyof RoiInputs>(key: K, value: RoiInputs[K]) {
    setDiagnostic((current) => ({ ...current, roi: { ...current.roi, [key]: value } }));
  }

  function updateFeasibility<K extends keyof FeasibilityInputs>(key: K, value: FeasibilityInputs[K]) {
    setDiagnostic((current) => ({ ...current, feasibility: { ...current.feasibility, [key]: value } }));
  }

  function toggleGain(gain: string) {
    setDiagnostic((current) => ({
      ...current,
      qualitativeGains: current.qualitativeGains.includes(gain)
        ? current.qualitativeGains.filter((item) => item !== gain)
        : [...current.qualitativeGains, gain],
    }));
  }

  function saveAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = answerDraft.trim();
    if (!response) return;

    setDiagnostic((current) => ({
      ...current,
      answers: [
        ...current.answers,
        {
          id: crypto.randomUUID(),
          stage: activeStage,
          question: missingQuestion(current, activeStage),
          response,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    setAnswerDraft("");
  }

  async function copyText(label: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2200);
  }

  function resetDiagnostic() {
    const next = { ...emptyDiagnostic, prospect: { ...emptyDiagnostic.prospect, meetingDate: new Date().toISOString().slice(0, 10) } };
    setDiagnostic(next);
    setActiveStage("process");
    setAnswerDraft("");
  }

  function downloadExport() {
    const payload = JSON.stringify({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), diagnostic }, null, 2);
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
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 md:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-200">Packing Factory · Diagnostic projet prospect</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">Agent IA de diagnostic automatisation</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Guide un rendez-vous de 45 minutes, adapte les relances selon les réponses, calcule le ROI et génère une synthèse prospect + fiche CRM.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={resetDiagnostic} className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10" type="button">
              Nouveau diagnostic
            </button>
            <Link href="/settings" className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20">
              Settings LLM
            </Link>
          </div>
        </header>

        <section className="mb-5 grid gap-3 md:grid-cols-5">
          {stages.map((step, index) => {
            const active = step.stage === activeStage;
            return (
              <button
                key={step.stage}
                type="button"
                onClick={() => setActiveStage(step.stage)}
                className={`rounded-3xl border p-4 text-left transition ${
                  active ? "border-cyan-300/50 bg-cyan-300/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Étape {index + 1}</span>
                <p className="mt-2 font-semibold text-zinc-100">{step.title.replace(/^\d\.\s*/, "")}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{step.goal}</p>
              </button>
            );
          })}
        </section>

        <div className="mb-5 rounded-full border border-white/10 bg-white/[0.04] p-1">
          <div className="rounded-full bg-cyan-300 px-4 py-1 text-xs font-semibold text-slate-950 transition-all" style={{ width: `${Math.max(progress, 8)}%` }}>
            {progress}% complété
          </div>
        </div>

        <div className="grid flex-1 gap-5 lg:grid-cols-[390px_1fr_390px]">
          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
              <h2 className="text-lg font-semibold">Informations prospect</h2>
              <div className="mt-4 space-y-3">
                <Input label="Entreprise" value={diagnostic.prospect.company} onChange={(value) => updateProspect("company", value)} />
                <Input label="Contact" value={diagnostic.prospect.contact} onChange={(value) => updateProspect("contact", value)} />
                <Input label="Activité" value={diagnostic.prospect.activity} onChange={(value) => updateProspect("activity", value)} />
                <Input label="Date du rendez-vous" type="date" value={diagnostic.prospect.meetingDate} onChange={(value) => updateProspect("meetingDate", value)} />
                <Textarea label="Contexte / enjeu principal" value={diagnostic.prospect.context} onChange={(value) => updateProspect("context", value)} rows={3} />
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
              <h2 className="text-lg font-semibold">Agent conducteur</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{activeStep.guide}</p>
              <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
                <p className="font-semibold">Question conseillée maintenant</p>
                <p className="mt-2">{missingQuestion(diagnostic, activeStage)}</p>
              </div>
              <form onSubmit={saveAnswer} className="mt-4 space-y-3">
                <Textarea label="Réponse libre du prospect" value={answerDraft} onChange={setAnswerDraft} rows={4} />
                <button type="submit" disabled={!answerDraft.trim()} className="w-full rounded-full bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40">
                  Noter cette réponse
                </button>
              </form>
              <details className="mt-4 text-sm text-zinc-400">
                <summary className="cursor-pointer text-zinc-200">Questions exemples disponibles</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {activeStep.examples.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </details>
            </section>
          </aside>

          <section className="space-y-5">
            {activeStage === "process" ? (
              <Card title="1. Identifier le processus">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Processus à diagnostiquer" value={diagnostic.processName} onChange={(value) => update("processName", value)} placeholder="Ex. contrôle Excel import/export" />
                  <Input label="Outils utilisés" value={diagnostic.tools} onChange={(value) => update("tools", value)} placeholder="Excel, ERP, mails, Drive…" />
                  <Input label="Personnes impliquées" value={diagnostic.people} onChange={(value) => update("people", value)} />
                  <Input label="Dépendance humaine forte" value={diagnostic.dependencies} onChange={(value) => update("dependencies", value)} />
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Textarea label="Douleur principale" value={diagnostic.pain} onChange={(value) => update("pain", value)} />
                  <Textarea label="Erreurs fréquentes" value={diagnostic.frequentErrors} onChange={(value) => update("frequentErrors", value)} />
                  <Textarea label="Coût / impact d’une erreur" value={diagnostic.errorCost} onChange={(value) => update("errorCost", value)} />
                  <Textarea label="Résultat idéal" value={diagnostic.idealResult} onChange={(value) => update("idealResult", value)} />
                </div>
              </Card>
            ) : null}

            {activeStage === "mapping" ? (
              <Card title="2. Cartographier l’existant">
                <div className="grid gap-4 md:grid-cols-2">
                  <Textarea label="Déclencheur" value={diagnostic.processMap.trigger} onChange={(value) => updateMap("trigger", value)} />
                  <Textarea label="Entrées" value={diagnostic.processMap.inputs} onChange={(value) => updateMap("inputs", value)} />
                  <Textarea label="Traitement" value={diagnostic.processMap.treatment} onChange={(value) => updateMap("treatment", value)} />
                  <Textarea label="Contrôles" value={diagnostic.processMap.controls} onChange={(value) => updateMap("controls", value)} />
                  <Textarea label="Sortie attendue" value={diagnostic.processMap.output} onChange={(value) => updateMap("output", value)} />
                  <Textarea label="Transmission" value={diagnostic.processMap.transmission} onChange={(value) => updateMap("transmission", value)} />
                </div>
              </Card>
            ) : null}

            {activeStage === "roi" ? (
              <Card title="3. Mesurer le ROI">
                <div className="grid gap-4 md:grid-cols-4">
                  <Input label="Temps actuel / traitement (min)" inputMode="decimal" value={diagnostic.roi.currentMinutes} onChange={(value) => updateRoi("currentMinutes", value)} />
                  <Input label="Temps cible (min)" inputMode="decimal" value={diagnostic.roi.targetMinutes} onChange={(value) => updateRoi("targetMinutes", value)} />
                  <Input label="Volume mensuel" inputMode="decimal" value={diagnostic.roi.monthlyVolume} onChange={(value) => updateRoi("monthlyVolume", value)} />
                  <Input label="Coût horaire (€)" inputMode="decimal" value={diagnostic.roi.hourlyCost} onChange={(value) => updateRoi("hourlyCost", value)} />
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <Metric label="Gain / traitement" value={formatHours(roi.savedMinutes)} />
                  <Metric label="Heures gagnées / mois" value={`${roi.monthlyHours.toFixed(1).replace(".", ",")} h`} />
                  <Metric label="Gain mensuel" value={formatCurrency(roi.monthlyGain)} />
                  <Metric label="Gain annuel" value={formatCurrency(roi.annualGain)} />
                </div>
                <div className="mt-5">
                  <p className="mb-3 text-sm font-medium text-zinc-200">Gains qualitatifs</p>
                  <div className="flex flex-wrap gap-2">
                    {qualitativeGainOptions.map((gain) => (
                      <button
                        key={gain}
                        type="button"
                        onClick={() => toggleGain(gain)}
                        className={`rounded-full border px-3 py-2 text-xs transition ${diagnostic.qualitativeGains.includes(gain) ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/10"}`}
                      >
                        {gain}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            ) : null}

            {activeStage === "feasibility" ? (
              <Card title="4. Évaluer la faisabilité">
                <div className="grid gap-3 md:grid-cols-2">
                  <Check label="3 à 5 fichiers exemples disponibles" checked={diagnostic.feasibility.hasExamples} onChange={(value) => updateFeasibility("hasExamples", value)} />
                  <Check label="Structure de fichiers stable" checked={diagnostic.feasibility.stableStructure} onChange={(value) => updateFeasibility("stableStructure", value)} />
                  <Check label="Règles métier documentées" checked={diagnostic.feasibility.rulesDocumented} onChange={(value) => updateFeasibility("rulesDocumented", value)} />
                  <Check label="Validateur métier identifié" checked={diagnostic.feasibility.validatorIdentified} onChange={(value) => updateFeasibility("validatorIdentified", value)} />
                  <Check label="Modèle de sortie existant" checked={diagnostic.feasibility.outputTemplate} onChange={(value) => updateFeasibility("outputTemplate", value)} />
                  <Check label="Beaucoup d’exceptions" checked={diagnostic.feasibility.manyExceptions} onChange={(value) => updateFeasibility("manyExceptions", value)} />
                  <Check label="Connexion ERP nécessaire" checked={diagnostic.feasibility.needsErp} onChange={(value) => updateFeasibility("needsErp", value)} />
                </div>
                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5">
                  <p className="text-sm text-zinc-400">Complexité calculée</p>
                  <p className="mt-1 text-3xl font-semibold text-cyan-100">{complexity}</p>
                </div>
                <div className="mt-4">
                  <Textarea label="Notes de faisabilité / exceptions" value={diagnostic.feasibility.notes} onChange={(value) => updateFeasibility("notes", value)} rows={5} />
                </div>
              </Card>
            ) : null}

            {activeStage === "recommendation" ? (
              <Card title="5. Recommandation et suivi commercial">
                <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">Recommandation</p>
                  <p className="mt-2 text-4xl font-semibold">{decision.recommendation}</p>
                  <p className="mt-3 text-sm leading-6 text-cyan-50">{decision.reason}</p>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Textarea label="Prochaine action commerciale" value={diagnostic.nextAction} onChange={(value) => update("nextAction", value)} />
                  <Textarea label="Objections / risques" value={diagnostic.objections} onChange={(value) => update("objections", value)} />
                  <Textarea label="Fichiers à demander" value={diagnostic.filesToRequest} onChange={(value) => update("filesToRequest", value)} />
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-200">Niveau d’intérêt</label>
                    <select value={diagnostic.interestLevel} onChange={(event) => update("interestLevel", event.target.value as InterestLevel)} className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-cyan-300/60">
                      <option>Faible</option>
                      <option>Moyen</option>
                      <option>Fort</option>
                    </select>
                    <Input label="Date de relance" type="date" value={diagnostic.followUpDate} onChange={(value) => update("followUpDate", value)} />
                  </div>
                </div>
              </Card>
            ) : null}

            <Card title="Réponses libres notées pendant le rendez-vous">
              {diagnostic.answers.length ? (
                <div className="space-y-3">
                  {diagnostic.answers.slice().reverse().map((answer) => (
                    <article key={answer.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{stages.find((step) => step.stage === answer.stage)?.title}</p>
                      <p className="mt-2 text-sm text-cyan-100">{answer.question}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{answer.response}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Aucune réponse libre enregistrée pour l’instant.</p>
              )}
            </Card>
          </section>

          <aside className="space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5">
              <h2 className="text-lg font-semibold">Synthèses copiables</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Les contenus se mettent à jour automatiquement avec les champs structurés et les notes libres.</p>
              <div className="mt-4 space-y-3">
                <button onClick={() => copyText("prospect", prospectSummary)} className="w-full rounded-full bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200" type="button">
                  Copier la synthèse prospect
                </button>
                <button onClick={() => copyText("crm", crmSummary)} className="w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10" type="button">
                  Copier la fiche CRM
                </button>
                <button onClick={downloadExport} className="w-full rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20" type="button">
                  Exporter JSON pour suivi
                </button>
                {copied ? <p className="text-center text-sm text-emerald-300">Copié : {copied}</p> : null}
              </div>
            </section>

            <Preview title="Synthèse prospect" content={prospectSummary} />
            <Preview title="Fiche CRM" content={crmSummary} />
          </aside>
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-2xl shadow-black/20">
      <h2 className="mb-5 text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "decimal" | "numeric";
}) {
  return (
    <label className="block text-sm font-medium text-zinc-200">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block text-sm font-medium text-zinc-200">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/60"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200 transition hover:bg-white/[0.06]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-cyan-300" />
      {label}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function Preview({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-zinc-300">
        {content}
      </pre>
    </section>
  );
}
