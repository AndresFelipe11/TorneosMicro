"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTournamentInfoAction } from "@/lib/actions/roster";

export function TournamentInfoEditor({
  tournamentId,
  name: initialName,
  description: initialDescription,
  registrationFee: initialFee,
  prizes: initialPrizes,
  rules: initialRules,
}: {
  tournamentId: string;
  name: string;
  description: string;
  registrationFee: string;
  prizes: string;
  rules: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [registrationFee, setRegistrationFee] = useState(initialFee);
  const [prizes, setPrizes] = useState(initialPrizes);
  const [rules, setRules] = useState(initialRules);

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription);
    setRegistrationFee(initialFee);
    setPrizes(initialPrizes);
    setRules(initialRules);
  }, [initialName, initialDescription, initialFee, initialPrizes, initialRules]);

  return (
    <form
      id="info"
      className="card mb-6 space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await updateTournamentInfoAction(tournamentId, {
            name,
            description,
            registrationFee,
            prizes,
            rules,
          });
          if (result.error) setError(result.error);
          else {
            setMessage("Información guardada.");
            router.refresh();
          }
        });
      }}
    >
      <div>
        <h2 className="display text-2xl">Nombre, descripción y reglamento</h2>
        <p className="text-sm text-muted">Se muestra en la ficha pública y al inscribirse.</p>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Nombre del torneo</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
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
        <span className="text-sm font-semibold">Reglamento</span>
        <textarea
          className="field min-h-40"
          placeholder="Duración de los partidos, tarjetas, W.O., inscripciones tardías y otras normas."
          value={rules}
          onChange={(e) => setRules(e.target.value)}
        />
      </label>
      {error ? <p className="font-semibold text-red-400">{error}</p> : null}
      {message ? <p className="font-semibold text-lime">{message}</p> : null}
      <button className="btn btn-dark" disabled={pending} type="submit">
        Guardar información
      </button>
    </form>
  );
}
