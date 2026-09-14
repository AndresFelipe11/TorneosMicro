import Link from "next/link";
import { auth } from "@/auth";
import { logoutAction } from "@/lib/actions/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="pitch-bg text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-center gap-3 text-cream no-underline">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-pitch display text-lg">
            TM
          </span>
          <span>
            <span className="display block text-2xl leading-none">TorneosMicro</span>
            <span className="text-xs text-lime/80">Calendario · Posiciones · Goles</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-cream/85 hover:text-lime">
            Torneos
          </Link>
          {session ? (
            <>
              <Link href="/admin" className="text-cream/85 hover:text-lime">
                Admin
              </Link>
              <form action={logoutAction}>
                <button className="btn btn-ghost text-sm px-3 py-1.5 text-cream" type="submit">
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
    </header>
  );
}
