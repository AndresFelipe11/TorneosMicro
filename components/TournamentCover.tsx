import type { ReactNode } from "react";

const SIZE = {
  card: "h-24 w-24 sm:h-28 sm:w-28",
  hero: "h-24 w-24 sm:h-36 sm:w-36 lg:h-40 lg:w-40",
  page: "h-24 w-24 sm:h-32 sm:w-32",
} as const;

export function TournamentCover({
  src,
  alt,
  variant = "hero",
}: {
  src?: string | null;
  alt: string;
  variant?: "hero" | "card" | "page";
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`${SIZE[variant]} shrink-0 rounded-2xl border border-white/10 bg-black object-contain`}
    />
  );
}

export function TournamentHeading({
  src,
  name,
  kicker,
  details,
  actions,
  description,
}: {
  src?: string | null;
  name: string;
  kicker?: string;
  details?: ReactNode;
  actions?: ReactNode;
  description?: string | null;
}) {
  const text = description?.trim() ?? "";

  return (
    <header className="card mb-4 p-4 sm:p-5">
      <div className="flex items-start gap-3 sm:gap-5">
        <TournamentCover src={src} alt={name} />
        <div className="min-w-0 flex-1">
          {kicker ? (
            <p className="text-xs font-bold uppercase tracking-widest text-muted sm:text-sm">{kicker}</p>
          ) : null}
          <h1 className="display text-2xl leading-tight sm:text-4xl">{name}</h1>
          {details ? <div className="mt-1 text-sm text-muted sm:text-base">{details}</div> : null}
          {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
          {text ? (
            <p className="mt-3 hidden max-w-2xl text-sm leading-relaxed text-cream/85 sm:block sm:text-base">
              {text}
            </p>
          ) : null}
        </div>
      </div>
      {text ? (
        <p className="mt-3 text-sm leading-relaxed text-cream/85 sm:hidden">{text}</p>
      ) : null}
    </header>
  );
}
