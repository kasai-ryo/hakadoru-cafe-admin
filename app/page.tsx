import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-gray-500">
          Hakadoru Café Admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-gray-900">
          管理者ページへようこそ
        </h1>
        <p className="mt-3 text-gray-600">
          カフェの登録や更新は管理者専用画面から操作できます。
        </p>
      </div>
      <Link
        href="/admin/cafes"
        className="rounded-lg bg-primary px-6 py-3 text-white shadow hover:bg-primary-dark"
      >
        カフェ管理ページを開く
      </Link>
    </main>
  );
}
