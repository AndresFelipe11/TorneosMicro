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
  if (variant === "card") {
    return (
      <img
        src={src}
        alt={alt}
        className="mb-3 aspect-square w-full rounded-xl object-cover"
      />
    );
  }
  if (variant === "page") {
    return (
      <img
        src={src}
        alt={alt}
        className="mb-4 mx-auto w-full max-w-xs rounded-2xl border border-white/10 shadow-lg"
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="mx-auto w-full max-w-[220px] shrink-0 rounded-2xl border border-white/10 shadow-lg sm:mx-0"
    />
  );
}
