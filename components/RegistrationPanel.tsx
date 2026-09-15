"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAskConfirm } from "@/components/ConfirmDialog";
import {
  acceptTeamRegistrationAction,
  rejectTeamRegistrationAction,
  setRegistrationOpenAction,
  updateMyWhatsAppAction,
} from "@/lib/actions/registration";

type Registration = {
  id: string;
  name: string;
  players: string[];
  whatsapp: string | null;
  groupId: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
};

export function RegistrationPanel({
  tournamentId,
  registrationOpen,
  finished,
  whatsapp,
  hasContactWhatsApp,
  groups,
  registrations,
}: {
  tournamentId: string;
  registrationOpen: boolean;
  finished: boolean;
  whatsapp: string;
  hasContactWhatsApp: boolean;
  groups: { id: string; name: string }[];
  registrations: Registration[];
}) {
  const router = useRouter();
  const ask = useAskConfirm();
  const [phone, setPhone] = useState(whatsapp);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [groupById, setGroupById] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      registrations.map((item) => [item.id, item.groupId ?? groups[0]?.id ?? ""]),
    ),
  );

  const pendingRows = registrations.filter((item) => item.status === "PENDING");
  const acceptedRows = registrations.filter((item) => item.status === "ACCEPTED");

  function run(task: () => Promise<{ error?: string; message?: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Listo.");
      router.refresh();
    });
  }

  return (
    <div id="inscripciones" className="card space-y-5 p-5">
      <div>
        <h2 className="display text-2xl">Inscripciones</h2>
        <p className="text-sm text-muted">
          Si el torneo está disponible, cualquiera puede pedir un equipo. Luego confirma por WhatsApp
          y tú aceptas o rechazas.
        </p>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => updateMyWhatsAppAction(phone));
        }}
      >
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Tu WhatsApp</span>
          <input
            className="field"
            placeholder="300 123 4567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <button className="btn btn-dark" disabled={pending} type="submit">
          Guardar WhatsApp
        </button>
      </form>
      {!hasContactWhatsApp ? (
        <p className="text-sm font-semibold text-orange-200">
          Guarda un WhatsApp para poder abrir las inscripciones.
        </p>
      ) : null}

      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={registrationOpen}
          disabled={pending || finished}
          onChange={(event) => run(() => setRegistrationOpenAction(tournamentId, event.target.checked))}
        />
        Torneo disponible para añadir equipos
      </label>

      <div>
        <h3 className="display text-xl">Solicitudes</h3>
        {pendingRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No hay equipos esperando confirmación.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {pendingRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/10 p-4">
                <p className="font-bold">{row.name}</p>
                <p className="text-sm text-muted">{row.players.join(", ")}</p>
                {row.whatsapp ? (
                  <p className="mt-1 text-sm">
                    Capitán:{" "}
                    <a className="font-bold text-lime" href={`https://wa.me/${row.whatsapp}`}>
                      {row.whatsapp}
                    </a>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">Sin WhatsApp del capitán.</p>
                )}
                {groups.length > 0 ? (
                  <label className="mt-3 block space-y-1">
                    <span className="text-sm font-semibold">Grupo</span>
                    <select
                      className="field"
                      value={groupById[row.id] ?? ""}
                      onChange={(event) =>
                        setGroupById((current) => ({ ...current, [row.id]: event.target.value }))
                      }
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-lime"
                    disabled={pending}
                    onClick={async () => {
                      const ok = await ask({
                        title: "Aceptar equipo",
                        message: `¿Aceptar a ${row.name}? Se programarán sus partidos.`,
                        confirmLabel: "Aceptar",
                      });
                      if (!ok) return;
                      run(() =>
                        acceptTeamRegistrationAction({
                          registrationId: row.id,
                          groupId: groups.length > 0 ? groupById[row.id] : null,
                        }),
                      );
                    }}
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost text-red-400"
                    disabled={pending}
                    onClick={async () => {
                      const ok = await ask({
                        title: "Rechazar equipo",
                        message: `¿Rechazar a ${row.name}?`,
                        confirmLabel: "Rechazar",
                        danger: true,
                      });
                      if (!ok) return;
                      run(() => rejectTeamRegistrationAction(row.id));
                    }}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {acceptedRows.length > 0 ? (
        <div>
          <h3 className="display text-xl">Equipos aceptados</h3>
          <p className="mt-1 text-sm text-muted">
            El capitán entra con el nombre del equipo y el número de contacto como clave.
          </p>
          <ul className="mt-3 space-y-2">
            {acceptedRows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-white/10 px-4 py-3">
                <p className="font-bold">{row.name}</p>
                {row.whatsapp ? (
                  <p className="text-sm text-muted">
                    Usuario: {row.name} · Clave: {row.whatsapp}
                  </p>
                ) : (
                  <p className="text-sm text-muted">Sin número de capitán.</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
    </div>
  );
}
