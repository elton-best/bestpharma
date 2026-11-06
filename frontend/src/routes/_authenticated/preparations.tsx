import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/preparations")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/preparations", search: location.search, replace: true }); },
});
