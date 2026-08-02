export type Plan = "free";

export interface PlanLimits {
  /** Max canvases a user may create. Existing canvases over this are kept; the
   *  cap only blocks creating new ones. */
  canvases: number;
}

export const PLANS: Record<Plan, PlanLimits> = {
  free: { canvases: 5 },
};

/**
 * The user's plan. Everyone is on `free` until billing exists — this is the
 * single seam to change (look the plan up per user) when it does.
 */
export function getUserPlan(userId: string): Plan {
  void userId; // seam: look the plan up per user once billing exists
  return "free";
}

export function limitsFor(plan: Plan): PlanLimits {
  return PLANS[plan] ?? PLANS.free;
}
