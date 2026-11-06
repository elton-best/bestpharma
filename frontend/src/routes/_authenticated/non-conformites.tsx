import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/non-conformites")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/non-conformites", search: location.search, replace: true }); },
});
