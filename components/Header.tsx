import Link from "next/link";
import { getAdminUser, isCaptain, isGlobalAdmin } from "@/lib/authz";
import { logoutAction } from "@/lib/actions/auth";

export async function Header() {
  const admin = await getAdminUser();

  return (
    <header className="pitch-bg text-cream">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-cream no-underline sm:gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-pitch display text-lg sm:h-10 sm:w-10">
              TM
            </span>
            <span className="min-w-0">
              <span className="display block text-xl leading-none sm:text-2xl">TorneosMicro</span>
              <span className="mt-0.5 hidden text-xs text-lime/80 sm:block">Calendario · Posiciones · Goles</span>
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
            <Link href="/" className="hidden text-cream/85 hover:text-lime sm:inline">
              Torneos
            </Link>
            {admin ? (
              <>
                {isCaptain(admin) ? (
                  <Link href="/mi-equipo" className="text-cream/85 hover:text-lime">
                    Mi equipo
                  </Link>
                ) : (
                  <Link href="/admin" className="text-cream/85 hover:text-lime">
                    Admin
                  </Link>
                )}
                {isGlobalAdmin(admin) ? (
                  <Link href="/admin/usuarios" className="hidden text-cream/85 hover:text-lime sm:inline">
                    Usuarios
                  </Link>
                ) : null}
                <form action={logoutAction}>
                  <button className="btn btn-ghost px-3 py-1.5 text-sm text-cream" type="submit">
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-lime text-sm">
                Entrar
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
