export function normalizeWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `57${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

export function whatsappChatUrl(phone: string, text: string) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function registrationWhatsAppMessage(
  tournamentName: string,
  teamName: string,
  players: string[],
  captainWhatsApp?: string | null,
) {
  const roster = players.length > 0 ? ` Jugadores: ${players.join(", ")}.` : "";
  const contact = captainWhatsApp ? ` WhatsApp del capitán: ${captainWhatsApp}.` : "";
  return `Hola, quiero jugar el torneo ${tournamentName} con mi equipo ${teamName}.${roster}${contact}`;
}

export function postponeWhatsAppMessage(input: {
  tournamentName: string;
  teamName: string;
  homeTeam: string;
  awayTeam: string;
  currentWhen: string;
  proposedWhen?: string | null;
  reason?: string | null;
}) {
  const proposed = input.proposedWhen ? ` Propone: ${input.proposedWhen}.` : "";
  const reason = input.reason?.trim() ? ` Motivo: ${input.reason.trim()}.` : "";
  return `Hola, soy el capitán de ${input.teamName} en ${input.tournamentName}. Pido aplazar ${input.homeTeam} vs ${input.awayTeam} (ahora ${input.currentWhen}).${proposed}${reason}`;
}
