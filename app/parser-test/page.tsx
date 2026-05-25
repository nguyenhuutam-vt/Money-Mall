"use client";

import { useState } from "react";
import { parseBankReceipt, type ParsedBankReceipt } from "@/lib/parsers";

const TEXTAREA_CLASS =
  "mt-2 w-full resize-y rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 font-mono text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10";

function formatAmount(amount: number | null, currency: string) {
  if (amount === null) {
    return "Không tìm thấy";
  }

  return `${new Intl.NumberFormat("en-US").format(amount)} ${currency}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Không tìm thấy";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "Không tìm thấy";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "Không tìm thấy";
}

function transactionTypeLabel(type: ParsedBankReceipt["transaction_type"]) {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

export default function ParserTestPage() {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedBankReceipt | null>(null);
  const [parseError, setParseError] = useState("");

  function handleParse() {
    const result = parseBankReceipt(rawText);

    if (!result) {
      setParsed(null);
      setParseError("Chưa nhận diện được ngân hàng phù hợp.");
      return;
    }

    setParsed(result);
    setParseError("");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase text-emerald">
            Debug / Testing
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Kiểm tra parser ngân hàng
          </h1>
          <p className="mt-3 leading-7 text-ink/65">
            Dán raw email text để xem parser nào nhận diện và trích xuất dữ
            liệu.
          </p>
        </div>

        <div className="mt-6 rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          <label className="block">
            <span className="text-sm font-semibold text-ink">
              Raw email text
            </span>
            <textarea
              rows={14}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              className={TEXTAREA_CLASS}
              placeholder={"Dán nội dung email ngân hàng vào đây...\n\nVí dụ:\nTechcombank\nGiao dịch ghi Có tài khoản\nSố tiền: +50,000 VND\nThời gian giao dịch: 25/05/2026 10:15:00"}
            />
          </label>

          <button
            type="button"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="mt-5 w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
          >
            Phân tích
          </button>

          {parseError ? (
            <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {parseError}
            </p>
          ) : null}
        </div>

        {parsed ? (
          <div className="mt-6 rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald px-3 py-1 text-xs font-semibold text-white">
                {parsed.bank_name}
              </span>
              <span className="rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                {transactionTypeLabel(parsed.transaction_type)}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 text-sm text-ink/70 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-ink">Detected bank</dt>
                <dd className="mt-1 break-words">{parsed.bank_name}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Transaction type</dt>
                <dd className="mt-1">
                  {transactionTypeLabel(parsed.transaction_type)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Amount</dt>
                <dd className="mt-1">
                  {formatAmount(parsed.amount, parsed.currency)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Transaction time</dt>
                <dd className="mt-1">{formatDate(parsed.transaction_time)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Sender name</dt>
                <dd className="mt-1 break-words">
                  {displayValue(parsed.sender_name)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Sender account</dt>
                <dd className="mt-1 break-words">
                  {displayValue(parsed.sender_account)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Receiver name</dt>
                <dd className="mt-1 break-words">
                  {displayValue(parsed.receiver_name)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">Receiver account</dt>
                <dd className="mt-1 break-words">
                  {displayValue(parsed.receiver_account)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-ink">Description</dt>
                <dd className="mt-1 break-words">
                  {displayValue(parsed.description)}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </section>
    </main>
  );
}

