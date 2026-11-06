import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/app")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard", search: location.search, replace: true }); },
});
