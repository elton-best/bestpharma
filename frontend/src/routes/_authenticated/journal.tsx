import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/journal")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/journal", search: location.search, replace: true }); },
});
