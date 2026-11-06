import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/modeles")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/modeles", search: location.search, replace: true }); },
});
