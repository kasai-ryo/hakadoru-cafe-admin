import { notFound, redirect } from "next/navigation";
import { AdminCafeDetail } from "@/app/components/admin/cafes/AdminCafeDetail";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { mapCafeRowToCafe } from "@/app/api/cafes";
import { mockCafes } from "@/app/components/admin/cafes/mockData";
import { isAdminAuthenticatedFromCookies } from "@/app/lib/adminAuth";
import type { Cafe } from "@/app/types/cafe";

type CafeRequestDetail = {
  id: string;
  accountId: string;
  accountName: string | null;
  adminComment: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

interface DetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    draftId?: string;
  }>;
}

export default async function AdminCafeDetailPage({
  params,
  searchParams,
}: DetailPageProps) {
  const isAuthenticated = await isAdminAuthenticatedFromCookies();
  if (!isAuthenticated) {
    redirect("/admin/cafes");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const supabase = getSupabaseServerClient();
  let cafe: Cafe | null = null;
  let cafeRequest: CafeRequestDetail | null = null;
  let firstRequestAccountName: string | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from("cafes")
      .select("*, cafe_images(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[admin/cafes/id] Failed to fetch cafe", error);
    } else if (data) {
      cafe = mapCafeRowToCafe(data);
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("cafe_requests")
      .select("id, account_id, admin_comment, created_at, updated_at, reviewed_at")
      .eq("cafe_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (requestError) {
      console.error("[admin/cafes/id] Failed to fetch cafe request", requestError);
    } else if (requestRow) {
      let accountName: string | null = null;
      const { data: accountRow, error: accountError } = await supabase
        .from("accounts")
        .select("display_name")
        .eq("id", requestRow.account_id)
        .maybeSingle();

      if (accountError) {
        console.error("[admin/cafes/id] Failed to fetch request account", accountError);
      } else if (accountRow?.display_name) {
        accountName = accountRow.display_name as string;
      }

      cafeRequest = {
        id: requestRow.id as string,
        accountId: requestRow.account_id as string,
        accountName,
        adminComment: (requestRow.admin_comment as string | null) ?? null,
        createdAt: requestRow.created_at as string,
        updatedAt: requestRow.updated_at as string,
        reviewedAt: (requestRow.reviewed_at as string | null) ?? null,
      };
    }

    if (cafe?.firstRequestAccountId) {
      if (cafeRequest && cafeRequest.accountId === cafe.firstRequestAccountId) {
        firstRequestAccountName = cafeRequest.accountName;
      } else {
        const { data: firstRequestAccountRow, error: firstRequestAccountError } = await supabase
          .from("accounts")
          .select("display_name")
          .eq("id", cafe.firstRequestAccountId)
          .maybeSingle();

        if (firstRequestAccountError) {
          console.error("[admin/cafes/id] Failed to fetch first request account", firstRequestAccountError);
        } else if (firstRequestAccountRow?.display_name) {
          firstRequestAccountName = firstRequestAccountRow.display_name as string;
        }
      }
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
      <AdminCafeDetail
        cafe={cafe}
        cafeRequest={cafeRequest}
        firstRequestAccountName={firstRequestAccountName}
        initialAuthenticated
        initialDraftSnapshotId={resolvedSearchParams?.draftId ?? null}
      />
    </main>
  );
}
