import { createFileRoute } from "@tanstack/react-router";
import { appHead } from "@/components/app/AppShell";
import { LessonKindPage } from "@/components/app/LessonKindPage";

export const Route = createFileRoute("/app/lecons-pdf")({
  head: appHead("Supports PDF", "Tous les supports PDF de ta formation AIFAC."),
  component: () => <LessonKindPage kind="pdf" />,
});
