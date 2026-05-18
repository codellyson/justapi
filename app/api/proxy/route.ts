import { NextRequest, NextResponse } from "next/server";

// Node's fetch (undici) resolves `localhost` to ::1 first on many systems,
// but most dev servers only listen on 127.0.0.1 — yielding ECONNREFUSED.
// Rewrite the URL to 127.0.0.1 and pin the original Host header so vhost
// routing still works.
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
    // fall through to return the raw url
  }
  return { url: rawUrl, host: null };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      url,
      method,
      headers,
      body: requestBody,
      params,
      isFormData,
    } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let targetUrl = url;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        targetUrl += (targetUrl.includes("?") ? "&" : "?") + queryString;
      }
    }

    const { url: resolvedUrl, host: originalHost } =
      normalizeLocalhost(targetUrl);

    const requestHeaders: Record<string, string> = {};
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        if (value) {
          requestHeaders[key] = String(value);
        }
      });
    }
    if (originalHost && !requestHeaders["host"] && !requestHeaders["Host"]) {
      requestHeaders["Host"] = originalHost;
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: requestHeaders,
    };

    if (requestBody && method !== "GET" && method !== "HEAD") {
      if (typeof requestBody === "string") {
        fetchOptions.body = requestBody;
      } else {
        fetchOptions.body = JSON.stringify(requestBody);
      }
    }

    if (isFormData && method !== "GET" && method !== "HEAD") {
      delete requestHeaders["Content-Type"];
      fetchOptions.body = undefined;
    }

    const response = await fetch(resolvedUrl, fetchOptions);
    const time = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    // getSetCookie() preserves each Set-Cookie line separately; forEach folds
    // them with commas, which is ambiguous when cookies contain Expires dates.
    const cookies =
      typeof (response.headers as Headers & { getSetCookie?: () => string[] })
        .getSetCookie === 'function'
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
    // Return 200 with the failure encoded in the body so the client can
    // surface the real cause instead of a generic 500.
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
