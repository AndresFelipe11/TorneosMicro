"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";

export function HeaderSearch() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const [open, setOpen] = useState(false);
  const visible = open || query.length > 0;

  return (
    <div>
      <div className="mt-3 flex justify-end md:hidden">
        <button className="btn btn-ghost text-sm px-3 py-1.5 text-cream" type="button" onClick={() => setOpen((current) => !current)}>
          {visible ? "Cerrar búsqueda" : "Buscar"}
        </button>
      </div>
      <div className={`${visible ? "mt-3 block" : "hidden"} md:mt-3 md:block`}>
        <SearchBar compact />
      </div>
    </div>
  );
}
