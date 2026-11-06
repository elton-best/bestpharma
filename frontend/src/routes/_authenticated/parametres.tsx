import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/parametres")({
  ssr: false,
  beforeLoad: ({ location }) => { throw redirect({ to: "/dashboard/parametres", search: location.search, replace: true }); },
});
