/**
 * Rule-based parser for common Techcombank transaction notification text.
 * Examples targeted: "So tien: +50,000 VND", "So tien giao dich: -50.000 VND".
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
    "nhận tiền",
    "tiền vào",
    "account credited",
    "credited"
  ];
  const outgoingKeywords = [
    "ghi nợ",
    "bị trừ",
    "chuyển tiền",
    "payment",
    "transfer",
    "debited"
  ];

  if (incomingKeywords.some((keyword) => normalizedText.includes(keyword))) {
    return "income";
  }

  if (outgoingKeywords.some((keyword) => normalizedText.includes(keyword))) {
    return "expense";
  }

  return "expense";
}

export function canParseTechcombankReceipt(rawText: string) {
  const text = rawText.toLowerCase();
  const promotionalKeywords = [
    "khuyến mãi",
    "ưu đãi",
    "giảm giá",
    "hoàn tiền",
    "cashback",
    "voucher",
    "campaign",
    "promotion",
    "quảng cáo",
    "thẻ tín dụng"
  ];
  const bankKeywords = [
    "techcombank",
    "techcom bank",
    "ngân hàng tmcp kỹ thương việt nam",
    "ngân hàng kỹ thương",
    "kỹ thương việt nam"
  ];
  const transactionKeywords = [
    "giao dịch",
    "tài khoản",
    "số tiền",
    "ghi có",
    "ghi nợ",
    "nhận tiền",
    "chuyển tiền",
    "account credited",
    "credited",
    "debited",
    "payment",
    "transfer"
  ];

  if (promotionalKeywords.some((keyword) => text.includes(keyword))) {
    return false;
  }

  const hasBankKeyword =
    bankKeywords.some((keyword) => text.includes(keyword)) ||
    /\btcb\b/i.test(rawText);
  const transactionKeywordCount = transactionKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  return hasBankKeyword && transactionKeywordCount >= 2;
}

export function parseTechcombankReceipt(rawText: string): ParsedTransaction {
  const text = rawText.replace(/\r\n/g, "\n");
  const amountText = findAmountText(text) ?? "";
  const amount = amountText ? parseAmount(amountText) : null;
  const rawTime =
    extract(text, [
      "Thời gian giao dịch",
      "Thoi gian giao dich",
      "Ngày giao dịch",
      "Ngay giao dich",
      "Transaction time",
      "Transaction date",
      "Date"
    ]) ?? findVietnameseTransactionDateTimeText(text);

  return {
    bank_name: "Techcombank",
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

export const techcombankParser: BankReceiptParser = {
  bankName: "Techcombank",
  canParse: canParseTechcombankReceipt,
  parse: parseTechcombankReceipt
};
