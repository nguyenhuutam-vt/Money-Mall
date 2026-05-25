import { mbBankParser } from "./mbbank";
import { techcombankParser } from "./techcombank";
import type { BankReceiptParser, ParsedTransaction } from "./types";
import { vietcombankParser } from "./vietcombank";

export type { BankReceiptParser, ParsedTransaction } from "./types";

export type ParsedBankReceipt = ParsedTransaction & {
  parser_name: string;
};

const bankParsers: BankReceiptParser[] = [
  techcombankParser,
  mbBankParser,
  vietcombankParser
];

export function parseBankReceipt(rawText: string): ParsedBankReceipt | null {
  const parser = bankParsers.find((bankParser) =>
    bankParser.canParse(rawText)
  );

  if (!parser) {
    return null;
  }

  return {
    ...parser.parse(rawText),
    parser_name: parser.bankName
  };
}

