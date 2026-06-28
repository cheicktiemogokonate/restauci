import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginVisual } from "@/components/auth/login-visual-panel";
import { RestaurateurLoginForm } from "@/components/auth/restaurateur-login-form";

export const metadata: Metadata = {
  title: "Connexion — RestauCI",
};

export default function LoginPage() {
  return (
    <AuthLayout visual={<LoginVisual />}>
      <RestaurateurLoginForm />
    </AuthLayout>
  );
}