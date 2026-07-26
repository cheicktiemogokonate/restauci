import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { RestaurateurRegisterForm } from "@/components/auth/restaurateur-register-form";

export const metadata: Metadata = {
  title: "Inscription restaurateur",
};

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RestaurateurRegisterForm />
    </AuthLayout>
  );
}
