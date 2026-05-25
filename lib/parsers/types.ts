export type ParsedTransaction = {
  bank_name: string;
  transaction_type: "expense" | "income";
  transaction_time: string | null;
  amount: number | null;
  currency: string;
  sender_name: string | null;
  sender_account: string | null;
  receiver_name: string | null;
  receiver_account: string | null;
  receiver_bank: string | null;
  description: string | null;
  fee: number;
};

export type BankReceiptParser = {
  bankName: string;
  canParse: (rawText: string) => boolean;
  parse: (rawText: string) => ParsedTransaction;
};
