import { requireAdmin } from "@/lib/requireAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="min-h-full">{children}</div>;
}
