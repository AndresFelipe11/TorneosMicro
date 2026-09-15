"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const base = admin ? `/admin/torneos/${id}` : `/torneos/${id}`;
  const suffix = query && query.trim().length >= 2 ? `?q=${encodeURIComponent(query.trim())}` : "";
  const tabs = admin
    ? scorekeeper
      ? [
          { href: base, label: "Partidos" },
          { href: `/torneos/${id}`, label: "Vista pública" },
        ]
      : [
          { href: base, label: "Gestionar" },
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
        ...(registrationOpen ? [{ href: `${base}/inscribirme`, label: "Inscribirme" }] : []),
      ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${suffix}`}
            className={`rounded-full px-4 py-2 text-sm font-bold no-underline ${
              active ? "bg-lime text-pitch" : "bg-card text-cream"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
