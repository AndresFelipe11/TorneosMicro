"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTournamentAdminsAction } from "@/lib/actions/users";

type Candidate = { id: string; name: string; email: string };

export function TournamentAdminsPanel({
  tournamentId,
  assignedIds,
  candidates,
}: {
  tournamentId: string;
  assignedIds: string[];
  candidates: Candidate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(assignedIds);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await setTournamentAdminsAction({ tournamentId, userIds: selected });
          if (result.error) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Administradores actualizados.");
          router.refresh();
        });
      }}
    >
      <div>
        <h2 className="display text-2xl">Admins de este torneo</h2>
        <p className="text-sm text-muted">
          Elige quién puede editar equipos, calendario e inscripciones. Los planilleros se asignan
          aparte. El admin global siempre tiene acceso.
        </p>
      </div>
      {candidates.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no hay usuarios con rol de admin de torneo. Créalos en Usuarios.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {candidates.map((user) => (
            <label
              key={user.id}
              className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${
                selected.includes(user.id) ? "bg-lime text-pitch" : "bg-card"
              }`}
            >
              <input
                className="sr-only"
                type="checkbox"
                checked={selected.includes(user.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(user.id)
                      ? current.filter((id) => id !== user.id)
                      : [...current, user.id],
                  )
                }
              />
              {user.name}
            </label>
          ))}
        </div>
      )}
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
      <button className="btn btn-dark" disabled={pending || candidates.length === 0} type="submit">
        {pending ? "Guardando..." : "Guardar admins"}
      </button>
    </form>
  );
}
