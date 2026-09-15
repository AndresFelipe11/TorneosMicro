"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";

export function TournamentTabs({
  id,
  admin = false,
  registrationOpen = false,
  scorekeeper = false,
  query,
}: {
  id: string;
  admin?: boolean;
  registrationOpen?: boolean;
  scorekeeper?: boolean;
  query?: string;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const base = admin ? `/admin/torneos/${id}` : `/torneos/${id}`;
  const suffix = query && query.trim().length >= 2 ? `?q=${encodeURIComponent(query.trim())}` : "";
  const tabs = admin
    ? scorekeeper
      ? [
          { href: base, label: "Partidos" },
          { href: `/torneos/${id}`, label: "Vista pública" },
        ]
      : [
          { href: `${base}/datos`, label: "Datos" },
          { href: `${base}/inscripciones`, label: "Inscripciones" },
          { href: base, label: "Partidos" },
          { href: `${base}/calendario`, label: "Calendario" },
          { href: `${base}/editar`, label: "Equipos" },
          { href: `/torneos/${id}`, label: "Vista pública" },
        ]
    : [
        { href: base, label: "Resumen" },
        { href: `${base}/calendario`, label: "Calendario" },
        { href: `${base}/posiciones`, label: "Posiciones" },
        { href: `${base}/goleadores`, label: "Goleadores" },
        { href: `${base}/valla`, label: "Valla" },
        { href: `${base}/equipos`, label: "Equipos" },
        ...(registrationOpen ? [{ href: `${base}/inscribirme`, label: "Inscribirme" }] : []),
      ];

  return (
    <div className="mb-6">
      <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {tabs.map((tab) => {
            const active =
              mounted &&
              (pathname === tab.href ||
                (tab.href.endsWith("/equipos") && pathname.startsWith(`${tab.href}/`)));
            return (
              <Link
                key={tab.href}
                href={`${tab.href}${suffix}`}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold no-underline ${
                  active ? "bg-lime text-pitch" : "bg-card text-cream"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      {admin ? null : (
        <Suspense fallback={<div className="h-11" />}>
          <SearchBar />
        </Suspense>
      )}
    </div>
  );
}
