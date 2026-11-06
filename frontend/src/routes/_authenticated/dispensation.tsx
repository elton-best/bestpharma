import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/dispensation")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/dispensation", search: location.search, replace: true }); },
});
