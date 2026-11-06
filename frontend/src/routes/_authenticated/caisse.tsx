import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/caisse")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/vente", search: location.search, replace: true }); },
});
