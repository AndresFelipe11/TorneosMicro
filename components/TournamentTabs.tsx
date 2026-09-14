"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TournamentTabs({ id, admin = false }: { id: string; admin?: boolean }) {
  const pathname = usePathname();
  const base = admin ? `/admin/torneos/${id}` : `/torneos/${id}`;
  const tabs = admin
    ? [
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
      ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
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
