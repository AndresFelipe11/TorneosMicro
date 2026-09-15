import Link from "next/link";

export function OpenRegistrationBanner({
  href,
  fee,
}: {
  href: string;
  fee?: string | null;
}) {
  return (
    <div className="mb-6 rounded-3xl border-2 border-lime bg-lime/15 p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime">Inscripciones abiertas</p>
        <p className="display mt-1 text-2xl leading-tight sm:text-3xl">Inscribe tu equipo</p>
        <p className="mt-1 text-sm text-cream/85">
          Llena el formulario y el administrador te confirma por WhatsApp.
          {fee?.trim() ? ` Inscripción: ${fee.trim()}.` : ""}
        </p>
      </div>
      <Link href={href} className="btn btn-lime mt-4 w-full shrink-0 sm:mt-0 sm:w-auto">
        Inscribir equipo
      </Link>
    </div>
  );
}
