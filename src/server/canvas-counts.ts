export interface CanvasCounts {
  requestCount: number;
  collectionCount: number;
  assertCount: number;
}

/**
 * Derive node counts from a canvas `data` blob (the client's persisted
 * `{nodes, edges, viewport}`). Tolerant of malformed input — a bad blob counts
 * as empty rather than throwing in a request handler.
 */
export function countsFromData(data: string): CanvasCounts {
  const counts: CanvasCounts = {
    requestCount: 0,
    collectionCount: 0,
    assertCount: 0,
  };
  try {
    const parsed = JSON.parse(data) as { nodes?: { type?: string }[] };
    for (const n of parsed.nodes ?? []) {
      if (n.type === "request") counts.requestCount++;
      else if (n.type === "collection") counts.collectionCount++;
      else if (n.type === "assert") counts.assertCount++;
    }
  } catch {
    /* malformed — treat as empty */
  }
  return counts;
}
