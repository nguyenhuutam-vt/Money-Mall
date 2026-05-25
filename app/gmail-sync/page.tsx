"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  parseBankReceipt,
  type ParsedBankReceipt
} from "@/lib/parsers";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import { isValidTransactionDate } from "@/lib/transactionDates";

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

type ReceiptCandidate = {
  id: string;
  subject: string;
  emailDate: string;
  rawText: string;
  parsed: ParsedBankReceipt;
};

type FailedCandidate = ReceiptCandidate & {
  bodyPreview: string;
};

type SaveItemStatus = "saved" | "exists" | "error";

type SaveSummary = {
  saved: number;
  existing: number;
  failed: number;
};

type ScanStatus = "idle" | "loading" | "error" | "success" | "empty";

type ReceiptFilterResult = {
  isReceipt: boolean;
};

type GmailSyncState = {
  user_id: string;
  last_synced_at: string | null;
  last_scan_query: string | null;
  last_scan_result_count: number | null;
  updated_at: string | null;
};

const RECEIPT_SEARCH_QUERY =
  '("Biên lai chuyển tiền" OR "Payment Receipt" OR (Vietcombank ("giao dịch" OR "số tiền" OR Amount OR "ghi Có" OR "ghi Nợ" OR "chuyển tiền" OR "nhận tiền")) OR (Techcombank ("giao dịch" OR "số tiền" OR Amount OR "ghi Có" OR "ghi Nợ" OR "chuyển tiền" OR "nhận tiền")) OR (("MB Bank" OR MBBank) ("giao dịch" OR "số tiền" OR Amount OR "ghi Có" OR "ghi Nợ" OR "chuyển tiền" OR "nhận tiền")))';
const DEFAULT_GMAIL_SEARCH_QUERY = `newer_than:365d ${RECEIPT_SEARCH_QUERY}`;
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

function cleanPreview(text: string) {
  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (cleanedText.length <= 320) {
    return cleanedText;
  }

  return `${cleanedText.slice(0, 320)}...`;
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

function getReceiptFilter(rawText: string): ReceiptFilterResult {
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
    "mb bank",
    "mbbank",
    "military bank",
    "ngân hàng quân đội",
    "giao dịch",
    "tài khoản",
    "ghi có",
    "ghi nợ",
    "số tiền",
    "amount",
    "nội dung chuyển tiền",
    "details of payment"
  ];

  const hasPromotionalSignal = promotionalKeywords.some((keyword) =>
    text.includes(keyword)
  );

  if (hasPromotionalSignal) {
    return { isReceipt: false };
  }

  const receiptScore = strongReceiptKeywords.filter((keyword) =>
    text.includes(keyword)
  ).length;

  return { isReceipt: receiptScore >= RECEIPT_SCORE_THRESHOLD };
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

function formatGmailSearchDate(value: string) {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

function buildGmailSearchQuery(
  syncState: GmailSyncState | null,
  shouldForceFullScan: boolean
) {
  if (shouldForceFullScan || !syncState?.last_synced_at) {
    return DEFAULT_GMAIL_SEARCH_QUERY;
  }

  const afterDate = formatGmailSearchDate(syncState.last_synced_at);

  return afterDate
    ? `after:${afterDate} ${RECEIPT_SEARCH_QUERY}`
    : DEFAULT_GMAIL_SEARCH_QUERY;
}

function getScanStatusMessage(scanStatus: ScanStatus) {
  if (scanStatus === "idle") {
    return "Sẵn sàng quét Gmail.";
  }

  if (scanStatus === "loading") {
    return "Đang quét Gmail...";
  }

  if (scanStatus === "error") {
    return "Có lỗi khi quét Gmail.";
  }

  if (scanStatus === "empty") {
    return "Không tìm thấy biên lai chuyển khoản phù hợp";
  }

  return "Đã quét xong Gmail.";
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "Chưa có";
}

function transactionTypeLabel(type: ParsedBankReceipt["transaction_type"]) {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

function transactionTypeBadgeClass(type: ParsedBankReceipt["transaction_type"]) {
  return type === "income"
    ? "bg-emerald/10 text-emerald"
    : "bg-amber-50 text-amber-700";
}

function isDuplicateError(errorMessage: string, errorCode?: string) {
  return errorCode === "23505" || errorMessage.includes("gmail_message_id");
}

function resolveTransactionTime(
  parsedTime: string | null,
  emailDate: string
): string | null {
  if (isValidTransactionDate(parsedTime)) {
    return new Date(parsedTime as string).toISOString();
  }

  if (emailDate && emailDate !== "(Không rõ ngày)") {
    if (isValidTransactionDate(emailDate)) {
      return new Date(emailDate).toISOString();
    }
  }

  return null;
}

export default function GmailSyncPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoginRequired, setIsLoginRequired] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [candidates, setCandidates] = useState<ReceiptCandidate[]>([]);
  const [failedCandidates, setFailedCandidates] = useState<FailedCandidate[]>(
    []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatuses, setSaveStatuses] = useState<
    Record<string, SaveItemStatus>
  >({});
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null);
  const [syncState, setSyncState] = useState<GmailSyncState | null>(null);
  const [syncStateErrorMessage, setSyncStateErrorMessage] = useState("");
  const [isResettingSyncState, setIsResettingSyncState] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function checkAuth() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setIsCheckingAuth(false);
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();

      if (!isCurrentRequest) {
        return;
      }

      if (error || !data.session) {
        setIsLoginRequired(true);
        setIsCheckingAuth(false);
        return;
      }

      const { data: stateData, error: stateError } = await supabase
        .from("gmail_sync_state")
        .select(
          "user_id,last_synced_at,last_scan_query,last_scan_result_count,updated_at"
        )
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (!isCurrentRequest) {
        return;
      }

      if (stateError) {
        setSyncStateErrorMessage("Không thể tải trạng thái quét Gmail.");
      } else {
        setSyncState(stateData);
        setSyncStateErrorMessage("");
      }

      setIsLoginRequired(false);
      setIsCheckingAuth(false);
    }

    checkAuth();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  function toggleCandidate(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    );
  }

  function selectAllCandidates() {
    setSelectedIds(candidates.map((candidate) => candidate.id));
  }

  function clearSelectedCandidates() {
    setSelectedIds([]);
  }

  async function handleScan(shouldForceFullScan = false) {
    setScanStatus("loading");
    setErrorMessage("");
    setSaveErrorMessage("");
    setCandidates([]);
    setFailedCandidates([]);
    setSelectedIds([]);
    setSaveStatuses({});
    setSaveSummary(null);

    const configError = getSupabaseConfigError();

    if (configError) {
      setErrorMessage(
        "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
      );
      setScanStatus("error");
      return;
    }

    const { data, error } = await getSupabaseClient().auth.getSession();
    const session = data.session;

    if (error || !session) {
      setIsLoginRequired(true);
      setErrorMessage("Vui lòng đăng nhập để quét Gmail.");
      setScanStatus("error");
      return;
    }

    const providerToken = session.provider_token;

    if (!providerToken) {
      setErrorMessage(
        "Không tìm thấy quyền đọc Gmail. Vui lòng đăng xuất rồi đăng nhập Google lại."
      );
      setScanStatus("error");
      return;
    }

    const gmailSearchQuery = buildGmailSearchQuery(
      syncState,
      shouldForceFullScan
    );
    const params = new URLSearchParams({
      q: gmailSearchQuery,
      maxResults: "20"
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
            : "Không thể quét Gmail. Vui lòng thử lại."
        );
        setScanStatus("error");
        return;
      }

      const gmailData = responseData as GmailListResponse;
      const listMessages = gmailData.messages ?? [];
      const parsedCandidates: ReceiptCandidate[] = [];
      const manualCandidates: FailedCandidate[] = [];

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
          setScanStatus("error");
          return;
        }

        const detailData = detailResponseData as GmailDetailResponse;
        const headers = detailData.payload?.headers;
        const subject =
          getHeaderValue(headers, "Subject") || "(Không có tiêu đề)";
        const from = getHeaderValue(headers, "From") || "(Không rõ người gửi)";
        const emailDate = getHeaderValue(headers, "Date") || "(Không rõ ngày)";
        const snippet = detailData.snippet ?? "";
        const bodyText = getEmailBodyText(detailData.payload);
        const rawText = buildRawText(subject, from, snippet, bodyText);
        const receiptFilter = getReceiptFilter(rawText);

        if (!receiptFilter.isReceipt) {
          continue;
        }

        const parsed = parseBankReceipt(rawText);

        if (!parsed) {
          continue;
        }

        const candidate = {
          id: detailData.id ?? message.id,
          subject,
          emailDate,
          rawText,
          parsed
        };

        if (parsed.amount) {
          parsedCandidates.push(candidate);
        } else {
          manualCandidates.push({
            ...candidate,
            bodyPreview: cleanPreview(bodyText)
          });
        }
      }

      setCandidates(parsedCandidates);
      setFailedCandidates(manualCandidates);
      setSelectedIds(parsedCandidates.map((candidate) => candidate.id));
      setScanStatus(
        parsedCandidates.length || manualCandidates.length ? "success" : "empty"
      );

      const syncedAt = new Date().toISOString();
      const nextSyncState = {
        user_id: session.user.id,
        last_synced_at: syncedAt,
        last_scan_query: gmailSearchQuery,
        last_scan_result_count: listMessages.length,
        updated_at: syncedAt
      };
      const { error: upsertError } = await getSupabaseClient()
        .from("gmail_sync_state")
        .upsert(nextSyncState, { onConflict: "user_id" });

      if (upsertError) {
        setSyncStateErrorMessage("Đã quét xong nhưng chưa lưu được trạng thái.");
      } else {
        setSyncState(nextSyncState);
        setSyncStateErrorMessage("");
      }
    } catch {
      setErrorMessage("Không thể kết nối Gmail API. Vui lòng thử lại.");
      setScanStatus("error");
    }
  }

  async function handleResetSyncState() {
    const shouldReset = window.confirm(
      "Bạn có chắc muốn đặt lại lịch sử quét Gmail không?"
    );

    if (!shouldReset) {
      return;
    }

    const configError = getSupabaseConfigError();

    if (configError) {
      setSyncStateErrorMessage(
        "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
      );
      return;
    }

    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setIsLoginRequired(true);
      setSyncStateErrorMessage("Vui lòng đăng nhập để đặt lại lịch sử quét.");
      return;
    }

    setIsResettingSyncState(true);
    setSyncStateErrorMessage("");

    const { error } = await supabase
      .from("gmail_sync_state")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      setSyncStateErrorMessage("Không thể đặt lại lịch sử quét Gmail.");
    } else {
      setSyncState(null);
    }

    setIsResettingSyncState(false);
  }

  async function handleSaveSelected() {
    const selectedCandidates = candidates.filter((candidate) =>
      selectedIds.includes(candidate.id)
    );

    setSaveErrorMessage("");
    setSaveSummary(null);

    if (selectedCandidates.length === 0) {
      setSaveErrorMessage("Vui lòng chọn ít nhất một giao dịch để lưu.");
      return;
    }

    const configError = getSupabaseConfigError();

    if (configError) {
      setSaveErrorMessage(
        "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
      );
      return;
    }

    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setIsLoginRequired(true);
      setSaveErrorMessage("Vui lòng đăng nhập để lưu giao dịch.");
      return;
    }

    setIsSaving(true);

    const nextStatuses: Record<string, SaveItemStatus> = {};
    const summary: SaveSummary = {
      saved: 0,
      existing: 0,
      failed: 0
    };

    for (const candidate of selectedCandidates) {
      const { parsed } = candidate;

      if (!parsed.amount) {
        nextStatuses[candidate.id] = "error";
        summary.failed += 1;
        continue;
      }

      const { error } = await supabase.from("transactions").insert({
        amount: parsed.amount,
        user_id: user.id,
        transaction_time: resolveTransactionTime(
          parsed.transaction_time,
          candidate.emailDate
        ),
        transaction_type: parsed.transaction_type,
        sender_name: parsed.sender_name,
        sender_account: parsed.sender_account,
        receiver_name: parsed.receiver_name,
        receiver_account: parsed.receiver_account,
        receiver_bank: parsed.receiver_bank,
        description: parsed.description,
        fee: parsed.fee,
        currency: parsed.currency,
        bank_name: parsed.bank_name,
        raw_text: candidate.rawText,
        gmail_message_id: candidate.id
      });

      if (!error) {
        nextStatuses[candidate.id] = "saved";
        summary.saved += 1;
        continue;
      }

      if (isDuplicateError(error.message, error.code)) {
        nextStatuses[candidate.id] = "exists";
        summary.existing += 1;
      } else {
        nextStatuses[candidate.id] = "error";
        summary.failed += 1;
      }
    }

    setSaveStatuses((current) => ({
      ...current,
      ...nextStatuses
    }));
    setSaveSummary(summary);
    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Gmail
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Đồng bộ Gmail
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Tìm biên lai chuyển khoản trong Gmail và lưu thành giao dịch
              </p>
              <p className="mt-3 rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-4 text-sm leading-6 text-ink/70">
                Chỉ đọc các email biên lai phù hợp, không lưu email nếu bạn
                chưa chọn lưu.
              </p>
            </div>
            <Link
              href="/transactions"
              className="inline-flex w-fit rounded-full border border-emerald/20 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald shadow-lg shadow-emerald-900/5 transition hover:-translate-y-1 hover:border-emerald/35 hover:bg-white hover:shadow-xl"
            >
              Xem danh sách giao dịch
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          {isCheckingAuth ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center text-sm font-medium text-emerald">
              Đang kiểm tra đăng nhập...
            </div>
          ) : isLoginRequired ? (
            <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-8 text-center">
              <p className="text-base font-semibold text-amber-800">
                Vui lòng đăng nhập bằng Google để đồng bộ Gmail.
              </p>
              <p className="mt-2 text-sm text-amber-700">
                Sau khi đăng nhập, quay lại trang này và bấm Quét Gmail.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Trạng thái quét
                  </p>
                  <p className="mt-1 text-sm text-ink/60">
                    {getScanStatusMessage(scanStatus)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleScan()}
                    disabled={scanStatus === "loading" || isSaving}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald to-mint px-6 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-700/25 focus:outline-none focus:ring-2 focus:ring-emerald/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    {scanStatus === "loading" ? "Đang quét..." : "Quét Gmail"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScan(true)}
                    disabled={scanStatus === "loading" || isSaving}
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald/20 bg-white px-5 text-sm font-semibold text-emerald shadow-lg shadow-emerald-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald/35 hover:bg-leaf focus:outline-none focus:ring-2 focus:ring-emerald/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
                  >
                    Quét lại 365 ngày gần nhất
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald/10 bg-leaf/70 p-5 text-sm text-ink/70">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold text-ink">Lần quét gần nhất</p>
                    <p className="mt-1">
                      {syncState?.last_synced_at
                        ? formatDate(syncState.last_synced_at)
                        : "Chưa từng quét Gmail"}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">
                      Số email tìm thấy lần trước
                    </p>
                    <p className="mt-1">
                      {syncState?.last_scan_result_count ?? 0}
                    </p>
                  </div>
                </div>

                {syncState?.last_scan_query ? (
                  <details className="mt-4">
                    <summary className="cursor-pointer font-semibold text-emerald">
                      Query lần trước
                    </summary>
                    <p className="mt-2 break-words rounded-2xl bg-white/80 px-4 py-3 font-mono text-xs leading-5 text-ink/65">
                      {syncState.last_scan_query}
                    </p>
                  </details>
                ) : null}

                {syncStateErrorMessage ? (
                  <p className="mt-4 text-sm font-medium text-amber-700">
                    {syncStateErrorMessage}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleResetSyncState}
                  disabled={
                    scanStatus === "loading" ||
                    isSaving ||
                    isResettingSyncState ||
                    !syncState
                  }
                  className="mt-4 rounded-full border border-red-100 bg-white/80 px-4 py-2 text-xs font-semibold text-red-500 transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResettingSyncState
                    ? "Đang đặt lại..."
                    : "Đặt lại lịch sử quét"}
                </button>
              </div>

              {errorMessage ? (
                <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                  {errorMessage}
                </div>
              ) : null}

              {scanStatus === "empty" ? (
                <div className="mt-6 rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-8 text-center text-sm font-medium text-emerald">
                  Không tìm thấy biên lai chuyển khoản phù hợp
                </div>
              ) : null}

              {candidates.length > 0 ? (
                <div className="mt-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-ink">
                        Biên lai có thể lưu
                      </h2>
                      <p className="mt-1 text-sm text-ink/60">
                        Đã chọn {selectedIds.length}/{candidates.length} giao
                        dịch.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={selectAllCandidates}
                        disabled={isSaving}
                        className="rounded-full border border-emerald/20 bg-white px-4 py-2.5 text-sm font-semibold text-emerald transition hover:border-emerald/35 hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedCandidates}
                        disabled={isSaving}
                        className="rounded-full border border-emerald/20 bg-white px-4 py-2.5 text-sm font-semibold text-emerald transition hover:border-emerald/35 hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-4">
                    {candidates.map((candidate) => {
                      const { parsed } = candidate;
                      const isSelected = selectedIds.includes(candidate.id);
                      const saveStatus = saveStatuses[candidate.id];

                      return (
                        <li
                          key={candidate.id}
                          className="rounded-3xl border border-emerald/10 bg-white px-5 py-5 shadow-sm shadow-emerald-900/5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                            <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCandidate(candidate.id)}
                                disabled={isSaving}
                                className="h-5 w-5 rounded border-emerald/30 text-emerald accent-emerald"
                              />
                              Chọn
                            </label>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap gap-2">
                                    <span className="w-fit rounded-full bg-emerald px-3 py-1 text-xs font-semibold text-white">
                                      {displayValue(parsed.bank_name)}
                                    </span>
                                    <span
                                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${transactionTypeBadgeClass(
                                        parsed.transaction_type
                                      )}`}
                                    >
                                      {transactionTypeLabel(
                                        parsed.transaction_type
                                      )}
                                    </span>
                                  </div>
                                  <p className="mt-2 break-words text-base font-semibold text-emerald">
                                    {formatAmount(parsed.amount)}
                                  </p>
                                </div>
                                {saveStatus ? (
                                  <span
                                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                                      saveStatus === "saved"
                                        ? "bg-emerald/10 text-emerald"
                                        : saveStatus === "exists"
                                          ? "bg-amber-50 text-amber-700"
                                          : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    {saveStatus === "saved"
                                      ? "Đã lưu"
                                      : saveStatus === "exists"
                                        ? "Đã tồn tại"
                                        : "Lỗi"}
                                  </span>
                                ) : null}
                              </div>

                              <dl className="mt-4 grid gap-3 text-sm text-ink/70 sm:grid-cols-2">
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Ngân hàng
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.bank_name)}
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
                                    Người gửi
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.sender_name)}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Tài khoản người gửi
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {displayValue(parsed.sender_account)}
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
                                <div>
                                  <dt className="font-semibold text-ink">
                                    Email date
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {candidate.emailDate}
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
                                <div className="sm:col-span-2">
                                  <dt className="font-semibold text-ink">
                                    Source email subject
                                  </dt>
                                  <dd className="mt-1 break-words">
                                    {candidate.subject}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {saveErrorMessage ? (
                    <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
                      {saveErrorMessage}
                    </div>
                  ) : null}

                  {saveSummary ? (
                    <div className="mt-5 grid gap-3 rounded-3xl border border-emerald/10 bg-leaf/70 p-4 text-sm font-semibold text-ink sm:grid-cols-3">
                      <p>Đã lưu: {saveSummary.saved}</p>
                      <p>Đã tồn tại: {saveSummary.existing}</p>
                      <p>Lỗi: {saveSummary.failed}</p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveSelected}
                    disabled={isSaving || selectedIds.length === 0}
                    className="mt-5 w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                  >
                    {isSaving
                      ? "Đang lưu..."
                      : "Lưu các giao dịch đã chọn"}
                  </button>
                </div>
              ) : null}

              {failedCandidates.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-ink">
                    Cần kiểm tra thủ công
                  </h2>
                  <p className="mt-1 text-sm text-ink/60">
                    Các email này giống biên lai nhưng chưa đọc được số tiền.
                  </p>
                  <ul className="mt-4 space-y-3">
                    {failedCandidates.map((candidate) => (
                      <li
                        key={candidate.id}
                        className="rounded-3xl border border-amber-100 bg-amber-50/80 px-5 py-4 text-sm text-amber-800"
                      >
                        <p className="font-semibold">{candidate.subject}</p>
                        <p className="mt-1">{candidate.emailDate}</p>
                        <p className="mt-3 leading-6">
                          {candidate.bodyPreview ||
                            "Không có nội dung xem trước"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
