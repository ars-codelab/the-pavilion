export interface CricketDate {
  year: number;
  month: number;
  day: number;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1] ?? 0;
}

export function isValidDate(date: CricketDate): boolean {
  if (date.month < 1 || date.month > 12) return false;
  if (date.day < 1 || date.day > daysInMonth(date.year, date.month)) return false;
  return Number.isInteger(date.year);
}

export function makeDate(year: number, month: number, day: number): CricketDate {
  const date = { year, month, day };
  if (!isValidDate(date)) throw new RangeError(`invalid date ${year}-${month}-${day}`);
  return date;
}

function daysFromCivil(year: number, month: number, day: number): number {
  const y = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(epoch: number): CricketDate {
  const z = epoch + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  return { year: y + (month <= 2 ? 1 : 0), month, day };
}

export function toEpochDay(date: CricketDate): number {
  return daysFromCivil(date.year, date.month, date.day);
}

export function fromEpochDay(epoch: number): CricketDate {
  return civilFromDays(Math.trunc(epoch));
}

export function addDays(date: CricketDate, days: number): CricketDate {
  return fromEpochDay(toEpochDay(date) + days);
}

export function daysBetween(from: CricketDate, to: CricketDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

export function compareDates(a: CricketDate, b: CricketDate): number {
  return toEpochDay(a) - toEpochDay(b);
}

export function isBefore(a: CricketDate, b: CricketDate): boolean {
  return compareDates(a, b) < 0;
}

export function formatDate(date: CricketDate): string {
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${date.year}-${month}-${day}`;
}

/** The season label: seasons run September to August, so Jan-Aug belong to the prior year. */
export function seasonOf(date: CricketDate): number {
  return date.month >= 9 ? date.year : date.year - 1;
}
