import type { Metadata } from "next";
import { ClientRegisterForm } from "@/components/client-app/client-register-form";

export const metadata: Metadata = {
  title: "Inscription client — RestauCI",
};

export default function RegisterClientPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <ClientRegisterForm />
    </div>
  );
}
