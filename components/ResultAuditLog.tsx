import { formatDateTime, roleLabel, scoreLabel } from "@/lib/format";

type ResultLog = {
  id: string;
  action: "SAVED" | "RESET";
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  status: "SCHEDULED" | "PLAYED" | "WALKOVER" | null;
  createdAt: Date;
  userName: string;
  user: { name: string; role: string } | null;
  match?: {
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
};

export function ResultAuditLog({
  logs,
  showMatch = false,
}: {
  logs: ResultLog[];
  showMatch?: boolean;
}) {
  return (
    <section className="card space-y-3 p-5">
      <div>
        <h2 className="display text-2xl">Registro de planilla</h2>
        <p className="text-sm text-muted">Quién cargó o corrigió cada marcador.</p>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay cambios de resultado.</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const score =
              log.action === "RESET"
                ? "Resultado anulado"
                : scoreLabel(log.homeScore, log.awayScore, {
                    homePenalties: log.homePenalties,
                    awayPenalties: log.awayPenalties,
                    walkover: log.status === "WALKOVER",
                  });
            return (
              <li key={log.id} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
                <p className="font-semibold">
                  {log.user?.name ?? log.userName}
                  <span className="ml-2 text-xs font-bold uppercase tracking-wide text-muted">
                    {log.user ? roleLabel(log.user.role) : "Usuario eliminado"}
                  </span>
                </p>
                <p className="text-sm text-muted" suppressHydrationWarning>
                  {showMatch && log.match
                    ? `${log.match.homeTeam.name} vs ${log.match.awayTeam.name} · `
                    : ""}
                  {score} · {formatDateTime(log.createdAt)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
