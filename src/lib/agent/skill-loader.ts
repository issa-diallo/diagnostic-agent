import { readFile } from "node:fs/promises";
import path from "node:path";

const SKILL_FILES = [
  "process-discovery.md",
  "manual-work-detection.md",
  "roi-diagnostic.md",
  "automation-feasibility.md",
  "poc-mvp-recommendation.md",
  "commercial-synthesis.md",
] as const;

export type DiagnosticSkillName = (typeof SKILL_FILES)[number] extends `${infer Name}.md` ? Name : never;

export async function loadDiagnosticSkills(): Promise<Record<string, string>> {
  const skillsDir = path.join(process.cwd(), "src", "lib", "skills");
  const entries = await Promise.all(
    SKILL_FILES.map(async (fileName) => {
      const content = await readFile(path.join(skillsDir, fileName), "utf8");
      return [fileName.replace(/\.md$/, ""), content] as const;
    }),
  );

  return Object.fromEntries(entries);
}
