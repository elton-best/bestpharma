import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/personnel")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/personnel", search: location.search, replace: true }); },
});
