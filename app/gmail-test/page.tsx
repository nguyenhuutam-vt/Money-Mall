"use client";

import { useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import { isValidTransactionDate } from "@/lib/transactionDates";
import {
  parseVietcombankReceipt,
  type VietcombankParsedTransaction
} from "@/lib/parsers/vietcombank";

type GmailListMessage = {
  id: string;
  threadId?: string;
};

type GmailListResponse = {
  messages?: GmailListMessage[];
  error?: {
    message?: string;
  };
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
};

type GmailDetailResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  payload?: GmailMessagePart;
  error?: {
    message?: string;
  };
};

type GmailMessage = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  rawText: string;
  bodyPreview: string;
  isLikelyVietcombankReceipt: boolean;
  parsedTransaction: VietcombankParsedTransaction | null;
};

type SaveStatus = {
  type: "success" | "error";
  message: string;
};

type ReceiptFilterResult = {
  isReceipt: boolean;
  reason?: string;
};

type SkippedEmail = {
  id: string;
  subject: string;
  from: string;
  reason: string;
};

const GMAIL_SEARCH_QUERY =
  'newer_than:365d (Vietcombank OR "Biên lai" OR "Payment Receipt" OR "chuyển tiền" OR "Amount")';
const RECEIPT_SCORE_THRESHOLD = 3;

function getGmailErrorMessage(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }

  return "";
}

function decodeBase64Url(data: string) {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const binaryText = window.atob(paddedBase64);
    const bytes = Uint8Array.from(binaryText, (character) =>
      character.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function collectBodyText(
  part: GmailMessagePart | undefined,
  wantedMimeType: "text/plain" | "text/html"
) {
  if (!part) {
    return [];
  }

  const bodyTexts: string[] = [];

  if (part.mimeType === wantedMimeType && part.body?.data) {
    const decodedText = decodeBase64Url(part.body.data);

    if (decodedText) {
      bodyTexts.push(decodedText);
    }
  }

  for (const childPart of part.parts ?? []) {
    bodyTexts.push(...collectBodyText(childPart, wantedMimeType));
  }

  return bodyTexts;
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function cleanBodyPreview(text: string) {
  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (cleanedText.length <= 500) {
    return cleanedText;
  }

  return `${cleanedText.slice(0, 500)}...`;
}

function getHeaderValue(headers: GmailHeader[] | undefined, name: string) {
  return (
    headers?.find(
      (header) => header.name?.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function getEmailBodyText(payload: GmailMessagePart | undefined) {
  const plainText = collectBodyText(payload, "text/plain").join(" ");

  if (plainText) {
    return plainText;
  }

  const htmlText = collectBodyText(payload, "text/html").join(" ");

  if (htmlText) {
    return stripHtml(htmlText);
  }

  return "";
}

function buildRawText(
  subject: string,
  from: string,
  snippet: string,
  bodyText: string
) {
  return [subject, from, snippet, bodyText].filter(Boolean).join("\n");
}

function getVietcombankReceiptFilter(rawText: string): ReceiptFilterResult {
  const text = rawText.toLowerCase();
  const promotionalKeywords = [
    "[qc]",
    "qc",
    "khuyến mãi",
    "ưu đãi",
    "giảm giá",
    "giảm ngay",
    "mua sắm",
    "voucher",
    "hoàn tiền",
    "cashback",
    "thẻ tín dụng",
    "visa",
    "mastercard",
    "duty free",
    "campaign",
    "promotion",
    "promo",
    "newsletter",
    "marketing",
    "quảng cáo"
  ];
  const strongReceiptKeywords = [
    "biên lai chuyển tiền",
    "payment receipt",
    "ngày, giờ giao dịch",
    "trans. date, time",
    "số lệnh giao dịch",
    "order number",
    "tài khoản nguồn",
    "debit account",
    "tài khoản người hưởng",
    "credit account",
    "tên người hưởng",
    "beneficiary name",
    "tên ngân hàng hưởng",
    "beneficiary bank name",
    "số tiền",
    "amount",
    "nội dung chuyển tiền",
    "details of payment"
  ];

  const hasPromotionalSignal = promotionalKeywords.some((keyword) =>
    text.includes(keyword)
  );
  if (hasPromotionalSignal) {
    return {
      isReceipt: false,
      reason: "Email quảng cáo/khuyến mãi, không phải biên lai"
    };
  }

  const receiptScore = strongReceiptKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  return {
    isReceipt: receiptScore >= RECEIPT_SCORE_THRESHOLD,
    reason: "Không đủ dấu hiệu biên lai chuyển khoản"
  };
}

function formatAmount(amount: number | null) {
  if (amount === null) {
    return "Chưa có";
  }

  return `${new Intl.NumberFormat("en-US").format(amount)} VND`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Chưa có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "Chưa có";
}

function resolveTransactionTime(parsedTime: string | null, emailDate: string) {
  if (isValidTransactionDate(parsedTime)) {
    return new Date(parsedTime as string).toISOString();
  }

  if (emailDate !== "(Không rõ ngày)" && isValidTransactionDate(emailDate)) {
    return new Date(emailDate).toISOString();
  }

  return null;
}

export default function GmailTestPage() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [skippedEmails, setSkippedEmails] = useState<SkippedEmail[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>(
    {}
  );

  async function handleSearch() {
    setIsSearching(true);
    setErrorMessage("");
    setMessages([]);
    setSkippedEmails([]);
    setHasSearched(false);
    setSaveStatuses({});

    const configError = getSupabaseConfigError();

    if (configError) {
      setErrorMessage(
        "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
      );
      setIsSearching(false);
      return;
    }

    const { data, error } = await getSupabaseClient().auth.getSession();
    const session = data.session;

    if (error || !session) {
      setErrorMessage("Vui lòng đăng nhập để kiểm tra quyền đọc Gmail.");
      setIsSearching(false);
      return;
    }

    const providerToken = session.provider_token;

    if (!providerToken) {
      setErrorMessage(
        "Không tìm thấy quyền đọc Gmail. Vui lòng đăng xuất rồi đăng nhập Google lại."
      );
      setIsSearching(false);
      return;
    }

    const params = new URLSearchParams({
      q: GMAIL_SEARCH_QUERY,
      maxResults: "10"
    });

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${providerToken}`
          }
        }
      );
      const responseData = (await response.json()) as unknown;

      if (!response.ok) {
        const gmailErrorMessage = getGmailErrorMessage(responseData);
        setErrorMessage(
          gmailErrorMessage
            ? `Gmail API trả về lỗi: ${gmailErrorMessage}`
            : "Không thể gọi Gmail API. Vui lòng thử lại."
        );
        return;
      }

      const gmailData = responseData as GmailListResponse;
      const listMessages = gmailData.messages ?? [];

      if (listMessages.length === 0) {
        setMessages([]);
        setHasSearched(true);
        return;
      }

      const detailedMessages: GmailMessage[] = [];
      const skippedMessages: SkippedEmail[] = [];

      for (const message of listMessages) {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: {
              Authorization: `Bearer ${providerToken}`
            }
          }
        );
        const detailResponseData = (await detailResponse.json()) as unknown;

        if (!detailResponse.ok) {
          const gmailErrorMessage = getGmailErrorMessage(detailResponseData);
          setErrorMessage(
            gmailErrorMessage
              ? `Không thể lấy chi tiết email: ${gmailErrorMessage}`
              : "Không thể lấy chi tiết email từ Gmail API. Vui lòng thử lại."
          );
          return;
        }

        const detailData = detailResponseData as GmailDetailResponse;
        const headers = detailData.payload?.headers;
        const subject =
          getHeaderValue(headers, "Subject") || "(Không có tiêu đề)";
        const from = getHeaderValue(headers, "From") || "(Không rõ người gửi)";
        const snippet = detailData.snippet ?? "";
        const bodyText = getEmailBodyText(detailData.payload);
        const rawText = buildRawText(subject, from, snippet, bodyText);
        const receiptFilter = getVietcombankReceiptFilter(rawText);

        if (!receiptFilter.isReceipt) {
          skippedMessages.push({
            id: detailData.id ?? message.id,
            subject,
            from,
            reason: receiptFilter.reason ?? "Không phải biên lai phù hợp"
          });
          continue;
        }

        detailedMessages.push({
          id: detailData.id ?? message.id,
          threadId: detailData.threadId ?? message.threadId ?? "",
          subject,
          from,
          date: getHeaderValue(headers, "Date") || "(Không rõ ngày)",
          snippet,
          rawText,
          bodyPreview: cleanBodyPreview(bodyText),
          isLikelyVietcombankReceipt: true,
          parsedTransaction: parseVietcombankReceipt(rawText)
        });
      }

      setMessages(detailedMessages);
      setSkippedEmails(skippedMessages);
      setHasSearched(true);
    } catch {
      setErrorMessage("Không thể kết nối Gmail API. Vui lòng thử lại.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSaveTransaction(message: GmailMessage) {
    const parsed = message.parsedTransaction;

    if (!parsed?.amount) {
      return;
    }

    setSaveStatuses((current) => {
      const nextStatuses = { ...current };
      delete nextStatuses[message.id];
      return nextStatuses;
    });

    const configError = getSupabaseConfigError();

    if (configError) {
      setSaveStatuses((current) => ({
        ...current,
        [message.id]: {
          type: "error",
          message: "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
        }
      }));
      return;
    }

    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setSaveStatuses((current) => ({
        ...current,
        [message.id]: {
          type: "error",
          message: "Vui lòng đăng nhập để lưu giao dịch."
        }
      }));
      return;
    }

    setSavingMessageId(message.id);

    const { error } = await supabase.from("transactions").insert({
      amount: parsed.amount,
      user_id: user.id,
      transaction_time: resolveTransactionTime(
        parsed.transaction_time,
        message.date
      ),
      transaction_type: "expense",
      receiver_name: parsed.receiver_name,
      receiver_account: parsed.receiver_account,
      receiver_bank: parsed.receiver_bank,
      description: parsed.description,
      fee: parsed.fee,
      currency: "VND",
      bank_name: "Vietcombank",
      raw_text: message.rawText,
      gmail_message_id: message.id
    });

    if (error) {
      const isDuplicate =
        error.code === "23505" || error.message.includes("gmail_message_id");

      setSaveStatuses((current) => ({
        ...current,
        [message.id]: {
          type: "error",
          message: isDuplicate
            ? "Giao dịch này đã được lưu trước đó"
            : "Không thể lưu giao dịch. Vui lòng thử lại."
        }
      }));
      setSavingMessageId(null);
      return;
    }

    setSaveStatuses((current) => ({
      ...current,
      [message.id]: {
        type: "success",
        message: "Đã lưu giao dịch này."
      }
    }));
    setSavingMessageId(null);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase text-emerald">
            Gmail API
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Kiểm tra Gmail
          </h1>
          <p className="mt-3 leading-7 text-ink/65">
            Tìm thử email biên lai ngân hàng trong Gmail
          </p>
        </div>

        <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          <div className="rounded-3xl border border-emerald/10 bg-leaf/70 p-5 text-sm leading-6 text-ink/70">
            Đây chỉ là trang kiểm tra quyền đọc Gmail, chưa lưu email hay giao
            dịch.
          </div>

          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald to-mint px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-700/25 focus:outline-none focus:ring-2 focus:ring-emerald/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSearching ? "Đang tìm..." : "Tìm email biên lai"}
          </button>

          {errorMessage ? (
            <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
              {errorMessage}
            </div>
          ) : null}

          {hasSearched && !errorMessage ? (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-ink">
                Kết quả tìm kiếm
              </h2>
              {messages.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {messages.map((message) => {
                    const parsed = message.parsedTransaction;
                    const saveStatus = saveStatuses[message.id];
                    const isSavingThisMessage = savingMessageId === message.id;

                    return (
                      <li
                        key={message.id}
                        className="rounded-3xl border border-emerald/10 bg-white px-5 py-5 shadow-sm shadow-emerald-900/5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <p className="text-sm font-semibold text-emerald">
                            {message.subject}
                          </p>
                          <span
                            className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                              message.isLikelyVietcombankReceipt
                                ? "border-emerald/15 bg-emerald/10 text-emerald"
                                : "border-ink/10 bg-ink/5 text-ink/55"
                            }`}
                          >
                            {message.isLikelyVietcombankReceipt
                              ? "Có thể là biên lai Vietcombank"
                              : "Không phải biên lai phù hợp"}
                          </span>
                        </div>

                        <dl className="mt-4 space-y-2 text-sm text-ink/70">
                          <div>
                            <dt className="font-semibold text-ink">From</dt>
                            <dd className="mt-1 break-words">{message.from}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Date</dt>
                            <dd className="mt-1 break-words">{message.date}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Snippet</dt>
                            <dd className="mt-1 break-words">
                              {message.snippet || "(Không có snippet)"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">
                              Body preview
                            </dt>
                            <dd className="mt-2 whitespace-pre-wrap rounded-2xl bg-leaf/70 px-4 py-3 leading-6 text-ink/75">
                              {message.bodyPreview ||
                                "(Không có nội dung xem trước)"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">
                              Message ID
                            </dt>
                            <dd className="mt-1 break-all">{message.id}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-ink">Thread ID</dt>
                            <dd className="mt-1 break-all">
                              {message.threadId || "(Không có thread id)"}
                            </dd>
                          </div>
                        </dl>

                        {message.isLikelyVietcombankReceipt && parsed ? (
                          parsed.amount ? (
                            <div className="mt-5 rounded-3xl border border-emerald/10 bg-leaf/60 p-4">
                              <p className="text-sm font-semibold text-emerald">
                                Xem trước giao dịch
                              </p>
                              <dl className="mt-4 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Số tiền
                                  </dt>
                                  <dd className="mt-1">
                                    {formatAmount(parsed.amount)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Thời gian giao dịch
                                  </dt>
                                  <dd className="mt-1">
                                    {formatDate(parsed.transaction_time)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Người nhận
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.receiver_name)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Tài khoản người nhận
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.receiver_account)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Ngân hàng người nhận
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.receiver_bank)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">Phí</dt>
                                  <dd className="mt-1">
                                    {formatAmount(parsed.fee)}
                                  </dd>
                                </div>
                                <div className="sm:col-span-2">
                                  <dt className="font-semibold text-ink">
                                    Nội dung chuyển tiền
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.description)}
                                  </dd>
                                </div>
                              </dl>

                              {saveStatus ? (
                                <p
                                  className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${
                                    saveStatus.type === "success"
                                      ? "bg-emerald/10 text-emerald"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {saveStatus.message}
                                </p>
                              ) : null}

                              <button
                                type="button"
                                onClick={() => handleSaveTransaction(message)}
                                disabled={isSavingThisMessage}
                                className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-700/25 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                              >
                                {isSavingThisMessage
                                  ? "Đang lưu..."
                                  : "Lưu giao dịch này"}
                              </button>
                            </div>
                          ) : (
                            <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                              Không đọc được số tiền từ email này
                            </p>
                          )
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-6 text-center text-sm font-medium text-emerald">
                  Không tìm thấy biên lai chuyển khoản phù hợp
                </p>
              )}

              {skippedEmails.length > 0 ? (
                <details className="mt-5 rounded-3xl border border-ink/10 bg-white px-5 py-4 text-sm text-ink/65">
                  <summary className="cursor-pointer font-semibold text-ink">
                    Email bị bỏ qua
                  </summary>
                  <ul className="mt-4 space-y-3">
                    {skippedEmails.map((email) => (
                      <li
                        key={email.id}
                        className="rounded-2xl border border-ink/10 bg-ink/[0.02] px-4 py-3"
                      >
                        <p className="break-words font-semibold text-ink">
                          {email.subject}
                        </p>
                        <p className="mt-1 break-words">{email.from}</p>
                        <p className="mt-2 font-medium text-ink/70">
                          {email.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
