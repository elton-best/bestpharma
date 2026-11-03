import { createFileRoute } from "@tanstack/react-router";
import { appHead } from "@/components/app/AppShell";
import { LessonKindPage } from "@/components/app/LessonKindPage";

export const Route = createFileRoute("/app/lecons-texte")({
  head: appHead("Leçons texte", "Toutes les leçons écrites de ta formation AIFAC."),
  component: () => <LessonKindPage kind="text" />,
});
