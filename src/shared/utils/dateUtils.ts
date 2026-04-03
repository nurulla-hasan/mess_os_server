export const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

export const getDhakaNow = (): Date => {
  return new Date(Date.now() + DHAKA_OFFSET_MS);
};

export const getMonthBoundariesDhaka = (month: number, year: number) => {
  // Asia/Dhaka is UTC+6
  const utcStartOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const start = new Date(utcStartOfMonth.getTime() - DHAKA_OFFSET_MS);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  
  const utcStartOfNextMonth = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0, 0));
  const end = new Date(utcStartOfNextMonth.getTime() - DHAKA_OFFSET_MS - 1);

  return { start, end };
};

export const normalizeMealDate = (inputDate: Date | string): Date => {
  const absoluteTime = new Date(inputDate).getTime();
  const dhakaMs = absoluteTime + DHAKA_OFFSET_MS;
  const dhakaDateObject = new Date(dhakaMs);

  const normalizedDhakaUtc = new Date(Date.UTC(
    dhakaDateObject.getUTCFullYear(),
    dhakaDateObject.getUTCMonth(),
    dhakaDateObject.getUTCDate(),
    0, 0, 0, 0
  ));

  return new Date(normalizedDhakaUtc.getTime() - DHAKA_OFFSET_MS);
};

export const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
};
