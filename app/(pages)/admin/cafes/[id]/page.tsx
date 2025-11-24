import { notFound } from "next/navigation";
import { AdminCafeDetail } from "@/app/components/admin/cafes/AdminCafeDetail";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { mapCafeRowToCafe } from "@/app/api/cafes";
import { mockCafes } from "@/app/components/admin/cafes/mockData";
import type { Cafe } from "@/app/types/cafe";

interface DetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminCafeDetailPage({
  params,
}: DetailPageProps) {
  const { id } = params;
  const supabase = getSupabaseServerClient();
  let cafe: Cafe | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("cafes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[admin/cafes/id] Failed to fetch cafe", error);
    } else if (data) {
      cafe = mapCafeRowToCafe(data);
    }
  }

  if (!cafe) {
    cafe = mockCafes.find((item) => item.id === id) ?? null;
  }

  if (!cafe) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <AdminCafeDetail cafe={cafe} />
    </main>
  );
}
