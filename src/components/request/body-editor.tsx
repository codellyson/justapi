'use client';

import { useRequestStore } from "../../stores/use-request-store";
import { CodeEditor } from "../ui/code-editor";
import { FormDataEditor } from "./form-data-editor";
import { hasEnabledFile } from "../../utils/form-data";
import { cn } from "../../utils/cn";

export const BodyEditor = () => {
  const { bodyType, body, formData, setBodyType, setBody, setFormData } =
    useRequestStore();

  return (
    <div className="space-y-3">
      <div className="inline-flex p-0.5 bg-bg-secondary rounded-md">
        {(["none", "json", "raw", "form-data"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setBodyType(type)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors",
              bodyType === type
                ? "bg-bg text-primary shadow-sm"
                : "text-secondary hover:text-primary"
            )}
          >
            {type === "form-data" ? "Form data" : type === "none" ? "None" : type.toUpperCase()}
          </button>
        ))}
      </div>
      {bodyType !== "none" && (
        <div>
          {bodyType === "json" || bodyType === "raw" ? (
            <CodeEditor
              value={body}
              onChange={(value) => setBody(value || "")}
              language={bodyType === "json" ? "json" : "text"}
              height="calc(100vh - 200px)"
            />
          ) : (
            <div className="space-y-2">
              <FormDataEditor items={formData} onChange={setFormData} />
              <p className="text-[11px] text-muted">
                {hasEnabledFile(formData) ? (
                  <>Sent as <code className="font-mono">multipart/form-data</code> (one or more file rows).</>
                ) : (
                  <>Sent as <code className="font-mono">application/x-www-form-urlencoded</code>. Switch a row to &quot;File&quot; to upgrade to multipart.</>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
