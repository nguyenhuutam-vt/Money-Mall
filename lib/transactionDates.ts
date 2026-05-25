type TransactionDateFields = {
  transaction_time?: string | null;
  created_at?: string | null;
};

const VIETNAM_OFFSET_MINUTES = 7 * 60;

function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidTransactionDate(
  value: string | Date | null | undefined
) {
  const date = toDate(value);

  return Boolean(date && date.getUTCFullYear() > 1970);
}

export function getEffectiveTransactionDate(
  transaction: TransactionDateFields
) {
  if (isValidTransactionDate(transaction.transaction_time)) {
    return new Date(transaction.transaction_time as string).toISOString();
  }

  if (isValidTransactionDate(transaction.created_at)) {
    return new Date(transaction.created_at as string).toISOString();
  }

  return null;
}

export function getVietnamMonthValue(value: string | Date | null | undefined) {
  const date = toDate(value);

  if (!date) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : null;
}

function toVietnamIsoDateTime(
  yearText: string,
  monthText: string,
  dayText: string,
  hourText = "00",
  minuteText = "00",
  secondText = "00"
) {
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const utcTime = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute - VIETNAM_OFFSET_MINUTES,
    second
  );
  const vietnamDate = new Date(utcTime + VIETNAM_OFFSET_MINUTES * 60 * 1000);

  if (
    vietnamDate.getUTCFullYear() !== year ||
    vietnamDate.getUTCMonth() !== month - 1 ||
    vietnamDate.getUTCDate() !== day ||
    vietnamDate.getUTCHours() !== hour ||
    vietnamDate.getUTCMinutes() !== minute ||
    vietnamDate.getUTCSeconds() !== second ||
    year <= 1970
  ) {
    return null;
  }

  return new Date(utcTime).toISOString();
}

export function parseVietnameseTransactionDateTime(raw: string | null) {
  if (!raw) {
    return null;
  }

  const text = raw.replace(/\s+/g, " ").trim();

  const timeFirstMatch = text.match(
    /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s+[^\d\n\r]{1,40})?\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i
  );

  if (timeFirstMatch) {
    const [, hour, minute, second = "00", day, month, year] = timeFirstMatch;
    return toVietnamIsoDateTime(year, month, day, hour, minute, second);
  }

  const dmyMatch = text.match(
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
  );

  if (dmyMatch) {
    const [, day, month, year, hour = "00", minute = "00", second = "00"] =
      dmyMatch;
    return toVietnamIsoDateTime(year, month, day, hour, minute, second);
  }

  const ymdMatch = text.match(
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i
  );

  if (ymdMatch) {
    const [, year, month, day, hour = "00", minute = "00", second = "00"] =
      ymdMatch;
    return toVietnamIsoDateTime(year, month, day, hour, minute, second);
  }

  return null;
}

export function findVietnameseTransactionDateTimeText(text: string) {
  const normalizedText = text.replace(/\s+/g, " ");
  const dateTimeMatch =
    normalizedText.match(
      /\d{1,2}:\d{2}(?::\d{2})?(?:\s+[^\d\n\r]{1,40})?\s+\d{1,2}[/-]\d{1,2}[/-]\d{4}/i
    ) ??
    normalizedText.match(
      /\d{1,2}[/-]\d{1,2}[/-]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/i
    ) ??
    normalizedText.match(
      /\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:[ T]+\d{1,2}:\d{2}(?::\d{2})?)?/i
    );

  return dateTimeMatch?.[0] ?? null;
}
