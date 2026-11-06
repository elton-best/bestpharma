import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/auto-evaluation")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/auto-evaluation", search: location.search, replace: true }); },
});
