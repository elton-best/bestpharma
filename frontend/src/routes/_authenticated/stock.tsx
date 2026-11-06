import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/stock")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/stock", search: location.search, replace: true }); },
});
