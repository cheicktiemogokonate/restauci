import { getAdminSession } from "@/lib/auth/get-admin-session";
import { redirect } from "next/navigation";

export default async function AdminCommandesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    statut?: string;
    restaurant?: string;
    dateDebut?: string;
    dateFin?: string;
    signal?: string;
    page?: string;
  }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  redirect(`/admin/support${query.size > 0 ? `?${query.toString()}` : ""}`);
}
