import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/appareils")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/appareils", search: location.search, replace: true }); },
});
