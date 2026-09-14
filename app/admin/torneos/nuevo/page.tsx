import { requireGlobalAdmin } from "@/lib/authz";
import { Wizard } from "./Wizard";

export default async function NewTournamentPage() {
  await requireGlobalAdmin();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="display text-4xl">Nuevo torneo</h1>
      <p className="mb-6 text-muted">
        Define el formato, los equipos y las fechas. El calendario se arma con un partido por cruce, sin ida y vuelta.
      </p>
      <Wizard />
    </div>
  );
}
