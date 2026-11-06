import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/securite")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/securite", search: location.search, replace: true }); },
});
