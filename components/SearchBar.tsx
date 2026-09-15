"use client";

import { FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function tournamentSearchTarget(pathname: string) {
  const publicMatch = pathname.match(/^\/torneos\/([^/]+)(.*)$/);
  if (publicMatch) {
    const [, id, rest] = publicMatch;
    const stay = rest === "" || /^\/(calendario|posiciones|goleadores|valla|partidos\/[^/]+)$/.test(rest);
    return { href: stay ? pathname : `/torneos/${id}` };
  }

  const adminMatch = pathname.match(/^\/admin\/torneos\/([^/]+)/);
  if (adminMatch) return { href: `/torneos/${adminMatch[1]}` };

  return null;
}

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const inTournament = Boolean(tournamentSearchTarget(pathname));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = new FormData(event.currentTarget).get("q")?.toString().trim() ?? "";
    const target = tournamentSearchTarget(pathname);

    if (target) {
      const href = nextQuery.length >= 2 ? `${target.href}?q=${encodeURIComponent(nextQuery)}` : target.href;
      router.push(href, { scroll: false });
      return;
    }

    if (nextQuery.length < 2) return;
    router.push(`/buscar?q=${encodeURIComponent(nextQuery)}`);
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "flex min-w-0 flex-1 gap-2" : "flex w-full gap-2"}>
      <input
        className="field min-w-0 flex-1"
        defaultValue={query}
        key={`${pathname}-${query}`}
        name="q"
        placeholder={inTournament ? "Filtra por equipo o jugador" : "Busca equipo o jugador"}
        type="search"
      />
      <button className="btn btn-lime shrink-0 px-4" type="submit">
        Buscar
      </button>
    </form>
  );
}
