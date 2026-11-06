import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/facturation")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/facturation", search: location.search, replace: true }); },
});
