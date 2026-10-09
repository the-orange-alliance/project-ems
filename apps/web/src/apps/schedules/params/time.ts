import dayjs, { Dayjs } from 'dayjs';
import { DateTime } from 'luxon';

export const CLOCK_FORMAT = 'h:mm a';

export const formatClock = (time: DateTime | number): string =>
  (typeof time === 'number' ? DateTime.fromMillis(time) : time).toFormat(
    CLOCK_FORMAT
  );

/** The ISO string as a dayjs value for antd pickers; null when it isn't a valid time. */
export const toPickerValue = (iso: string): Dayjs | null => {
  const time = DateTime.fromISO(iso);
  return time.isValid ? dayjs(time.toJSDate()) : null;
};

/** `iso` with its time of day replaced by the picker's. */
export const withClock = (iso: string, picked: Dayjs): string =>
  DateTime.fromISO(iso)
    .set({
      hour: picked.hour(),
      minute: picked.minute(),
      second: 0,
      millisecond: 0
    })
    .toISO() ?? iso;

/** `iso` moved to the picker's calendar date, keeping its time of day. */
export const withDate = (iso: string, picked: Dayjs): string =>
  DateTime.fromISO(iso)
    .set({ year: picked.year(), month: picked.month() + 1, day: picked.date() })
    .toISO() ?? iso;

export const shiftDays = (iso: string, days: number): string =>
  DateTime.fromISO(iso).plus({ days }).toISO() ?? iso;
