import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/locaux")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/locaux", search: location.search, replace: true }); },
});
