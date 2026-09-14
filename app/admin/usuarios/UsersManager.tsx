"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdminUserAction, deleteAdminUserAction, updateAdminUserAction } from "@/lib/actions/users";
import { PasswordField } from "@/components/PasswordField";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "GLOBAL_ADMIN" | "TOURNAMENT_ADMIN";
  tournamentIds: string[];
};

type TournamentOption = { id: string; name: string };

export function UsersManager({
  currentUserId,
  users,
  tournaments,
}: {
  currentUserId: string;
  users: UserRow[];
  tournaments: TournamentOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"GLOBAL_ADMIN" | "TOURNAMENT_ADMIN">("TOURNAMENT_ADMIN");
  const [tournamentIds, setTournamentIds] = useState<string[]>([]);

  function run(task: () => Promise<{ error?: string; message?: string }>, resetCreate = false) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Listo.");
      if (resetCreate) {
        setName("");
        setEmail("");
        setPassword("");
        setRole("TOURNAMENT_ADMIN");
        setTournamentIds([]);
      }
      router.refresh();
    });
  }

  function toggleTournament(id: string, selected: string[], onChange: (next: string[]) => void) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }

  return (
    <div className="space-y-8">
      <form
        className="card space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              createAdminUserAction({
                name,
                email,
                password,
                role,
                tournamentIds,
              }),
            true,
          );
        }}
      >
        <div>
          <h2 className="display text-2xl">Nuevo usuario</h2>
          <p className="text-sm text-muted">
            El admin global ve todos los torneos. El admin de torneo solo los que le asignes.
          </p>
        </div>
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
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Contraseña</span>
            <PasswordField
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Rol</span>
            <select
              className="field"
              value={role}
              onChange={(event) => setRole(event.target.value as "GLOBAL_ADMIN" | "TOURNAMENT_ADMIN")}
            >
              <option value="TOURNAMENT_ADMIN">Admin de torneo</option>
              <option value="GLOBAL_ADMIN">Admin global</option>
            </select>
          </label>
        </div>
        {role === "TOURNAMENT_ADMIN" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Torneos que puede administrar</legend>
            {tournaments.length === 0 ? (
              <p className="text-sm text-muted">Crea un torneo primero para poder asignarlo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tournaments.map((tournament) => (
                  <label
                    key={tournament.id}
                    className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${
                      tournamentIds.includes(tournament.id) ? "bg-lime text-pitch" : "bg-card"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={tournamentIds.includes(tournament.id)}
                      onChange={() => toggleTournament(tournament.id, tournamentIds, setTournamentIds)}
                    />
                    {tournament.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        ) : null}
        <button className="btn btn-lime" disabled={pending} type="submit">
          {pending ? "Guardando..." : "Crear usuario"}
        </button>
      </form>

      <div className="space-y-4">
        <h2 className="display text-2xl">Usuarios</h2>
        {users.map((user) => (
          <UserCard
            key={`${user.id}-${user.role}-${user.tournamentIds.join("-")}`}
            currentUserId={currentUserId}
            pending={pending}
            tournaments={tournaments}
            user={user}
            onRun={run}
          />
        ))}
      </div>

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
    </div>
  );
}

function UserCard({
  user,
  currentUserId,
  tournaments,
  pending,
  onRun,
}: {
  user: UserRow;
  currentUserId: string;
  tournaments: TournamentOption[];
  pending: boolean;
  onRun: (task: () => Promise<{ error?: string; message?: string }>) => void;
}) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [password, setPassword] = useState("");
  const [tournamentIds, setTournamentIds] = useState(user.tournamentIds);

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onRun(() =>
          updateAdminUserAction({
            userId: user.id,
            name,
            role,
            password: password || undefined,
            tournamentIds,
          }),
        );
        setPassword("");
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display text-xl">{user.name}</p>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <span className="rounded-full bg-lime/20 px-3 py-1 text-xs font-bold text-lime">
          {user.role === "GLOBAL_ADMIN" ? "Admin global" : "Admin de torneo"}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Nombre</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Rol</span>
          <select
            className="field"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRow["role"])}
          >
            <option value="TOURNAMENT_ADMIN">Admin de torneo</option>
            <option value="GLOBAL_ADMIN">Admin global</option>
          </select>
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold">Nueva contraseña (opcional)</span>
          <PasswordField
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Déjala vacía para no cambiarla"
            value={password}
          />
        </label>
      </div>
      {role === "TOURNAMENT_ADMIN" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Torneos</legend>
          <div className="flex flex-wrap gap-2">
            {tournaments.map((tournament) => (
              <label
                key={tournament.id}
                className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${
                  tournamentIds.includes(tournament.id) ? "bg-lime text-pitch" : "bg-card"
                }`}
              >
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={tournamentIds.includes(tournament.id)}
                  onChange={() =>
                    setTournamentIds((current) =>
                      current.includes(tournament.id)
                        ? current.filter((item) => item !== tournament.id)
                        : [...current, tournament.id],
                    )
                  }
                />
                {tournament.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm text-muted">Este usuario puede administrar todos los torneos.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-lime" disabled={pending} type="submit">
          Guardar
        </button>
        {user.id !== currentUserId ? (
          <button
            className="btn btn-ghost text-red-400"
            disabled={pending}
            type="button"
            onClick={() => {
              if (!confirm(`¿Eliminar a ${user.name}?`)) return;
              onRun(() => deleteAdminUserAction(user.id));
            }}
          >
            Eliminar
          </button>
        ) : null}
      </div>
    </form>
  );
}
