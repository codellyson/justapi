import { useCallback } from "react";
import { useRequestStore } from "../stores/use-request-store";
import { useResponseStore } from "../stores/use-response-store";
import { useHistoryStore } from "../stores/use-history-store";
import { useEnvironmentStore } from "../stores/use-environment-store";
import { sendRequest, RequestConfig } from "../utils/http";
import { replaceDynamicVariables, replaceVariables } from "../utils/variables";
import { buildMultipart, buildUrlEncoded, hasEnabledFile } from "../utils/form-data";

export const useRequest = () => {
  const request = useRequestStore();
  const { setResponse, setLoading, setError } = useResponseStore();
  const { addItem: addHistoryItem } = useHistoryStore();
  const { getVariables } = useEnvironmentStore();

  const send = useCallback(async () => {
    if (!request.url.trim()) {
      setError("URL is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const variables = getVariables();
      let url: string = replaceVariables(request.url, variables);
      url = replaceDynamicVariables(url, request.params);
      
      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        url = url.substring(0, queryIndex);
      }
      
      console.log("url", url);

      const enabledParams = request.params.filter((p) => p.enabled);
      const params: Record<string, string> = {};
      enabledParams.forEach((p) => {
        if (p.key) {
          params[p.key] = replaceVariables(p.value, variables);
        }
      });

      const enabledHeaders = request.headers.filter((h) => h.enabled);
      const headers: Record<string, string> = {};
      enabledHeaders.forEach((h) => {
        if (h.key) {
          headers[h.key] = replaceVariables(h.value, variables);
        }
      });

      if (request.authType === "bearer" && request.authConfig.bearerToken) {
        headers["Authorization"] = `Bearer ${request.authConfig.bearerToken}`;
      } else if (request.authType === "basic" && request.authConfig.username) {
        const credentials = btoa(
          `${request.authConfig.username}:${request.authConfig.password || ""}`
        );
        headers["Authorization"] = `Basic ${credentials}`;
      } else if (
        request.authType === "api-key" &&
        request.authConfig.apiKey &&
        request.authConfig.apiKeyHeader
      ) {
        headers[request.authConfig.apiKeyHeader] = request.authConfig.apiKey;
      }

      let body: string | FormData | undefined;
      if (request.bodyType === "json" && request.body) {
        try {
          JSON.parse(request.body);
          body = request.body;
        } catch {
          setError("Invalid JSON in body");
          setLoading(false);
          return;
        }
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      } else if (request.bodyType === "raw" && request.body) {
        body = request.body;
      } else if (request.bodyType === "form-data") {
        const resolve = (text: string) => replaceVariables(text, variables);
        if (hasEnabledFile(request.formData)) {
          body = buildMultipart(request.formData, resolve);
          // Let the runtime pick the multipart boundary; don't pin Content-Type.
          delete headers["Content-Type"];
        } else {
          body = buildUrlEncoded(request.formData, resolve);
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
      }

      const config: RequestConfig = {
        method: request.method,
        url,
        headers,
        params,
        body,
      };

      const response = await sendRequest(config);
      setResponse(response);
      addHistoryItem({
        method: request.method,
        url,
        status: response.status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Request failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    request,
    getVariables,
    setResponse,
    setLoading,
    setError,
    addHistoryItem,
  ]);

  return { send };
};
