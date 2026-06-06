import type { Metadata } from "next";
import { Sidebar } from "@/components/dashboard/sidebar";

export const metadata: Metadata = {
  title: "RestauCI - Dashboard",
  description: "Restaurant management dashboard - Vue d'ensemble en direct",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:pl-64 flex flex-col min-h-screen relative z-10">{children}</main>
      {/* <main className="flex flex-1 flex-col overflow-hidden">{children}</main> */}
    </div>
  );
}
