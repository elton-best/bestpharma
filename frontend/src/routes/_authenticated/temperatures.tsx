import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/temperatures")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/temperatures", search: location.search, replace: true }); },
});
