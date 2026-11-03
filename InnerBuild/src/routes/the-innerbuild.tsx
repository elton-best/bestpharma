import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/the-innerbuild")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
