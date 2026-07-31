import type { Metadata } from "next";
import { CanvasClient } from "@/src/canvas/components/canvas-client";

export const metadata: Metadata = {
  title: "Canvas",
  description:
    "Drop requests on a canvas, chain response values into the next request, and run whole flows.",
  alternates: { canonical: "/app" },
};

export default function CanvasPage() {
  return <CanvasClient />;
}
