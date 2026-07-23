import type { HttpResponse } from "../utils/http";
import { extractFromResponse, extractedToString } from "./get-path";
import type { AssertCheck, AssertOp } from "./types";

export const ASSERT_OPS: { value: AssertOp; label: string }[] = [
  { value: "exists", label: "exists" },
  { value: "equals", label: "=" },
  { value: "contains", label: "contains" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

export interface CheckResult {
  pass: boolean;
  /** What the response actually held at the path (for failure hints). */
  actual: string;
}

export const evaluateCheck = (
  check: AssertCheck,
  response: HttpResponse
): CheckResult => {
  const raw = extractFromResponse(response, check.path);
  const actual = raw === undefined ? "(missing)" : extractedToString(raw);

  switch (check.op) {
    case "exists":
      return { pass: raw !== undefined, actual };
    case "equals":
      return { pass: raw !== undefined && actual === check.value, actual };
    case "contains":
      return {
        pass: raw !== undefined && actual.includes(check.value),
        actual,
      };
    case "gt":
    case "lt": {
      const a = Number(actual);
      const b = Number(check.value);
      if (raw === undefined || Number.isNaN(a) || Number.isNaN(b)) {
        return { pass: false, actual };
      }
      return { pass: check.op === "gt" ? a > b : a < b, actual };
    }
  }
};

export const evaluateChecks = (
  checks: AssertCheck[],
  response: HttpResponse | null
): { results: CheckResult[]; failed: number } => {
  if (!response) {
    return {
      results: checks.map(() => ({ pass: false, actual: "(no response)" })),
      failed: checks.length,
    };
  }
  const results = checks.map((c) => evaluateCheck(c, response));
  return { results, failed: results.filter((r) => !r.pass).length };
};
