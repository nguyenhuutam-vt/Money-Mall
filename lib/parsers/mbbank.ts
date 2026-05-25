/**
 * Rule-based parser for common MB Bank transaction notification text.
 * No AI, no OCR, no external libraries.
 */

import type { BankReceiptParser, ParsedTransaction } from "./types";
import {
  findVietnameseTransactionDateTimeText,
  parseVietnameseTransactionDateTime
} from "../transactionDates";

type TransactionType = ParsedTransaction["transaction_type"];

function extract(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function findDateTimeText(text: string) {
  const labeledTime = extract(text, [
    "Thời gian giao dịch",
    "Thoi gian giao dich",
    "Ngày giao dịch",
    "Ngay giao dich",
    "Thời gian",
    "Thoi gian",
    "Transaction time",
    "Transaction date",
    "Date"
  ]);

  if (labeledTime) {
    return labeledTime;
  }

  return findVietnameseTransactionDateTimeText(text);
}

function findAmountText(text: string) {
  const amountLabels = [
    "Số tiền giao dịch",
    "So tien giao dich",
    "Số tiền",
    "So tien",
    "Amount",
    "Transaction amount",
    "Giá trị giao dịch",
    "Gia tri giao dich"
  ];

  for (const label of amountLabels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${escaped}\\s*:?\\s*(.+?)\\s*(?:\\n|$)`, "i");
    const match = text.match(pattern);

    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  const amountMatch = text.match(
    /(?:[+-]\s*)?(?:VND\s*)?\d[\d.,]*(?:\s*(?:VND|đ|₫))|(?:VND\s*)(?:[+-]\s*)?\d[\d.,]*/i
  );

  return amountMatch?.[0] ?? null;
}

function parseAmount(raw: string): number | null {
  const amountMatch = raw.match(
    /[+-]?\s*(?:VND\s*)?\d[\d.,]*|(?:VND\s*)[+-]?\s*\d[\d.,]*/i
  );

  if (!amountMatch) {
    return null;
  }

  const normalized = amountMatch[0]
    .replace(/VND|đ|₫/gi, "")
    .replace(/\s/g, "")
    .replace(/[.,]/g, "");
  const value = parseFloat(normalized);

  return isNaN(value) ? null : Math.abs(value);
}

function getAmountSign(raw: string) {
  if (raw.includes("+")) {
    return "plus";
  }

  if (raw.includes("-")) {
    return "minus";
  }

  return null;
}

function getTransactionType(text: string, amountText: string): TransactionType {
  const amountSign = getAmountSign(amountText);

  if (amountSign === "plus") {
    return "income";
  }

  if (amountSign === "minus") {
    return "expense";
  }

  const normalizedText = text.toLowerCase();
  const incomingKeywords = [
    "ghi có",
    "tiền vào",
    "nhận tiền",
    "cộng tiền",
    "credited",
    "received"
  ];
  const outgoingKeywords = [
    "ghi nợ",
    "bị trừ",
    "chuyển tiền",
    "thanh toán",
    "debited",
    "payment"
  ];

  if (incomingKeywords.some((keyword) => normalizedText.includes(keyword))) {
    return "income";
  }

  if (outgoingKeywords.some((keyword) => normalizedText.includes(keyword))) {
    return "expense";
  }

  return "expense";
}

export function canParseMbBankReceipt(rawText: string) {
  const text = rawText.toLowerCase();
  const promotionalKeywords = [
    "khuyến mãi",
    "ưu đãi",
    "giảm giá",
    "voucher",
    "cashback",
    "hoàn tiền",
    "promotion",
    "quảng cáo",
    "thẻ tín dụng"
  ];
  const bankKeywords = [
    "mb bank",
    "mbbank",
    "military bank",
    "ngân hàng quân đội"
  ];
  const transactionKeywords = [
    "giao dịch",
    "tài khoản",
    "số tiền",
    "ghi có",
    "ghi nợ",
    "tiền vào",
    "nhận tiền",
    "cộng tiền",
    "chuyển tiền",
    "thanh toán",
    "credited",
    "received",
    "debited",
    "payment"
  ];

  if (promotionalKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }

  const hasBankKeyword =
    bankKeywords.some((keyword) => text.includes(keyword)) ||
    /\bmbb\b/i.test(rawText);
  const transactionKeywordCount = transactionKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  return hasBankKeyword && transactionKeywordCount >= 2;
}

export function parseMbBankReceipt(rawText: string): ParsedTransaction {
  const text = rawText.replace(/\r\n/g, "\n");
  const amountText = findAmountText(text) ?? "";
  const amount = amountText ? parseAmount(amountText) : null;
  const rawTime = findDateTimeText(text);

  return {
    bank_name: "MB Bank",
    transaction_type: amountText
      ? getTransactionType(text, amountText)
      : "expense",
    transaction_time: parseVietnameseTransactionDateTime(rawTime),
    amount,
    currency: "VND",
    sender_name: extract(text, [
      "Tên người gửi",
      "Ten nguoi gui",
      "Người gửi",
      "Nguoi gui",
      "Người chuyển",
      "Nguoi chuyen",
      "Sender",
      "From"
    ]),
    sender_account: extract(text, [
      "Tài khoản nguồn",
      "Tai khoan nguon",
      "Tài khoản chuyển",
      "Tai khoan chuyen",
      "Số tài khoản nguồn",
      "So tai khoan nguon",
      "From account",
      "Debit account"
    ]),
    receiver_name: extract(text, [
      "Tên người nhận",
      "Ten nguoi nhan",
      "Người nhận",
      "Nguoi nhan",
      "Người thụ hưởng",
      "Nguoi thu huong",
      "Beneficiary",
      "Receiver"
    ]),
    receiver_account: extract(text, [
      "Tài khoản nhận",
      "Tai khoan nhan",
      "Tài khoản thụ hưởng",
      "Tai khoan thu huong",
      "Số tài khoản nhận",
      "So tai khoan nhan",
      "To account",
      "Credit account"
    ]),
    receiver_bank: null,
    description: extract(text, [
      "Nội dung giao dịch",
      "Noi dung giao dich",
      "Nội dung",
      "Noi dung",
      "Diễn giải",
      "Dien giai",
      "Description",
      "Remark"
    ]),
    fee: 0
  };
}

export const mbBankParser: BankReceiptParser = {
  bankName: "MB Bank",
  canParse: canParseMbBankReceipt,
  parse: parseMbBankReceipt
};
