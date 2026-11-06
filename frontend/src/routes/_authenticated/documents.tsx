import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/documents")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/documents", search: location.search, replace: true }); },
});
