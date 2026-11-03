import rawSkills from "./skills-data.json";
import rawCourses from "./skills-courses.json";

export interface ProtocolStep {
  step: number;
  title: string;
  description: string;
}

export interface DosAndDonts {
  dos: string[];
  donts: string[];
}

export interface SkillPedagogy {
  conceptExplanation: string;
  challengesFaced: string;
  superpowers: string;
  whenToUse: string;
  howToUse: string;
  protocolSteps: ProtocolStep[];
  dosAndDonts: DosAndDonts;
}

export interface AgentAssignment {
  systemPrompt: string;
  activationTriggers: string;
  agentConfigSnippet: string;
  claudeCodeCommand: string;
}

export interface CourseQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface CourseLab {
  title?: string;
  objective?: string;
  steps?: string[];
  instructions?: string[];
  validationCriteria?: string;
  expectedOutcome?: string;
  solutionWalkthrough?: string;
  solutionNotes?: string;
}

export interface CourseChapter {
  chapterNumber: number;
  title: string;
  readingMinutes: number;
  theoreticalFoundation?: string;
  theoryContent?: string;
  architecturalPatterns?: string;
  codeImplementation?: string;
  concreteExamples?: string;
  agentCollaborationGuide?: string;
  agentWorkflow?: string;
  practicalLab?: CourseLab;
  lab?: CourseLab;
  quiz?: CourseQuizItem[];
}

export interface SkillFullCourse {
  skillId: string;
  courseTitle: string;
  subtitle?: string;
  domain?: string;
  estimatedHours: number;
  level?: string;
  overview: string;
  prerequisites: string[];
  learningOutcomes?: string[];
  learningGoals?: string[];
  chapters: CourseChapter[];
}

export interface AiSkill {
  id: string;
  name: string;
  category: "orchestration" | "frontend-design" | "backend-docs" | "agents-ai" | "qa-debug" | "architecture" | "core-skills" | string;
  categoryLabel: string;
  categoryTagline: string;
  subcategory: string;
  shortDescription: string;
  pedagogy: SkillPedagogy;
  agentAssignment: AgentAssignment;
  tags: string[];
  fullMarkdownSource: string;
}

export interface SkillCategoryInfo {
  id: string;
  label: string;
  description: string;
  count: number;
}

export const AI_SKILLS: AiSkill[] = rawSkills as AiSkill[];
export const SKILL_COURSES: Record<string, SkillFullCourse> = rawCourses as Record<string, SkillFullCourse>;

export const SKILL_CATEGORIES: SkillCategoryInfo[] = [
  {
    id: "all",
    label: "Tous les Skills",
    description: "L'ensemble des 219 compétences de pointe pour développeurs et agents d'élite",
    count: AI_SKILLS.length,
  },
  {
    id: "core-skills",
    label: "Skills Socles AI Factory",
    description: "Les 7 compétences piliers avec cours complets générés par IA",
    count: AI_SKILLS.filter((s) => s.category === "core-skills").length,
  },
  {
    id: "orchestration",
    label: "Orchestration & Méthodes IA",
    description: "TDD, découpage de tâches, review, subagents et supervision d'agents autonomes",
    count: AI_SKILLS.filter((s) => s.category === "orchestration").length,
  },
  {
    id: "frontend-design",
    label: "Frontend & Design System",
    description: "Règles Refactoring UI, typographie, palettes de couleurs, hiérarchie et ThreeJS",
    count: AI_SKILLS.filter((s) => s.category === "frontend-design").length,
  },
  {
    id: "agents-ai",
    label: "Agents IA & Tool-Calling",
    description: "Prompt engineering, RAG, tool calling, navigation web headless et boucles d'agents",
    count: AI_SKILLS.filter((s) => s.category === "agents-ai").length,
  },
  {
    id: "qa-debug",
    label: "QA, Tests & Débogage",
    description: "Diagnostic de cause racine, suites de tests de non-régression et validation automatique",
    count: AI_SKILLS.filter((s) => s.category === "qa-debug").length,
  },
  {
    id: "backend-docs",
    label: "Backend, API & Docs",
    description: "APIs Node/Fastify, architectures de données, documentation technique et spécifications",
    count: AI_SKILLS.filter((s) => s.category === "backend-docs").length,
  },
  {
    id: "architecture",
    label: "Architecture & Systèmes",
    description: "Clean architecture, domain modeling, communication inter-services et gouvernance",
    count: AI_SKILLS.filter((s) => s.category === "architecture").length,
  },
];

export function getSkillById(id: string): AiSkill | undefined {
  return AI_SKILLS.find((s) => s.id === id);
}

export function getCourseForSkill(skillId: string): SkillFullCourse | undefined {
  return SKILL_COURSES[skillId];
}

/**
 * Generate a URL-safe slug for a skill.
 * Skill IDs are already kebab-case (e.g., "refactor-ui", "debug-root-cause")
 * so they work directly as slugs.
 */
export function getSkillSlug(skill: AiSkill): string {
  return skill.id.toLowerCase();
}

/**
 * Look up a skill by its slug (which is the skill ID in lowercase).
 */
export function getSkillBySlug(slug: string): AiSkill | undefined {
  return AI_SKILLS.find((s) => s.id.toLowerCase() === slug.toLowerCase());
}

export function searchSkills(query: string, category: string = "all"): AiSkill[] {
  const q = query.trim().toLowerCase();
  return AI_SKILLS.filter((skill) => {
    const matchCat = category === "all" || skill.category === category;
    if (!matchCat) return false;
    if (!q) return true;
    return (
      skill.id.toLowerCase().includes(q) ||
      skill.name.toLowerCase().includes(q) ||
      skill.shortDescription.toLowerCase().includes(q) ||
      skill.pedagogy.conceptExplanation.toLowerCase().includes(q) ||
      skill.tags.some((t) => t.toLowerCase().includes(q))
    );
  });
}
