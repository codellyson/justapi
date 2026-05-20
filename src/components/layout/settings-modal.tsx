'use client';

import { useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useEnvironmentStore } from "../../stores/use-environment-store";
import { useCollectionsStore } from "../../stores/use-collections-store";
import { useHistoryStore } from "../../stores/use-history-store";
import { Trash2, Plus, X } from "lucide-react";
import { cn } from "../../utils/cn";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = "environments" | "data";

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("environments");
  const { environments, updateEnvironment, deleteEnvironment, addEnvironment } =
    useEnvironmentStore();
  const { clearAll: clearCollections } = useCollectionsStore();
  const { clearAll: clearHistory } = useHistoryStore();

  const [newEnvName, setNewEnvName] = useState("");
  const [editingEnv, setEditingEnv] = useState<string | null>(null);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");

  const handleAddEnvironment = () => {
    if (!newEnvName.trim()) return;
    addEnvironment({
      name: newEnvName,
      variables: {},
    });
    setNewEnvName("");
  };

  const handleAddVariable = (envId: string) => {
    if (!newVarKey.trim() || !newVarValue.trim()) return;
    const env = environments.find((e) => e.id === envId);
    if (!env) return;

    updateEnvironment(envId, {
      variables: {
        ...env.variables,
        [newVarKey]: newVarValue,
      },
    });
    setNewVarKey("");
    setNewVarValue("");
  };

  const handleRemoveVariable = (envId: string, key: string) => {
    const env = environments.find((e) => e.id === envId);
    if (!env) return;

    const newVariables = { ...env.variables };
    delete newVariables[key];
    updateEnvironment(envId, { variables: newVariables });
  };

  const tabs = [
    { id: "environments" as const, label: "Environments" },
    { id: "data" as const, label: "Data" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" size="md">
      <div className="flex flex-col h-[400px]">
        <div className="flex border-b border-border mb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-accent text-primary"
                  : "border-transparent text-secondary hover:text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === "environments" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="New environment name"
                  value={newEnvName}
                  onChange={(e) => setNewEnvName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddEnvironment();
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddEnvironment}
                  disabled={!newEnvName.trim()}
                  className="shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className="border border-border rounded-md p-2.5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-primary">
                        {env.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEnvironment(env.id)}
                        className="w-7 h-7 p-0 text-danger hover:bg-danger/10"
                        disabled={environments.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {Object.entries(env.variables).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="text-secondary font-mono text-xs">
                            {key}:
                          </span>
                          <span className="text-primary font-mono flex-1 truncate text-xs">
                            {value}
                          </span>
                          <button
                            onClick={() => handleRemoveVariable(env.id, key)}
                            className="text-muted hover:text-danger"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {editingEnv === env.id ? (
                        <div className="flex gap-1.5 pt-1.5">
                          <Input
                            placeholder="Key"
                            value={newVarKey}
                            onChange={(e) => setNewVarKey(e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Value"
                            value={newVarValue}
                            onChange={(e) => setNewVarValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleAddVariable(env.id);
                                setEditingEnv(null);
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              handleAddVariable(env.id);
                              setEditingEnv(null);
                            }}
                            disabled={!newVarKey.trim() || !newVarValue.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEnv(env.id)}
                          className="w-full mt-1.5 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add variable
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-2.5">
              <div className="border border-border rounded-md p-3">
                <h3 className="text-sm font-medium text-primary mb-1.5">
                  Clear Collections
                </h3>
                <p className="text-xs text-secondary mb-2">
                  Remove all saved requests from your collections.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to clear all collections? This cannot be undone."
                      )
                    ) {
                      clearCollections();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear all collections
                </Button>
              </div>

              <div className="border border-border rounded-md p-3">
                <h3 className="text-sm font-medium text-primary mb-1.5">
                  Clear history
                </h3>
                <p className="text-xs text-secondary mb-2">
                  Remove all items from your request history.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        "Are you sure you want to clear history? This cannot be undone."
                      )
                    ) {
                      clearHistory();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Clear history
                </Button>
              </div>

              <div className="border border-border rounded-md p-3">
                <h3 className="text-sm font-medium text-primary mb-1.5">
                  About
                </h3>
                <p className="text-xs text-secondary">
                  JustAPI — a simple REST API client
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Version 1.0.0
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

