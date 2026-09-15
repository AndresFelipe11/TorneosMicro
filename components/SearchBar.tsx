"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function tournamentSearchTarget(pathname: string) {
  const publicMatch = pathname.match(/^\/torneos\/([^/]+)(.*)$/);
  if (publicMatch) {
    const [, id, rest] = publicMatch;
    const stay =
      rest === "" ||
      /^\/(calendario|posiciones|goleadores|valla|reglamento|equipos(\/[^/]+)?|partidos\/[^/]+)$/.test(rest);
    return { href: stay ? pathname : `/torneos/${id}` };
  }

  const adminMatch = pathname.match(/^\/admin\/torneos\/([^/]+)/);
  if (adminMatch) return { href: `/torneos/${adminMatch[1]}` };

  return null;
}

export function SearchBar() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const inTournament = Boolean(tournamentSearchTarget(pathname));
  const [value, setValue] = useState(query);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(query);
  }, [query, pathname]);

  function go(nextQuery: string, replace = false) {
    const trimmed = nextQuery.trim();
    const target = tournamentSearchTarget(pathname);
    const navigate = replace ? router.replace.bind(router) : router.push.bind(router);

    if (target) {
      const href = trimmed.length >= 2 ? `${target.href}?q=${encodeURIComponent(trimmed)}` : target.href;
      navigate(href, { scroll: false });
      return;
    }

    if (trimmed.length < 2) return;
    navigate(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  function onChange(next: string) {
    setValue(next);
    if (!inTournament) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go(next, true), 250);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (debounce.current) clearTimeout(debounce.current);
    go(value);
  }

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  return (
    <form onSubmit={onSubmit} className="flex w-full min-w-0 gap-2">
      <input
        className="field min-w-0 flex-1"
        value={value}
        name="q"
        placeholder={inTournament ? "Filtra equipo o jugador" : "Busca equipo o jugador"}
        type="search"
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="btn btn-lime shrink-0 px-3 sm:px-4" type="submit">
        Buscar
      </button>
    </form>
  );
}
