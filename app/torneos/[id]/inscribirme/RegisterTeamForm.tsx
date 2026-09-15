"use client";

import { useState, useTransition } from "react";
import { useAskConfirm } from "@/components/ConfirmDialog";
import { requestTeamRegistrationAction } from "@/lib/actions/registration";

export function RegisterTeamForm({
  tournamentId,
  tournamentName,
  groups,
}: {
  tournamentId: string;
  tournamentName: string;
  groups: { id: string; name: string }[];
}) {
  const ask = useAskConfirm();
  const [name, setName] = useState("");
  const [players, setPlayers] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        const teamName = name.trim();
        startTransition(async () => {
          const result = await requestTeamRegistrationAction({
            tournamentId,
            name,
            players: [players],
            whatsapp,
            groupId: groups.length > 0 ? groupId : null,
          });
          if (result.error) {
            setError(result.error);
            return;
          }
          setMessage("Tu equipo ya pidió registrarse. Solo falta la confirmación por WhatsApp.");
          setWhatsappUrl(result.whatsappUrl ?? null);
          setName("");
          setPlayers("");
          setWhatsapp("");
          if (!result.whatsappUrl) return;
          const go = await ask({
            title: "Inscripción enviada",
            message: `Tu equipo ${teamName} ya pidió registrarse. Solo falta la confirmación por WhatsApp.\n¿Quieres que te redirija a WhatsApp?`,
            confirmLabel: "Ir a WhatsApp",
            cancelLabel: "Ahora no",
          });
          if (go) window.location.assign(result.whatsappUrl);
        });
      }}
    >
      <div>
        <h2 className="display text-2xl">Inscribir equipo</h2>
        <p className="text-sm text-muted">
          Llena el nombre de tu equipo, el WhatsApp del capitán y los jugadores. Al enviar te
          avisamos y, si quieres, te llevamos a WhatsApp para confirmar con el administrador de{" "}
          {tournamentName}.
        </p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Nombre del equipo</span>
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">WhatsApp del capitán</span>
        <input
          className="field"
          placeholder="300 123 4567"
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          required
        />
      </label>
      {groups.length > 0 ? (
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Grupo</span>
          <select className="field" value={groupId} onChange={(event) => setGroupId(event.target.value)}>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Jugadores</span>
        <textarea
          className="field min-h-32"
          placeholder="Uno por línea o separados por coma"
          value={players}
          onChange={(event) => setPlayers(event.target.value)}
          required
        />
      </label>
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
      {whatsappUrl ? (
        <a className="btn btn-lime w-full sm:w-auto" href={whatsappUrl}>
          Abrir WhatsApp
        </a>
      ) : (
        <button className="btn btn-lime w-full sm:w-auto" disabled={pending} type="submit">
          {pending ? "Enviando..." : "Agregar equipo"}
        </button>
      )}
    </form>
  );
}
