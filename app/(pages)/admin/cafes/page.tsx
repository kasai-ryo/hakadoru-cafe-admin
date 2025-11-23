import { AdminCafeDashboard } from "@/app/components/admin/cafes/AdminCafeDashboard";
import { mockCafes } from "@/app/components/admin/cafes/mockData";
import { mapCafeRowToCafe } from "@/app/api/cafes";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import type { Cafe } from "@/app/types/cafe";

export default async function AdminCafesPage() {
  const supabase = getSupabaseServerClient();
  let cafes: Cafe[] = mockCafes;

  if (supabase) {
    const { data, error } = await supabase
      .from("cafes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[admin/cafes] Failed to fetch cafes", error);
    } else if (data) {
      cafes = data.map(mapCafeRowToCafe);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminCafeDashboard cafes={cafes} />
    </main>
  );
}
