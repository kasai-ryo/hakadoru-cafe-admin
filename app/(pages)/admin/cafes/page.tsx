import { AdminCafeDashboard } from "@/app/components/admin/cafes/AdminCafeDashboard";
import { mockCafes } from "@/app/components/admin/cafes/mockData";
import { mapCafeRowToCafe } from "@/app/api/cafes";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";
import type { Cafe } from "@/app/types/cafe";

export default async function AdminCafesPage() {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  const supabase = getSupabaseServerClient();
  let cafes: Cafe[] = [];

  if (isAuthenticated && supabase) {
    try {
      const timeoutSignal = AbortSignal.timeout(5000);
      const { data, error } = await supabase
        .from("cafes")
        .select("*, cafe_images(*)")
        .order("created_at", { ascending: false })
        .abortSignal(timeoutSignal);
      if (error) {
        console.error("[admin/cafes] Failed to fetch cafes", error);
        cafes = mockCafes;
      } else if (data) {
        cafes = data.map((row) => mapCafeRowToCafe(row));
      }
    } catch (error) {
      console.error("[admin/cafes] Unexpected fetch error", error);
      cafes = mockCafes;
    }
  } else if (isAuthenticated) {
    cafes = mockCafes;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminCafeDashboard cafes={cafes} initialAuthenticated={isAuthenticated} />
    </main>
  );
}
