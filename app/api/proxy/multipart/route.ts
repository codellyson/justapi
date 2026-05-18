import { NextRequest, NextResponse } from "next/server";

// Mirrors the IPv6-localhost workaround in the JSON proxy.
function normalizeLocalhost(rawUrl: string): {
  url: string;
  host: string | null;
} {
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "localhost") {
      const host = u.host;
      u.hostname = "127.0.0.1";
      return { url: u.toString(), host };
    }
  } catch {
    // fall through
  }
  return { url: rawUrl, host: null };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const targetUrl = request.headers.get("x-qr-target-url");
    const targetMethod =
      request.headers.get("x-qr-target-method") || "POST";
    const headersRaw = request.headers.get("x-qr-target-headers");

    if (!targetUrl) {
      return NextResponse.json(
        { error: "Missing X-QR-Target-URL header" },
        { status: 400 }
      );
    }

    let targetHeaders: Record<string, string> = {};
    if (headersRaw) {
      try {
        targetHeaders = JSON.parse(headersRaw);
      } catch {
        // ignore malformed header bag
      }
    }

    const { url: resolvedUrl, host: originalHost } =
      normalizeLocalhost(targetUrl);
    if (originalHost && !targetHeaders["host"] && !targetHeaders["Host"]) {
      targetHeaders["Host"] = originalHost;
    }
    // Drop any Content-Type — fetch will set it with the right boundary.
    delete targetHeaders["Content-Type"];
    delete targetHeaders["content-type"];

    // Reconstruct the FormData so undici sets a fresh boundary.
    const incoming = await request.formData();
    const forward = new FormData();
    incoming.forEach((value, key) => {
      forward.append(key, value);
    });

    const response = await fetch(resolvedUrl, {
      method: targetMethod,
      headers: targetHeaders,
      body: forward,
    });
    const time = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const cookies =
      typeof (response.headers as Headers & { getSetCookie?: () => string[] })
        .getSetCookie === "function"
        ? (response.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
        : [];

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;
    if (contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    } else if (contentType.includes("text/")) {
      data = await response.text();
    } else {
      const blob = await response.blob();
      data = await blob.arrayBuffer();
    }

    const size =
      typeof data === "string"
        ? new Blob([data]).size
        : JSON.stringify(data).length;

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      cookies,
      data,
      time,
      size,
    });
  } catch (error) {
    const time = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "Network Error";
    return NextResponse.json({
      status: 0,
      statusText: message,
      headers: {},
      data: { error: message },
      time,
      size: 0,
    });
  }
}

// Multipart uploads can be larger than the default 1MB request limit.
export const runtime = "nodejs";
