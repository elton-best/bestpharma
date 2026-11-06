import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/compte")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/compte", search: location.search, replace: true }); },
});
