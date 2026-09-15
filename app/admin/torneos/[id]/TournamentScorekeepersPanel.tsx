"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournamentScorekeeperAction, setTournamentScorekeepersAction } from "@/lib/actions/users";
import { PasswordField } from "@/components/PasswordField";

type Candidate = { id: string; name: string; email: string };

export function TournamentScorekeepersPanel({
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetFeedback() {
    setError(null);
    setMessage(null);
  }

  return (
    <div className="card space-y-6 p-5">
      <div>
        <h2 className="display text-2xl">Planilleros de este torneo</h2>
        <p className="text-sm text-muted">
          Solo pueden cargar o corregir marcadores. Cada cambio queda registrado con su nombre.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          resetFeedback();
          startTransition(async () => {
            const result = await setTournamentScorekeepersAction({ tournamentId, userIds: selected });
            if (result.error) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Planilleros actualizados.");
            router.refresh();
          });
        }}
      >
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay planilleros. Crea uno abajo o en Usuarios.</p>
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
        <button className="btn btn-dark" disabled={pending || candidates.length === 0} type="submit">
          {pending ? "Guardando..." : "Guardar planilleros"}
        </button>
      </form>

      <form
        className="space-y-4 border-t border-white/10 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          resetFeedback();
          startTransition(async () => {
            const result = await createTournamentScorekeeperAction({
              tournamentId,
              name,
              email,
              password,
            });
            if (result.error) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Planillero creado.");
            setName("");
            setEmail("");
            setPassword("");
            router.refresh();
          });
        }}
      >
        <h3 className="font-bold">Nuevo planillero para este torneo</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Nombre</span>
            <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Correo</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-semibold">Contraseña</span>
            <PasswordField
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          </label>
        </div>
        <button className="btn btn-lime" disabled={pending} type="submit">
          {pending ? "Creando..." : "Crear planillero"}
        </button>
      </form>

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
    </div>
  );
}
