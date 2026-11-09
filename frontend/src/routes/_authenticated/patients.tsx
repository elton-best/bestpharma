import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/patients")({
  ssr: false,
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/dashboard/patients",
      search: location.search,
      replace: true,
    });
  },
});
