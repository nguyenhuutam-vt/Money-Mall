/**
 * Rule-based parser for Vietcombank transfer receipt text.
 * Supports both Vietnamese and English receipt labels.
 * No AI, no OCR, no external libraries.
 */

export type VietcombankParsedTransaction = {
  bank_name: "Vietcombank";
  transaction_type: "expense";
  currency: string;
  transaction_time: string | null;
  amount: number | null;
  fee: number;
  sender_name: string | null;
  sender_account: string | null;
  receiver_name: string | null;
  receiver_account: string | null;
  receiver_bank: string | null;
  description: string | null;
};

/**
 * Extract a value following a label on the same or next line.
 * Matches: "Label: value" or "Label\nvalue"
 */
function extract(text: string, labels: string[]): string | null {
  for (const label of labels) {
    // Escape special regex characters in the label
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match label followed by colon+whitespace+value on same line,
    // or label on its own line followed by value on next line.
    const pattern = new RegExp(
      `${escaped}\\s*[:\\-]?\\s*(.+?)\\s*(?:\\n|$)`,
      "i"
    );
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Parse a Vietnamese/English date-time string into an ISO 8601 string.
 * Handles formats like:
 *   "25/12/2024 14:30:00"
 *   "25-12-2024 14:30"
 *   "2024-12-25 14:30:00"
 */
function parseDateTime(raw: string): string | null {
  if (!raw) return null;

  // dd/mm/yyyy hh:mm:ss  or  dd-mm-yyyy hh:mm
  const dmyMatch = raw.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (dmyMatch) {
    const [, d, m, y, h, min, s = "00"] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${s}`;
  }

  // yyyy-mm-dd hh:mm:ss
  const ymdMatch = raw.match(
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );
  if (ymdMatch) {
    const [, y, m, d, h, min, s = "00"] = ymdMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${min}:${s}`;
  }

  return null;
}

/**
 * Parse an amount string, stripping thousand separators and currency symbols.
 * Handles "1.500.000 VND", "1,500,000", "1500000".
 */
function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Remove currency labels and whitespace
  const cleaned = raw.replace(/VND|đ|₫/gi, "").trim();
  // Remove dots/commas used as thousand separators
  // Detect: if last separator is followed by exactly 3 digits at end → thousand sep
  const normalized = cleaned.replace(/[.,]/g, "");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Parse raw Vietcombank receipt text and return a normalized transaction object.
 */
export function parseVietcombankReceipt(
  raw: string
): VietcombankParsedTransaction {
  const text = raw.replace(/\r\n/g, "\n");

  const rawTime = extract(text, [
    "Ngày, giờ giao dịch",
    "Ngày giờ giao dịch",
    "Trans. Date, Time",
    "Trans. Date",
    "Transaction Date",
  ]);

  const rawAmount = extract(text, ["Amount", "Số tiền"]);

  const rawFee = extract(text, [
    "Charge Amount",
    "Phí giao dịch",
    "Phí chuyển tiền",
    "Fee",
  ]);

  const senderName = extract(text, [
    "Remitter's name",
    "Remitter Name",
    "Tên người gửi",
    "Người gửi",
  ]);

  const senderAccount = extract(text, [
    "Debit Account",
    "Số tài khoản ghi nợ",
    "Tài khoản ghi nợ",
    "Tài khoản nguồn",
    "From Account",
  ]);

  const receiverName = extract(text, [
    "Beneficiary Name",
    "Beneficiary's Name",
    "Tên người nhận",
    "Người nhận",
  ]);

  const receiverAccount = extract(text, [
    "Credit Account",
    "Số tài khoản ghi có",
    "Tài khoản ghi có",
    "Tài khoản đích",
    "To Account",
  ]);

  const receiverBank = extract(text, [
    "Beneficiary Bank Name",
    "Beneficiary Bank",
    "Ngân hàng người nhận",
    "Ngân hàng thụ hưởng",
  ]);

  const description = extract(text, [
    "Details of Payment",
    "Payment Details",
    "Nội dung chuyển tiền",
    "Nội dung",
    "Ghi chú",
  ]);

  return {
    bank_name: "Vietcombank",
    transaction_type: "expense",
    currency: "VND",
    transaction_time: rawTime ? parseDateTime(rawTime) : null,
    amount: rawAmount ? parseAmount(rawAmount) : null,
    fee: rawFee ? (parseAmount(rawFee) ?? 0) : 0,
    sender_name: senderName,
    sender_account: senderAccount,
    receiver_name: receiverName,
    receiver_account: receiverAccount,
    receiver_bank: receiverBank,
    description: description,
  };
}
