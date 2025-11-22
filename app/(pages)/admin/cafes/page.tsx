import { AdminCafeDashboard } from "@/app/components/admin/cafes/AdminCafeDashboard";
import { mockCafes } from "@/app/components/admin/cafes/mockData";

export default function AdminCafesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <AdminCafeDashboard cafes={mockCafes} />
    </main>
  );
}
