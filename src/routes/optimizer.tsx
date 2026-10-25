import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";
import { CargoFormPanel } from "@/components/dhow/CargoForm";
import { RouteResults } from "@/components/dhow/RouteResults";
import { EventStream } from "@/components/dhow/EventStream";
import { Panel, PageTitle } from "@/components/dhow/ui";
import { useDhow } from "@/lib/dhow-store";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/optimizer")({
  head: () => seo("Route & Freight Optimizer — Dhow", "Compare fastest, cheapest and AI-optimized multimodal routes with live risk and disruption scoring."),
  component: Optimizer,
});

function Optimizer() {
  const { form, running } = useDhow();
  return (
    <>
      <PageTitle title="Autonomous Route & Freight Optimizer" sub="Describe your cargo — Dhow compares air, ocean and multimodal options instantly." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Cargo Request" icon={<RouteIcon className="size-4" />} className="lg:col-span-2"><CargoFormPanel /></Panel>
        <EventStream className="h-72 lg:h-auto" />
      </div>
      <div className={`mt-4 transition-opacity ${running ? "opacity-50" : ""}`}>
        <RouteResults form={form} />
      </div>
    </>
  );
}
