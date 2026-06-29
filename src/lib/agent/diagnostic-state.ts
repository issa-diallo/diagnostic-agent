export type DiagnosticStage =
  | "process_discovery"
  | "manual_work_detection"
  | "roi_diagnostic"
  | "automation_feasibility"
  | "recommendation"
  | "commercial_synthesis";

export type RecommendationDecision = "nothing" | "audit" | "poc" | "mvp" | "full_project";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RecommendationConfidence = "low" | "medium" | "high";

export type DiagnosticRecommendation = {
  decision: RecommendationDecision;
  confidence: RecommendationConfidence;
  reason: string;
};

export type DiagnosticRoi = {
  monthlyHoursSaved: number;
  monthlyGain: number;
  annualGain: number;
};

export type DiagnosticAgentState = {
  stage: DiagnosticStage;
  company?: string;
  contact?: string;
  activity?: string;
  processName?: string;
  painPoints: string[];
  toolsUsed: string[];
  filesUsed: string[];
  manualTasks: string[];
  monthlyVolume?: number;
  timePerCaseMinutes?: number;
  targetTimeMinutes?: number;
  hourlyCost?: number;
  hasExamples?: boolean;
  stableStructure?: boolean;
  rulesDocumented?: boolean;
  validatorIdentified?: string;
  risks: string[];
  missingInformation: string[];
  roi?: DiagnosticRoi;
  recommendation?: DiagnosticRecommendation;
  conversation: AgentMessage[];
};

export type AgentResponse = {
  answer: string;
  nextQuestion?: string;
  usedSkill: string;
  stage: DiagnosticStage;
  missingInformation: string[];
  updatedState: DiagnosticAgentState;
  provisionalRecommendation?: DiagnosticRecommendation;
};

export type FinalSummaryResponse = {
  summaryMarkdown: string;
  followUpEmail: string;
  crmNote: string;
  recommendation: DiagnosticRecommendation;
};

export function createEmptyDiagnosticAgentState(): DiagnosticAgentState {
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
