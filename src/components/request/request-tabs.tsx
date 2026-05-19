'use client';

import { useState } from "react";
import { cn } from "../../utils/cn";
import { useRequestStore } from "../../stores/use-request-store";
import { Tabs, type TabItem } from "../ui/tabs";
import { ParamsEditor } from "./params-editor";
import { HeadersEditor } from "./headers-editor";
import { BodyEditor } from "./body-editor";
import { AuthConfig } from "./auth-config";

type Tab = "params" | "headers" | "body" | "auth";

interface RequestTabsProps {
  className?: string;
}

export const RequestTabs = ({ className }: RequestTabsProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("params");
  const { params, headers, bodyType, body, formData, authType } =
    useRequestStore();

  const paramCount = params.filter((p) => p.enabled && p.key).length;
  const headerCount = headers.filter((h) => h.enabled && h.key).length;
  const hasBody =
    (bodyType === "json" || bodyType === "raw") && !!body.trim()
      ? 1
      : bodyType === "form-data" &&
        formData.some((f) => f.enabled && f.key)
      ? formData.filter((f) => f.enabled && f.key).length
      : 0;
  const authActive = authType !== "none" ? 1 : 0;

  const tabs: TabItem<Tab>[] = [
    { id: "params", label: "Params", badge: paramCount || undefined },
    { id: "headers", label: "Headers", badge: headerCount || undefined },
    { id: "body", label: "Body", badge: hasBody || undefined },
    { id: "auth", label: "Auth", badge: authActive ? "•" : undefined },
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      <Tabs items={tabs} active={activeTab} onChange={setActiveTab} />
      <div className="flex-1 px-3 py-3 overflow-auto">
        {activeTab === "params" && <ParamsEditor />}
        {activeTab === "headers" && <HeadersEditor />}
        {activeTab === "body" && <BodyEditor />}
        {activeTab === "auth" && <AuthConfig />}
      </div>
    </div>
  );
};
