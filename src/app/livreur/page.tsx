import type { Metadata } from "next";
import { DriverApp } from "@/components/driver-app/driver-app";

export const metadata: Metadata = {
  title: "Espace livreur",
  description: "Propositions et missions de livraison RestauCI.",
};

export default function DriverPage() {
  return <DriverApp />;
}
