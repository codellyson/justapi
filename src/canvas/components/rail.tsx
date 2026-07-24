"use client";

import { useReactFlow } from "@xyflow/react";
import {
  Plus,
  Import,
  Bookmark,
  Boxes,
  Layers,
  CodeXml,
  HelpCircle,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useCanvasStore } from "../use-canvas-store";

interface RailProps {
  libraryOpen: boolean;
  onToggleLibrary: () => void;
  onOpenImport: () => void;
  specOpen: boolean;
  onToggleSpec: () => void;
  canvasesOpen: boolean;
  onToggleCanvases: () => void;
  snippetsOpen: boolean;
  onToggleSnippets: () => void;
  themeOpen: boolean;
  onToggleTheme: () => void;
  onStartTour: () => void;
}

const railBtn =
  "relative flex items-center justify-center w-8 h-8 rounded-md text-secondary hover:text-primary hover:bg-bg/70 transition-colors";

/**
 * The instrument rail: brand mark up top, node actions below it, and the
 * panels + settings docked at the bottom. Panels (collections, canvases)
 * open as docked side panes, not floating popovers, so they scale.
 */
export const Rail = ({
  libraryOpen,
  onToggleLibrary,
  onOpenImport,
  specOpen,
  onToggleSpec,
  canvasesOpen,
  onToggleCanvases,
  snippetsOpen,
  onToggleSnippets,
  themeOpen,
  onToggleTheme,
  onStartTour,
}: RailProps) => {
  const { screenToFlowPosition } = useReactFlow();
  const addRequestNode = useCanvasStore((s) => s.addRequestNode);

  const centerPosition = () =>
    screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

  return (
    <div className="z-30 flex w-12 flex-none flex-col items-center gap-1 border-r border-border/50 bg-bg-secondary py-2.5">
      {/* brand mark */}
      <div
        className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-mono text-[13px] font-bold text-accent-text shadow-sm select-none"
        title="JustAPI"
      >
        {"{}"}
      </div>

      <button
        type="button"
        onClick={() => addRequestNode(centerPosition())}
        className={railBtn}
        title="New request node"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onOpenImport}
        className={railBtn}
        title="Import cURL / fetch / HAR / OpenAPI"
      >
        <Import className="h-4 w-4" />
      </button>

      <div className="my-1.5 h-px w-6 bg-border/60" />

      <button
        type="button"
        onClick={onToggleLibrary}
        className={cn(railBtn, libraryOpen && "text-accent bg-accent/10")}
        title="Collections — flows on this canvas"
      >
        <Boxes className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleCanvases}
        className={cn(railBtn, canvasesOpen && "text-accent bg-accent/10")}
        title="Canvases"
      >
        <Layers className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleSnippets}
        className={cn(railBtn, snippetsOpen && "text-accent bg-accent/10")}
        title="Snippets — reusable saved requests"
      >
        <Bookmark className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleSpec}
        className={cn(railBtn, specOpen && "text-accent bg-accent/10")}
        title="Flow spec — this board as the document agents read & write"
      >
        <CodeXml className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onStartTour}
        className={railBtn}
        title="Take the tour"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onToggleTheme}
        className={cn(railBtn, themeOpen && "text-accent bg-accent/10")}
        title="Appearance"
      >
        <span className="text-[15px] leading-none">◑</span>
      </button>
    </div>
  );
};
