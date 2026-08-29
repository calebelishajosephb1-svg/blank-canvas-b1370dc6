import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blank White Canvas" },
      { name: "description", content: "A plain white canvas page with nothing on it." },
      { property: "og:title", content: "Blank White Canvas" },
      {
        property: "og:description",
        content: "A plain white canvas page with nothing on it.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <main className="min-h-screen bg-white" />;
}
