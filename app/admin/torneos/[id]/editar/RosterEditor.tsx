"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import {
  addPlayerAction,
  addTeamAction,
  deletePlayerAction,
  deleteTeamAction,
  renameTeamAction,
  updatePlayerAction,
  updateTournamentNameAction,
} from "@/lib/actions/roster";

type Player = { id: string; name: string; number: number | null };
type Group = { id: string; name: string };
type Team = {
  id: string;
  name: string;
  groupId: string | null;
  group: { name: string } | null;
  players: Player[];
};

export function RosterEditor({
  tournamentId,
  tournamentName,
  format,
  groups,
  teams,
  venue: initialVenue,
  description: initialDescription,
  registrationFee: initialFee,
  prizes: initialPrizes,
}: {
  tournamentId: string;
  tournamentName: string;
  format: "ROUND_ROBIN" | "GROUPS" | "QUADRANGULAR";
  groups: Group[];
  teams: Team[];
  venue: string;
  description: string;
  registrationFee: string;
  prizes: string;
}) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(tournamentName);
  const [venue, setVenue] = useState(initialVenue);
  const [description, setDescription] = useState(initialDescription);
  const [registrationFee, setRegistrationFee] = useState(initialFee);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [newTeam, setNewTeam] = useState("");
  const [newGroup, setNewGroup] = useState(groups[0]?.id ?? "");
  const [newPlayers, setNewPlayers] = useState("");

  useEffect(() => {
    setName(tournamentName);
    setVenue(initialVenue);
    setDescription(initialDescription);
    setRegistrationFee(initialFee);
    setPrizes(initialPrizes);
  }, [tournamentName, initialVenue, initialDescription, initialFee, initialPrizes]);

  function run(task: () => Promise<{ error?: string; message?: string; ok?: boolean } | void>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (result?.error) setError(result.error);
      else {
        setMessage(result?.message ?? "Cambios guardados.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <form
        id="info"
        className="card space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() =>
            updateTournamentNameAction(tournamentId, name, venue, {
              description,
              registrationFee,
              prizes,
            }),
          );
        }}
      >
        <h2 className="display text-2xl">Nombre, descripción y premiación</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Nombre del torneo</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Cancha / sede</span>
            <input
              className="field"
              placeholder="Ej. Cancha 1 · Parque El Salitre"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Descripción</span>
          <textarea
            className="field min-h-24"
            placeholder="Cuéntale a los equipos de qué se trata el torneo."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Valor de la inscripción</span>
          <textarea
            className="field min-h-20"
            placeholder="Ej. $50.000 por equipo, incluye balón y hidratación."
            value={registrationFee}
            onChange={(e) => setRegistrationFee(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Premiación</span>
          <textarea
            className="field min-h-20"
            placeholder="Ej. 1° $400.000 · 2° $200.000 · Goleador medalla."
            value={prizes}
            onChange={(e) => setPrizes(e.target.value)}
          />
        </label>
        <button className="btn btn-dark" disabled={pending} type="submit">
          Guardar
        </button>
      </form>

      <form
        className="card space-y-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const teamName = newTeam.trim();
          const ok = await ask({
            title: "Agregar equipo",
            message: `¿Agregar a ${teamName || "este equipo"}?\nSe le programarán partidos contra los rivales.`,
            confirmLabel: "Agregar",
          });
          if (!ok) return;
          run(async () => {
            const result = await addTeamAction({
              tournamentId,
              name: newTeam,
              groupId: format === "GROUPS" ? newGroup : null,
              players: newPlayers.split(","),
            });
            if (!result.error) {
              setNewTeam("");
              setNewPlayers("");
            }
            return result;
          });
        }}
      >
        <h2 className="display text-2xl">Agregar equipo</h2>
        <p className="text-sm text-muted">
          Se programan partidos de un solo cruce contra los rivales del mismo grupo o del torneo. Los
          partidos nuevos empiezan la semana siguiente, para no mover el calendario de esta semana.
          Si no caben, amplía la fecha de fin, añade otro día de juego o sube los partidos por día.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="field"
            placeholder="Nombre del equipo"
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            required
          />
          {format === "GROUPS" ? (
            <select className="field" value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <input
          className="field"
          placeholder="Jugadores separados por coma (opcional)"
          value={newPlayers}
          onChange={(e) => setNewPlayers(e.target.value)}
        />
        <button className="btn btn-lime" disabled={pending} type="submit">
          Agregar equipo
        </button>
      </form>

      <div className="space-y-4">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            pending={pending}
            onRename={(value) => run(() => renameTeamAction(team.id, value))}
            onDelete={async () => {
              const ok = await ask({
                title: "Eliminar equipo",
                message: `¿Eliminar a ${team.name}?\nSe borrarán sus partidos, incluidos los que ya tengan resultado.`,
                confirmLabel: "Eliminar",
                danger: true,
              });
              if (!ok) return;
              run(() => deleteTeamAction(team.id));
            }}
            onAddPlayer={(value) => run(() => addPlayerAction(team.id, value))}
            onRenamePlayer={(playerId, value) => run(() => updatePlayerAction(playerId, value))}
            onDeletePlayer={async (player) => {
              const ok = await ask({
                title: "Quitar jugador",
                message: `¿Quitar a ${player.name} de ${team.name}?`,
                confirmLabel: "Quitar",
                danger: true,
              });
              if (!ok) return;
              run(() => deletePlayerAction(player.id));
            }}
          />
        ))}
      </div>

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
    </div>
  );
}

function TeamCard({
  team,
  pending,
  onRename,
  onDelete,
  onAddPlayer,
  onRenamePlayer,
  onDeletePlayer,
}: {
  team: Team;
  pending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddPlayer: (name: string) => void;
  onRenamePlayer: (playerId: string, name: string) => void;
  onDeletePlayer: (player: Player) => void;
}) {
  const [teamName, setTeamName] = useState(team.name);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    setTeamName(team.name);
  }, [team.name]);

  return (
    <section className="card space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="field flex-1" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
        {team.group ? (
          <span className="rounded-full bg-lime/30 px-3 py-1 text-xs font-bold">{team.group.name}</span>
        ) : null}
        <button type="button" className="btn btn-dark" disabled={pending} onClick={() => onRename(teamName)}>
          Renombrar
        </button>
        <button type="button" className="btn btn-ghost text-red-400" disabled={pending} onClick={onDelete}>
          Eliminar
        </button>
      </div>

      <ul className="space-y-2">
        {team.players.length === 0 ? (
          <li className="text-sm text-muted">Este equipo todavía no tiene jugadores.</li>
        ) : (
          team.players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              pending={pending}
              onRename={(value) => onRenamePlayer(player.id, value)}
              onDelete={() => onDeletePlayer(player)}
            />
          ))
        )}
      </ul>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (!playerName.trim()) return;
          onAddPlayer(playerName);
          setPlayerName("");
        }}
      >
        <input
          className="field min-w-0 flex-1"
          placeholder="Nombre del jugador"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button className="btn btn-lime shrink-0" disabled={pending} type="submit">
          Añadir jugador
        </button>
      </form>
    </section>
  );
}

function PlayerRow({
  player,
  pending,
  onRename,
  onDelete,
}: {
  player: Player;
  pending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(player.name);
  useEffect(() => {
    setName(player.name);
  }, [player.name]);
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input className="field min-w-0 flex-1" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => onRename(name)}>
          Guardar
        </button>
        <button type="button" className="btn btn-ghost text-red-400" disabled={pending} onClick={onDelete}>
          Quitar
        </button>
      </div>
    </li>
  );
}
