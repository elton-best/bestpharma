// Registre unique des cours rédigés par lot (tous stockés en code).
// Lot 1 : 00-orchestration (44) — Lot 2 : 01-frontend-design (82)
// Lot 3 : 02-backend-docs, parties 1-2 (8, suite à venir).
// Lot 4 : qa-debug + backend-docs + architecture (25).
// Lot 5 : agents-ai, complet (54 : 11 généralistes + 43 OmniRoute).
import { LOT1_ORCHESTRATION, type LotCourse } from "./lot1-orchestration";
import { LOT2_FRONTEND } from "./lot2-frontend-design";
import { LOT3_BACKEND } from "./lot3-backend-docs";
import { LOT4_QA_ARCHI } from "./lot4-qa-archi";
import { LOT5_AGENTS_AI } from "./lot5-agents-ai";

export type { LotCourse };

export function getLotCourse(skillId: string): LotCourse | undefined {
  return (
    LOT1_ORCHESTRATION.find((c) => c.skillId === skillId) ??
    LOT2_FRONTEND.find((c) => c.skillId === skillId) ??
    LOT3_BACKEND.find((c) => c.skillId === skillId) ??
    LOT4_QA_ARCHI.find((c) => c.skillId === skillId) ??
    LOT5_AGENTS_AI.find((c) => c.skillId === skillId)
  );
}

export function lotCourseCount(): number {
  return (
    LOT1_ORCHESTRATION.length +
    LOT2_FRONTEND.length +
    LOT3_BACKEND.length +
    LOT4_QA_ARCHI.length +
    LOT5_AGENTS_AI.length
  );
}
