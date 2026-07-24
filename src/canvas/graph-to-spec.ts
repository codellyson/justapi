import type {
  CanvasGraph,
  RequestNode,
  CollectionNode,
  AssertNode,
  AuthType,
} from "./types";
import type { FlowSpec, FlowRequest, FlowBinding, FlowAssert, FlowAuth } from "./flow-spec";

const authFrom = (
  authType: AuthType,
  cfg: Record<string, string | undefined>
): FlowAuth | null => {
  switch (authType) {
    case "bearer":
      return { type: "bearer", token: cfg.bearerToken ?? "" };
    case "basic":
      return { type: "basic", username: cfg.username ?? "", password: cfg.password ?? "" };
    case "api-key":
      return { type: "api-key", header: cfg.apiKeyHeader ?? "", key: cfg.apiKey ?? "" };
    default:
      return null;
  }
};

export interface SpecContext {
  /** Flow name — origin collection name, or the board name as a fallback. */
  name: string;
  environment?: { name: string; variables?: Record<string, string> };
}

/**
 * Serialize the live canvas graph back into a declarative FlowSpec — the
 * inverse of `materializeFlow`. This is what the spec drawer shows: the
 * board expressed as the document agents read and write. Returns null when
 * there are no request nodes to describe.
 */
export const graphToFlowSpec = (
  graph: CanvasGraph,
  ctx: SpecContext
): FlowSpec | null => {
  const requests = graph.nodes.filter(
    (n): n is RequestNode => n.type === "request"
  );
  if (requests.length === 0) return null;
  const origin = graph.nodes.find(
    (n): n is CollectionNode => n.type === "collection"
  );
  const asserts = graph.nodes.filter(
    (n): n is AssertNode => n.type === "assert"
  );

  const specId = (nodeId: string): string => {
    const n = requests.find((r) => r.id === nodeId);
    return n?.data.specId || nodeId;
  };

  const flowRequests: FlowRequest[] = requests.map((r) => {
    const snap = r.data.snapshot;

    const bindings: FlowBinding[] = graph.edges
      .filter((e) => e.target === r.id && e.data)
      .map((e) => ({
        from: specId(e.source),
        path: e.data!.sourcePath,
        as: e.data!.targetKind,
        name: e.data!.targetName,
      }))
      .filter((b) => b.name);

    // Parent for `after`: an incoming structural (dataless) edge from
    // another request. Origin spawns carry no `after`.
    const parent = graph.edges.find(
      (e) =>
        e.target === r.id &&
        !e.data &&
        requests.some((rr) => rr.id === e.source)
    );

    const myAsserts: FlowAssert[] = asserts
      .filter((a) =>
        graph.edges.some((e) => e.target === a.id && e.source === r.id)
      )
      .flatMap((a) =>
        a.data.checks.map((c) => ({
          path: c.path,
          op: c.op,
          value: c.op === "exists" ? undefined : c.value,
        }))
      )
      .filter((a) => a.path);

    const fr: FlowRequest = {
      id: r.data.specId || r.id,
      method: snap.method,
      url: snap.urlRaw || snap.url,
    };
    if (r.data.name) fr.name = r.data.name;
    if (Object.keys(snap.headers).length) fr.headers = snap.headers;
    if ((snap.bodyType === "json" || snap.bodyType === "raw") && snap.body) {
      fr.body = { type: snap.bodyType, content: snap.body };
    }
    const auth = authFrom(snap.authType, snap.authConfig);
    if (auth) fr.auth = auth;
    if (parent) fr.after = specId(parent.source);
    if (bindings.length) fr.bindings = bindings;
    if (myAsserts.length) fr.asserts = myAsserts;
    return fr;
  });

  const spec: FlowSpec = {
    justapiFlow: 1,
    name: ctx.name,
    requests: flowRequests,
  };

  if (ctx.environment?.variables && Object.keys(ctx.environment.variables).length) {
    spec.environment = ctx.environment;
  }

  if (origin) {
    const defaults: NonNullable<FlowSpec["defaults"]> = {};
    if (origin.data.headers && Object.keys(origin.data.headers).length) {
      defaults.headers = origin.data.headers;
    }
    const oAuth =
      origin.data.authType && origin.data.authType !== "none"
        ? authFrom(origin.data.authType, origin.data.authConfig ?? {})
        : null;
    if (oAuth) defaults.auth = oAuth;
    if (Object.keys(defaults).length) spec.defaults = defaults;
  }

  return spec;
};

const q = (s: string): string => JSON.stringify(s);

const authInline = (a: FlowAuth): string => {
  if (a.type === "bearer") return q(`Bearer ${a.token || "{{token}}"}`);
  if (a.type === "basic") return q(`Basic ${a.username || "user"}:••••`);
  return q(`${a.header || "X-Api-Key"}: ${a.key || "{{key}}"}`);
};

/** Render a FlowSpec as readable YAML — the shape shown in the spec drawer.
 *  Not a general YAML emitter; tailored to the flow schema. */
export const flowSpecToYaml = (spec: FlowSpec): string => {
  const out: string[] = [];
  out.push(`justapiFlow: 1`);
  out.push(`name: ${q(spec.name)}`);

  if (spec.environment) {
    out.push(`environment:`);
    out.push(`  name: ${q(spec.environment.name)}`);
    const vars = spec.environment.variables ?? {};
    if (Object.keys(vars).length) {
      out.push(`  variables:`);
      for (const [k, v] of Object.entries(vars)) out.push(`    ${k}: ${q(v)}`);
    }
  }

  if (spec.defaults) {
    out.push(`defaults:`);
    if (spec.defaults.headers) {
      out.push(`  headers:`);
      for (const [k, v] of Object.entries(spec.defaults.headers)) {
        out.push(`    ${q(k)}: ${q(v)}`);
      }
    }
    if (spec.defaults.auth) {
      out.push(`  auth: ${authInline(spec.defaults.auth)}   # inherited`);
    }
  }

  out.push(`requests:`);
  for (const r of spec.requests) {
    out.push(`  - ${r.method.toLowerCase()}: ${q(r.url)}`);
    out.push(`    id: ${q(r.id)}`);
    if (r.name) out.push(`    name: ${q(r.name)}`);
    if (r.headers) {
      out.push(`    headers:`);
      for (const [k, v] of Object.entries(r.headers)) {
        out.push(`      ${q(k)}: ${q(v)}`);
      }
    }
    if (r.body) {
      out.push(`    body: { type: ${r.body.type}, content: ${q(r.body.content)} }`);
    }
    if (r.auth) out.push(`    auth: ${authInline(r.auth)}`);
    if (r.after) out.push(`    after: ${q(r.after)}`);
    if (r.bindings?.length) {
      const inner = r.bindings
        .map((b) => `${b.name}: ${b.path}${b.as === "header" ? " (header)" : ""}`)
        .join(", ");
      out.push(`    bind: { ${inner} }`);
    }
    if (r.asserts?.length) {
      const inner = r.asserts
        .map((a) =>
          a.op === "exists"
            ? a.path
            : `${a.path} ${a.op} ${a.value ?? ""}`.trim()
        )
        .join(", ");
      out.push(`    assert: [ ${inner} ]`);
    }
  }

  return out.join("\n");
};
