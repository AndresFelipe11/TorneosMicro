"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { teamNameInput } from "@/lib/format";
import {
  addPlayerAction,
  addTeamAction,
  deletePlayerAction,
  deleteTeamAction,
  renameTeamAction,
  setTeamCaptainAction,
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
  whatsapp: string | null;
  captain: { id: string } | null;
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
  rulesHighlights: initialHighlights,
  rules: initialRules,
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
  rulesHighlights: string;
  rules: string;
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
  const [rulesHighlights, setRulesHighlights] = useState(initialHighlights);
  const [rules, setRules] = useState(initialRules);
  const [newTeam, setNewTeam] = useState("");
  const [newGroup, setNewGroup] = useState(groups[0]?.id ?? "");
  const [newPlayers, setNewPlayers] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");

  useEffect(() => {
    setName(tournamentName);
    setVenue(initialVenue);
    setDescription(initialDescription);
    setRegistrationFee(initialFee);
    setPrizes(initialPrizes);
    setRulesHighlights(initialHighlights);
    setRules(initialRules);
  }, [tournamentName, initialVenue, initialDescription, initialFee, initialPrizes, initialHighlights, initialRules]);

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
              rulesHighlights,
              rules,
            }),
          );
        }}
      >
        <h2 className="display text-2xl">Nombre, descripción y reglamento</h2>
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
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Reglas importantes</span>
          <textarea
            className="field min-h-24"
            placeholder="Las normas clave que se ven en el resumen: duración, tarjetas, W.O., etc."
            value={rulesHighlights}
            onChange={(e) => setRulesHighlights(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Reglamento completo</span>
          <textarea
            className="field min-h-40"
            placeholder="Texto completo para la pestaña Reglamento y el PDF."
            value={rules}
            onChange={(e) => setRules(e.target.value)}
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
            message: `¿Agregar a ${teamName || "este equipo"}?\nSe reconstruyen las jornadas y se reprograma el calendario de los partidos pendientes.`,
            confirmLabel: "Agregar",
          });
          if (!ok) return;
          run(async () => {
            const result = await addTeamAction({
              tournamentId,
              name: newTeam,
              groupId: format === "GROUPS" ? newGroup : null,
              players: newPlayers.split(","),
              whatsapp: newWhatsapp,
            });
            if (!result.error) {
              setNewTeam("");
              setNewPlayers("");
              setNewWhatsapp("");
            }
            return result;
          });
        }}
      >
        <h2 className="display text-2xl">Agregar equipo</h2>
        <p className="text-sm text-muted">
          Cada vez que agregas un equipo se vuelven a armar las jornadas (todos contra todos) y se
          reprograma el calendario completo de partidos pendientes, con el descanso entre partidos
          del mismo equipo. Si el torneo no ha empezado, se mueve desde el inicio; si ya inició, los
          jugados no se tocan y el resto queda desde la semana siguiente. Si no caben, amplía la
          fecha de fin, añade otro día de juego o sube los partidos por día.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="field uppercase"
            placeholder="Nombre del equipo"
            value={newTeam}
            onChange={(e) => setNewTeam(teamNameInput(e.target.value))}
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
        <input
          className="field"
          placeholder="WhatsApp del capitán (usuario = nombre del equipo, clave = este número)"
          value={newWhatsapp}
          onChange={(e) => setNewWhatsapp(e.target.value)}
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
                message: `¿Eliminar a ${team.name}?\nSe borrarán sus partidos pendientes y se reconstruirán las jornadas. No se puede si ya tiene partidos jugados.`,
                confirmLabel: "Eliminar",
                danger: true,
              });
              if (!ok) return;
              run(() => deleteTeamAction(team.id));
            }}
            onAddPlayer={(value) => run(() => addPlayerAction(team.id, value))}
            onRenamePlayer={(playerId, value) => run(() => updatePlayerAction(playerId, value))}
            onCaptain={(value) => run(() => setTeamCaptainAction(team.id, value))}
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
  onCaptain,
}: {
  team: Team;
  pending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddPlayer: (name: string) => void;
  onRenamePlayer: (playerId: string, name: string) => void;
  onDeletePlayer: (player: Player) => void;
  onCaptain: (whatsapp: string) => void;
}) {
  const [teamName, setTeamName] = useState(team.name);
  const [playerName, setPlayerName] = useState("");
  const [whatsapp, setWhatsapp] = useState(team.whatsapp ?? "");

  useEffect(() => {
    setTeamName(team.name);
    setWhatsapp(team.whatsapp ?? "");
  }, [team.name, team.whatsapp]);

  return (
    <section className="card space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="field flex-1 uppercase" value={teamName} onChange={(e) => setTeamName(teamNameInput(e.target.value))} />
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="field min-w-0 flex-1"
          placeholder="WhatsApp del capitán"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <button type="button" className="btn btn-dark shrink-0" disabled={pending} onClick={() => onCaptain(whatsapp)}>
          Guardar acceso
        </button>
      </div>
      {team.captain ? (
        <p className="text-xs text-muted">
          El capitán entra con el nombre del equipo y ese número.
        </p>
      ) : (
        <p className="text-xs text-muted">Sin acceso de capitán todavía.</p>
      )}

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
