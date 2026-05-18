export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string | FormData;
  params?: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** Raw Set-Cookie header values. Only populated for proxied requests
   *  (browsers strip Set-Cookie from direct fetch responses). */
  cookies?: string[];
  data: unknown;
  time: number;
  size: number;
}

const isLoopback = (url: string): boolean => {
  try {
    const h = new URL(url).hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "[::1]" ||
      h === "::1" ||
      h.endsWith(".localhost")
    );
  } catch {
    return false;
  }
};

const buildUrl = (
  base: string,
  params?: Record<string, string>
): string => {
  if (!params || Object.keys(params).length === 0) return base;
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) sp.append(k, v);
  });
  const qs = sp.toString();
  if (!qs) return base;
  return base + (base.includes("?") ? "&" : "?") + qs;
};

const buildHeaders = (
  raw: Record<string, string>
): Record<string, string> => {
  const out: Record<string, string> = {};
  Object.entries(raw).forEach(([k, v]) => {
    if (v) out[k] = v;
  });
  return out;
};

const sendDirect = async (
  config: RequestConfig,
  headers: Record<string, string>
): Promise<HttpResponse> => {
  const startTime = Date.now();
  const targetUrl = buildUrl(config.url, config.params);

  const isFormData = config.body instanceof FormData;
  // Let the browser set the multipart boundary for FormData.
  const sendHeaders = { ...headers };
  if (isFormData) {
    Object.keys(sendHeaders).forEach((k) => {
      if (k.toLowerCase() === "content-type") delete sendHeaders[k];
    });
  }

  const init: RequestInit = {
    method: config.method,
    headers: sendHeaders,
  };
  if (config.body && config.method !== "GET" && config.method !== "HEAD") {
    init.body = config.body;
  }

  try {
    const res = await fetch(targetUrl, init);
    const time = Date.now() - startTime;

    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const contentType = res.headers.get("content-type") || "";
    let data: unknown;
    let size = 0;

    if (contentType.includes("application/json")) {
      const text = await res.text();
      size = new Blob([text]).size;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } else if (contentType.includes("text/") || contentType === "") {
      const text = await res.text();
      data = text;
      size = new Blob([text]).size;
    } else {
      const blob = await res.blob();
      const buf = await blob.arrayBuffer();
      data = buf;
      size = buf.byteLength;
    }

    return {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      data,
      time,
      size,
    };
  } catch (error) {
    const time = Date.now() - startTime;
    const message =
      error instanceof Error ? error.message : "Network Error";
    return {
      status: 0,
      statusText: message,
      headers: {},
      data: {
        error: message,
        hint: "Direct request to localhost failed. Is the server running and CORS allowed for this origin?",
      },
      time,
      size: 0,
    };
  }
};

const sendViaMultipartProxy = async (
  config: RequestConfig,
  headers: Record<string, string>
): Promise<HttpResponse> => {
  const targetUrl = buildUrl(config.url, config.params);
  try {
    const response = await fetch("/api/proxy/multipart", {
      method: "POST",
      headers: {
        "X-QR-Target-URL": targetUrl,
        "X-QR-Target-Method": config.method,
        "X-QR-Target-Headers": JSON.stringify(headers),
      },
      body: config.body as FormData,
    });
    return (await response.json()) as HttpResponse;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network Error";
    return {
      status: 0,
      statusText: message,
      headers: {},
      data: { error: message },
      time: 0,
      size: 0,
    };
  }
};

const sendViaProxy = async (
  config: RequestConfig,
  headers: Record<string, string>
): Promise<HttpResponse> => {
  if (config.body instanceof FormData) {
    return sendViaMultipartProxy(config, headers);
  }

  const proxyPayload: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    params?: Record<string, string>;
  } = {
    url: config.url,
    method: config.method,
    headers,
    params: config.params,
  };

  if (typeof config.body === "string") {
    proxyPayload.body = config.body;
  }

  try {
    const response = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proxyPayload),
    });

    // The proxy encodes failures into its JSON body (with the real error
    // message in statusText), so read the body regardless of HTTP status.
    const result = (await response.json()) as HttpResponse;
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network Error";
    return {
      status: 0,
      statusText: message,
      headers: {},
      data: { error: message },
      time: 0,
      size: 0,
    };
  }
};

export const sendRequest = async (
  config: RequestConfig
): Promise<HttpResponse> => {
  const headers = buildHeaders(config.headers);
  if (isLoopback(config.url)) {
    const direct = await sendDirect(config, headers);
    // status 0 = network/CORS failure. Fall back to the server-side proxy,
    // which can still reach localhost from the same machine.
    if (direct.status !== 0) return direct;
    return sendViaProxy(config, headers);
  }
  return sendViaProxy(config, headers);
};
