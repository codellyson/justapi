"use client";

import { useState } from "react";
import type { Card } from "../types";
import { Tabs } from "../../components/ui/tabs";
import { SkeletonBody } from "./skeleton-body";
import { ResultBody } from "./result-body";
import { ResultHeaders } from "./result-headers";
import { ResultRequest } from "./result-request";

type TabId = "body" | "headers" | "request";

interface ResultTabsProps {
  card: Card;
}

export const ResultTabs = ({ card }: ResultTabsProps) => {
  const [active, setActive] = useState<TabId>("body");
  const r = card.response;
  const headerCount = r ? Object.keys(r.headers).length : 0;
  const sentHeaderCount = Object.keys(card.request.headers).length;

  if (card.pending) {
    return <SkeletonBody />;
  }

  if (!r) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm font-mono">
        {card.error ?? "No response."}
      </div>
    );
  }

  const items: { id: TabId; label: string; badge?: number | string }[] = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers", badge: headerCount },
    { id: "request", label: "Request", badge: sentHeaderCount },
  ];

  return (
    <div className="h-full flex flex-col">
      <Tabs<TabId>
        size="sm"
        active={active}
        onChange={setActive}
        items={items}
      />
      <div className="flex-1 min-h-0">
        {active === "body" && <ResultBody response={r} />}
        {active === "headers" && <ResultHeaders response={r} />}
        {active === "request" && <ResultRequest card={card} />}
      </div>
    </div>
  );
};
