import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/stupefiants")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/stupefiants", search: location.search, replace: true }); },
});
