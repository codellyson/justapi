import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HttpMethod } from "../utils/http";
import type { AuthType, BodyType } from "../stores/use-request-store";
import type { AuthConfig } from "./use-draft-store";

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  method: HttpMethod;
  url: string;
  body: string;
  bodyType: BodyType;
  authType: AuthType;
  authConfig: AuthConfig;
  headers: Record<string, string>;
}

interface TemplatesState {
  templates: Template[];
  save: (t: Omit<Template, "id" | "createdAt">) => string;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
}

const id = () =>
  `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set) => ({
      templates: [],
      save: (t) => {
        const tid = id();
        set((s) => ({
          templates: [
            { ...t, id: tid, createdAt: Date.now() },
            ...s.templates,
          ],
        }));
        return tid;
      },
      remove: (id) =>
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      rename: (id, name) =>
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        })),
    }),
    {
      name: "justapi-v1-templates",
      version: 1,
    }
  )
);
