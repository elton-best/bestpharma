import { createFileRoute } from "@tanstack/react-router";
import { appHead } from "@/components/app/AppShell";
import { LessonKindPage } from "@/components/app/LessonKindPage";

export const Route = createFileRoute("/app/lecons-mixtes")({
  head: appHead("Leçons enrichies", "Leçons avec texte, support PDF et images."),
  component: () => <LessonKindPage kind="mixed" />,
});
