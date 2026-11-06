import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/comptabilite")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/comptabilite", search: location.search, replace: true }); },
});
