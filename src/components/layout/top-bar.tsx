'use client';

import { Send, Save, Edit, AlertCircle, Share2, Check, Menu, Code2, X, Loader2 } from "lucide-react";
import { useRequestStore } from "../../stores/use-request-store";
import { useRequest } from "../../hooks/use-request";
import { useResponseStore } from "../../stores/use-response-store";
import { MethodSelector } from "../request/method-selector";
import { URLInput } from "../request/url-input";
import { EnvironmentChip } from "../environment/environment-chip";
import { Button } from "../ui/button";
import { useCollectionsStore } from "../../stores/use-collections-store";
import { useState, useMemo } from "react";
import { Modal } from "../ui/modal";
import { Input } from "../ui/input";
import { cn } from "../../utils/cn";
import { generateShareableLink } from "../../utils/sharing";
import { useToastStore } from "../../stores/use-toast-store";
import { useIsDirty } from "../../hooks/use-is-dirty";
import { SnippetModal } from "../request/snippet-modal";

interface TopBarProps {
  onOpenSidebar: () => void;
}

export const TopBar = ({ onOpenSidebar }: TopBarProps) => {
  const { send, cancel } = useRequest();
  const { loading } = useResponseStore();
  const { showToast } = useToastStore();
  const {
    method,
    url,
    params,
    headers,
    bodyType,
    body,
    authType,
    authConfig,
    setMethod,
  } = useRequestStore();
  const { addItem, updateItem, items, activeCollectionId } =
    useCollectionsStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAsNew, setSaveAsNew] = useState(false);
  const [requestName, setRequestName] = useState(
    useRequestStore.getState().url
  );
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [snippetOpen, setSnippetOpen] = useState(false);

  const activeCollection = items.find((item) => item.id === activeCollectionId);
  const hasUnsavedChanges = useIsDirty();

  const hasDuplicate = useMemo(() => {
    if (!showSaveModal || !url.trim()) return false;
    return items.some(
      (item) =>
        item.id !== activeCollectionId &&
        item.method === method &&
        item.url === url
    );
  }, [items, activeCollectionId, method, url, showSaveModal]);

  const handleSave = () => {
    if (!requestName.trim()) return;

    if (activeCollectionId && activeCollection && !saveAsNew) {
      updateItem(activeCollectionId, {
        name: requestName,
        method,
        url,
        params,
        headers,
        bodyType,
        body,
        authType,
        authConfig: authConfig as Record<string, string>,
      });
    } else {
      addItem({
        name: requestName,
        method,
        url,
        params,
        headers,
        bodyType,
        body,
        authType,
        authConfig: authConfig as Record<string, string>,
      });
    }

    setShowSaveModal(false);
    setRequestName("");
    setSaveAsNew(false);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const shareLink = await generateShareableLink();
      await navigator.clipboard.writeText(shareLink);
      setShareLinkCopied(true);
      showToast("success", "Share link copied!");
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to create share link:", error);
      showToast("error", "Failed to copy share link");
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col border-b border-border bg-bg">
        <div className="px-4 py-1.5 border-b border-border flex items-center justify-between gap-3 text-xs min-h-[28px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {activeCollection ? (
              <>
                {hasUnsavedChanges ? (
                  <AlertCircle className="w-3 h-3 text-warning shrink-0" />
                ) : (
                  <Edit className="w-3 h-3 text-muted shrink-0" />
                )}
                <span className={cn("font-medium shrink-0", hasUnsavedChanges ? "text-warning" : "text-muted")}>
                  {hasUnsavedChanges ? "Unsaved changes" : "Editing"}
                </span>
                <span className="text-muted shrink-0">·</span>
                <span className="text-primary truncate">{activeCollection.name}</span>
              </>
            ) : (
              <span className="text-muted">New request</span>
            )}
          </div>
          <EnvironmentChip />
        </div>
        <div className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSidebar}
              className="w-9 h-9 p-0 lg:hidden shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <MethodSelector value={method} onChange={setMethod} />
            <URLInput />
            {loading ? (
              <Button
                variant="danger"
                size="sm"
                onClick={cancel}
                title="Cancel request"
                className="shrink-0 px-3.5"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={send}
                disabled={!url.trim()}
                title="Send request (⌘/Ctrl+Enter)"
                className="shrink-0 px-3.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            )}
          </div>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant={
                hasUnsavedChanges && activeCollection ? "primary" : "secondary"
              }
              size="sm"
              onClick={() => {
                setRequestName(activeCollection?.name || url);
                setSaveAsNew(false);
                setShowSaveModal(true);
              }}
              className={cn(
                "w-9 h-9 p-0",
                hasUnsavedChanges && activeCollection && "animate-pulse"
              )}
              title={activeCollection ? "Update request" : "Save request"}
              aria-label={activeCollection ? "Update request" : "Save request"}
            >
              <Save className="w-4 h-4" />
              {hasUnsavedChanges && activeCollection && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </Button>
            {activeCollection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRequestName(`${activeCollection.name} (Copy)`);
                  setSaveAsNew(true);
                  setShowSaveModal(true);
                }}
                title="Save as a new request"
                className="px-2 text-xs"
              >
                Save As
              </Button>
            )}
            <span className="w-px h-5 bg-border mx-1" aria-hidden="true" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSnippetOpen(true)}
              title="Generate code snippet"
              disabled={!url.trim()}
              className="w-9 h-9 p-0"
              aria-label="Generate code snippet"
            >
              <Code2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              title="Share this request configuration"
              className="w-9 h-9 p-0 relative"
              aria-label="Share request"
            >
              {sharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : shareLinkCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <SnippetModal isOpen={snippetOpen} onClose={() => setSnippetOpen(false)} />
      <Modal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false);
          setSaveAsNew(false);
        }}
        title={
          activeCollection && !saveAsNew ? "Update Request" : "Save Request"
        }
        size="sm"
      >
        <div className="space-y-3">
          {activeCollection && !saveAsNew && (
            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              Updating:{" "}
              <span className="font-medium">{activeCollection.name}</span>
            </div>
          )}
          {hasDuplicate && !activeCollection && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>A request with this method and URL already exists</span>
            </div>
          )}
          <Input
            label="Request Name"
            value={requestName}
            onChange={(e) => setRequestName(e.target.value)}
            placeholder="My API Request"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSaveModal(false);
                setSaveAsNew(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!requestName.trim()}
            >
              {activeCollection && !saveAsNew ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
