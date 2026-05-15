'use client';

import { useState } from "react";
import { Plus, Search, Inbox } from "lucide-react";
import {
  useCollectionsStore,
  CollectionItem,
} from "../../stores/use-collections-store";
import { useRequestStore } from "../../stores/use-request-store";
import { useDebuggerStore } from "../../stores/use-debugger-store";
import { useIsDirty } from "../../hooks/use-is-dirty";
import { CollectionItem as CollectionItemComponent } from "./collection-item";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export const CollectionsList = () => {
  const { items, activeCollectionId, setActiveCollectionId } =
    useCollectionsStore();

  const {
    reset,
    setMethod,
    setUrl,
    setParams,
    setHeaders,
    setBodyType,
    setBody,
    setAuthType,
    setAuthConfig,
  } = useRequestStore();

  const [searchQuery, setSearchQuery] = useState("");
  const hasUnsavedChanges = useIsDirty();

  const handleItemClick = (item: CollectionItem) => {
    if (hasUnsavedChanges && activeCollectionId !== item.id) {
      if (
        !confirm(
          "You have unsaved changes. Switch requests anyway?"
        )
      ) {
        return;
      }
    }
    useDebuggerStore.getState().setSelected(null);
    useDebuggerStore.getState().setReplayOriginal(null);
    setActiveCollectionId(item.id);
    setMethod(item.method);
    setUrl(item.url);
    setParams(item.params);
    setHeaders(item.headers);
    setBodyType(item.bodyType);
    setBody(item.body);
    setAuthType(item.authType);
    setAuthConfig(item.authConfig);
  };

  const handleCreateNewRequest = () => {
    if (hasUnsavedChanges) {
      if (
        !confirm("You have unsaved changes. Start a new request anyway?")
      ) {
        return;
      }
    }
    useDebuggerStore.getState().setSelected(null);
    useDebuggerStore.getState().setReplayOriginal(null);
    reset();
    setActiveCollectionId(null);
  };

  const query = searchQuery.toLowerCase();
  const filteredItems = query
    ? items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query) ||
          item.method.toLowerCase().includes(query)
      )
    : items;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2 border-b border-border">
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreateNewRequest}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New request
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <Input
            placeholder="Search saved requests…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Inbox className="w-10 h-10 text-muted mb-3" />
            <h3 className="text-sm font-medium text-primary mb-1">
              No saved requests
            </h3>
            <p className="text-xs text-secondary max-w-[200px]">
              Save a request to see it here
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Search className="w-10 h-10 text-muted mb-3" />
            <h3 className="text-sm font-medium text-primary mb-1">
              No results
            </h3>
            <p className="text-xs text-secondary max-w-[200px]">
              Try a different search
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredItems.map((item) => (
              <CollectionItemComponent
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
                isActive={activeCollectionId === item.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
