'use client';

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRequestStore } from "../../stores/use-request-store";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { extractVariables } from "../../utils/variables";
import { cn } from "../../utils/cn";

export const URLInput = () => {
  const { url, setUrl } = useRequestStore();
  const { getVariables } = useEnvironmentStore();
  const variables = getVariables();
  const extractedVars = extractVariables(url);
  const inputRef = useRef<HTMLInputElement>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFilter, setSuggestionFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const availableVars = Object.keys(variables).filter((key) =>
    key.toLowerCase().includes(suggestionFilter.toLowerCase())
  );

  const handleInputChange = (value: string) => {
    setUrl(value);

    const cursor = inputRef.current?.selectionStart ?? 0;
    const textBeforeCursor = value.substring(0, cursor);
    const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");

    if (lastOpenBrace !== -1) {
      const textAfterBrace = textBeforeCursor.substring(lastOpenBrace + 2);
      if (!textAfterBrace.includes("}}")) {
        setShowSuggestions(true);
        setSuggestionFilter(textAfterBrace);
        setSelectedIndex(0);
        return;
      }
    }

    setShowSuggestions(false);
  };

  const insertVariable = (varName: string) => {
    const input = inputRef.current;
    if (!input) return;

    const cursor = input.selectionStart ?? url.length;
    const textBeforeCursor = url.substring(0, cursor);
    const textAfterCursor = url.substring(cursor);
    const lastOpenBrace = textBeforeCursor.lastIndexOf("{{");
    if (lastOpenBrace === -1) return;

    const beforeBrace = url.substring(0, lastOpenBrace);
    const newUrl = `${beforeBrace}{{${varName}}}${textAfterCursor}`;
    setUrl(newUrl);
    setShowSuggestions(false);

    setTimeout(() => {
      const newPosition = lastOpenBrace + varName.length + 4;
      input.focus();
      input.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || availableVars.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % availableVars.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + availableVars.length) % availableVars.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (availableVars[selectedIndex]) {
        insertVariable(availableVars[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex-1 relative">
      <input
        ref={inputRef}
        value={url}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://api.example.com/users"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        // Discourage Chrome's password-manager / form-fill heuristics.
        name="justapi-url"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        className={cn(
          "w-full px-3 py-1.5 text-sm border border-border rounded-md",
          "bg-bg text-primary placeholder:text-muted",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          "transition-colors font-mono pr-4"
        )}
      />

      {showSuggestions && availableVars.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-bg border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {availableVars.map((varName, index) => (
            <button
              key={varName}
              onClick={() => insertVariable(varName)}
              className={cn(
                "w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary transition-colors",
                index === selectedIndex && "bg-bg-secondary"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-primary">{varName}</span>
                <span className="text-xs text-muted truncate ml-2 max-w-[200px] font-mono">
                  {variables[varName]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {extractedVars.length > 0 && !showSuggestions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {extractedVars.map((varName) => (
            <span
              key={varName}
              className={cn(
                "px-1.5 py-0.5 text-xs rounded font-mono",
                variables[varName]
                  ? "bg-bg-secondary text-secondary"
                  : "bg-bg-secondary text-muted"
              )}
              title={
                variables[varName]
                  ? `Value: ${variables[varName]}`
                  : "Variable not set"
              }
            >
              {`{{${varName}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
