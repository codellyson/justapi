/**
 * Tiny line-level diff via LCS. O(m*n) time and space — fine for bodies
 * under a few thousand lines. For larger payloads, callers should fall
 * back to a side-by-side view.
 */

export type DiffLine = { type: 'same' | 'add' | 'del'; line: string };

export function lineDiff(a: string, b: string): DiffLine[] {
  const A = a.split('\n');
  const B = b.split('\n');
  const m = A.length;
  const n = B.length;

  // Length table.
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (A[i - 1] === B[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack.
  const out: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      out.push({ type: 'same', line: A[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      out.push({ type: 'add', line: B[j - 1] });
      j--;
    } else {
      out.push({ type: 'del', line: A[i - 1] });
      i--;
    }
  }
  return out.reverse();
}

const MAX_DIFF_LINES = 4000;

export function shouldDiff(a: string, b: string): boolean {
  const aLines = a.length === 0 ? 0 : a.split('\n').length;
  const bLines = b.length === 0 ? 0 : b.split('\n').length;
  return aLines + bLines <= MAX_DIFF_LINES;
}

/** Pretty-print JSON if possible, otherwise return the input unchanged. */
export function pretty(body: string, mimeType: string): string {
  if (!body) return '';
  if (mimeType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}
