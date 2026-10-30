import "server-only";
import planJson from "@/data/study-plan.json";
import { studyPlanSchema } from "@/lib/plan/schema";
import { buildLandingPlan, type LandingPlanData } from "./plan-facts";

/**
 * The landing page's plan facts, read from the real study-plan source.
 *
 * The JSON is 216 KB, so it is imported here on the server and only the small,
 * plain `LandingPlanData` shape crosses into the client. It is parsed against
 * the app's own schema first, so a landing build fails fast on the same drift
 * the workspace would fail on.
 */
const plan = studyPlanSchema.parse(planJson);

export const LANDING_PLAN: LandingPlanData = buildLandingPlan(
  plan.daily_targets,
  plan.phases,
);
