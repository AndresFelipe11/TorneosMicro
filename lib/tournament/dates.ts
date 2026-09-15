const BOGOTA_OFFSET = "-05:00";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function parseTime(startTime: string): { hours: number; minutes: number } {
  const [hours, minutes] = startTime.split(":").map(Number);
  return { hours: hours || 0, minutes: minutes || 0 };
}

export function toBogotaDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function bogotaDateTime(isoDate: string, hours: number, minutes: number): Date {
  return new Date(`${isoDate}T${pad(hours)}:${pad(minutes)}:00${BOGOTA_OFFSET}`);
}

export function weekdayBogota(isoDate: string): number {
  return bogotaDateTime(isoDate, 12, 0).getUTCDay();
}

export function dayKey(date: Date): string {
  return toBogotaDateString(date);
}

export function toBogotaDateTimeLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fromBogotaDateTimeLocal(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return bogotaDateTime(match[1], Number(match[2]), Number(match[3]));
}

export function scheduleFromDate(startDate: string): Date {
  const todayKey = toBogotaDateString(new Date());
  return parseLocalDate(startDate > todayKey ? startDate : todayKey);
}

export function startOfNextWeekBogota(from = new Date()): Date {
  const today = toBogotaDateString(from);
  const weekday = weekdayBogota(today);
  const daysUntilNextMonday = weekday === 0 ? 1 : 8 - weekday;
  let cursor = today;
  for (let i = 0; i < daysUntilNextMonday; i++) {
    cursor = nextDateString(cursor);
  }
  return parseLocalDate(cursor);
}

export function nextDateString(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function suggestedPostponeLocal(
  matchAt: Date,
  window?: "SAME_DAY" | "TOMORROW" | "THIS_WEEK" | "NEXT_WEEK" | null,
): string {
  const current = toBogotaDateTimeLocal(matchAt);
  const [date, time] = current.split("T");
  if (window === "TOMORROW") return `${nextDateString(date)}T${time}`;
  if (window === "NEXT_WEEK") {
    return `${toBogotaDateString(startOfNextWeekBogota(matchAt))}T${time}`;
  }
  return current;
}

export function buildSlots(config: {
  startDate: string;
  endDate: string;
  playingDays: number[];
  maxMatchesPerDay: number;
  matchDurationMinutes: number;
  startTime: string;
  fromDate?: Date;
}): Date[] {
  const { hours, minutes } = parseTime(config.startTime);
  const gap = 60;
  const fromKey = config.fromDate ? toBogotaDateString(config.fromDate) : config.startDate;
  const slots: Date[] = [];

  for (let cursor = config.startDate; cursor <= config.endDate; cursor = nextDateString(cursor)) {
    if (cursor < fromKey) continue;
    if (!config.playingDays.includes(weekdayBogota(cursor))) continue;
    for (let i = 0; i < config.maxMatchesPerDay; i++) {
      const extra = i * gap;
      const totalMinutes = hours * 60 + minutes + extra;
      slots.push(bogotaDateTime(cursor, Math.floor(totalMinutes / 60), totalMinutes % 60));
    }
  }

  return slots;
}
