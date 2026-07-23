import { buildResolvedConfig } from "../canvas/execute-request";
import { evaluateChecks } from "../canvas/asserts";
import { extractFromResponse, extractedToString } from "../canvas/get-path";
import type {
  FlowSpec,
  FlowRequest,
  FlowAuth,
  FlowRunReport,
} from "../canvas/flow-spec";
import type { CardRequestSnapshot, AssertCheck } from "../canvas/types";
import type { HttpResponse, RequestConfig } from "../utils/http";

/**
 * Headless flow execution: run a FlowSpec entirely server-side — no
 * canvas, no stores, plain fetch. Same semantics as the browser engine
 * (topological order, bindings, {{var}} resolution, origin defaults,
 * asserts, failures reported not fatal) and the same report shape, so
 * agents and CI can't tell the difference. The spec is the sole source
 * of truth: variables come from spec.environment, defaults from
 * spec.defaults.
 */

const REQUEST_TIMEOUT_MS = 30_000;

const authToSnapshot = (
  auth: FlowAuth | null | undefined
): Pick<CardRequestSnapshot, "authType" | "authConfig"> => {
  if (!auth) return { authType: "none", authConfig: {} };
  if (auth.type === "bearer") {
    return { authType: "bearer", authConfig: { bearerToken: auth.token } };
  }
  if (auth.type === "basic") {
    return {
      authType: "basic",
      authConfig: { username: auth.username, password: auth.password },
    };
  }
  return {
    authType: "api-key",
    authConfig: { apiKey: auth.key, apiKeyHeader: auth.header ?? "X-Api-Key" },
  };
};

/** Kahn topological order over `after` + `bindings[].from` parent refs.
 *  Spec order breaks ties; null on a cycle. */
const orderRequests = (spec: FlowSpec): FlowRequest[] | null => {
  const byId = new Map(spec.requests.map((r) => [r.id, r]));
  const parentsOf = (r: FlowRequest): string[] => {
    const ps = new Set<string>();
    if (r.after && byId.has(r.after)) ps.add(r.after);
    for (const b of r.bindings ?? []) if (byId.has(b.from)) ps.add(b.from);
    return [...ps];
  };
  const indegree = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const r of spec.requests) {
    indegree.set(r.id, parentsOf(r).length);
    for (const p of parentsOf(r)) {
      (childrenOf.get(p) ?? childrenOf.set(p, []).get(p)!).push(r.id);
    }
  }
  const order: FlowRequest[] = [];
  const ready = spec.requests.filter((r) => indegree.get(r.id) === 0);
  while (ready.length > 0) {
    const next = ready.shift()!;
    order.push(next);
    for (const childId of childrenOf.get(next.id) ?? []) {
      const d = indegree.get(childId)! - 1;
      indegree.set(childId, d);
      if (d === 0) ready.push(byId.get(childId)!);
    }
  }
  return order.length === spec.requests.length ? order : null;
};

/** Direct fetch producing the app's HttpResponse envelope. */
const sendDirect = async (config: RequestConfig): Promise<HttpResponse> => {
  const started = Date.now();
  try {
    const hasBody =
      config.body !== undefined &&
      config.method !== "GET" &&
      config.method !== "HEAD";
    const res = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: hasBody ? (config.body as string) : undefined,
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* non-JSON body stays a string */
    }
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k] = v;
    });
    return {
      status: res.status,
      statusText: res.statusText,
      headers,
      data,
      time: Date.now() - started,
      size: new TextEncoder().encode(text).length,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "TimeoutError"
          ? `timed out after ${REQUEST_TIMEOUT_MS}ms`
          : err.message
        : "request failed";
    return {
      status: 0,
      statusText: message,
      headers: {},
      data: { error: message },
      time: Date.now() - started,
      size: 0,
    };
  }
};

export const runFlowSpecHeadless = async (
  spec: FlowSpec
): Promise<FlowRunReport> => {
  const startedAt = Date.now();
  const report: FlowRunReport = {
    startedAt,
    finishedAt: startedAt,
    passed: false,
    verdict: "",
    requests: [],
    checks: [],
  };
  const done = (verdict: string, passed: boolean): FlowRunReport => {
    report.finishedAt = Date.now();
    report.verdict = verdict;
    report.passed = passed;
    return report;
  };

  const order = orderRequests(spec);
  if (!order) return done("cycle detected in flow", false);

  const responses = new Map<string, HttpResponse>();
  let failed = 0;
  let checksTotal = 0;
  let checksFailed = 0;

  for (const r of order) {
    // Variables: spec environment, then values bound from earlier
    // responses. Bound headers ride over the request's own.
    const variables: Record<string, string> = {
      ...(spec.environment?.variables ?? {}),
    };
    const boundHeaders: Record<string, string> = {};
    for (const b of r.bindings ?? []) {
      const source = responses.get(b.from);
      if (!source) continue;
      const value = extractedToString(extractFromResponse(source, b.path));
      if ((b.as ?? "variable") === "header") boundHeaders[b.name] = value;
      else variables[b.name] = value;
    }

    const snapshot: CardRequestSnapshot = {
      method: r.method,
      url: r.url,
      urlRaw: r.url,
      headers: {
        ...(spec.defaults?.headers ?? {}),
        ...(r.headers ?? {}),
        ...boundHeaders,
      },
      body: r.body?.content ?? null,
      bodyType: r.body ? r.body.type : "none",
      ...authToSnapshot(r.auth ?? spec.defaults?.auth),
    };

    const { config, error } = buildResolvedConfig(snapshot, variables);
    const response = config
      ? await sendDirect(config)
      : ({
          status: 0,
          statusText: error ?? "invalid request",
          headers: {},
          data: { error: error ?? "invalid request" },
          time: 0,
          size: 0,
        } as HttpResponse);

    const ok = response.status > 0;
    if (!ok) failed++;
    responses.set(r.id, response);
    report.requests.push({
      id: r.id,
      name: r.name ?? r.id,
      method: r.method,
      url: r.url,
      ok,
      status: ok ? response.status : null,
      time: ok ? response.time : null,
      error: ok ? null : response.statusText,
    });

    // Grade this request's asserts against its fresh response.
    const asserts = r.asserts ?? [];
    if (asserts.length > 0) {
      const checks: AssertCheck[] = asserts.map((a, i) => ({
        id: `${r.id}-${i}`,
        path: a.path,
        op: a.op,
        value: a.value ?? "",
      }));
      const { results, failed: f } = evaluateChecks(checks, ok ? response : null);
      checks.forEach((c, i) => {
        report.checks.push({
          request: r.id,
          path: c.path,
          op: c.op,
          value: c.op === "exists" ? undefined : c.value,
          pass: results[i].pass,
          actual: results[i].actual,
        });
      });
      checksTotal += checks.length;
      checksFailed += f;
    }
  }

  const parts: string[] = [];
  if (failed === 0 && checksFailed === 0) {
    parts.push(`${order.length} passed`);
    if (checksTotal > 0) parts.push(`${checksTotal} checks ✓`);
  } else {
    if (failed > 0) parts.push(`${failed} of ${order.length} failed`);
    else parts.push(`${order.length} passed`);
    if (checksFailed > 0) parts.push(`${checksFailed} checks failed`);
    else if (checksTotal > 0) parts.push(`${checksTotal} checks ✓`);
  }
  return done(parts.join(" · "), failed === 0 && checksFailed === 0);
};
