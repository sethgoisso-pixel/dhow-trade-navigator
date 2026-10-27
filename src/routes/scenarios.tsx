import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/scenarios")({
  beforeLoad: () => {
    throw redirect({ to: "/optimizer" });
  },
  component: () => null,
});
