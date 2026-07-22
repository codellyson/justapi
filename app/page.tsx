import type { Metadata } from "next";
import { CanvasClient } from "@/src/canvas/components/canvas-client";

export const metadata: Metadata = {
  title: "JustAPI — node-based API explorer",
  description:
    "Drop requests on a canvas, chain response values into the next request, and run whole flows. Import cURL, fetch, HAR, or OpenAPI.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "JustAPI — node-based API explorer",
    description:
      "Drop requests on a canvas, chain response values into the next request, and run whole flows.",
    url: "/",
  },
};

export default function HomePage() {
  return <CanvasClient />;
}
