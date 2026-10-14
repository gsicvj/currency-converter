import { createFileRoute } from "@tanstack/react-router";
import { CurrencyConverter } from "~/components/CurrencyConverter";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <CurrencyConverter />;
}
