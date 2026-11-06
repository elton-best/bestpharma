import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/pointage")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/pointage", search: location.search, replace: true }); },
});
