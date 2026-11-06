import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/echeances")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/echeances", search: location.search, replace: true }); },
});
