import Link from "next/link";
import { requireAnyAdmin, isGlobalAdmin } from "@/lib/authz";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAnyAdmin();

  return (
    <div className="min-h-full">
      <div className="border-b border-white/10 bg-pitch/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
          <Link href="/admin" className="font-bold text-cream no-underline hover:text-lime">
            Panel
          </Link>
          {isGlobalAdmin(admin) ? (
            <>
              <Link href="/admin/torneos/nuevo" className="text-cream/80 no-underline hover:text-lime">
                Nuevo torneo
              </Link>
              <Link href="/admin/usuarios" className="text-cream/80 no-underline hover:text-lime">
                Usuarios
              </Link>
            </>
          ) : (
            <span className="text-muted">Admin de torneo</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
