"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import { parseVietcombankReceipt } from "@/lib/parsers/vietcombank";

type Fields = {
  transaction_type: "expense" | "income";
  amount: string;
  transaction_time: string;
  receiver_name: string;
  receiver_account: string;
  receiver_bank: string;
  description: string;
  category: string;
  fee: string;
};

const INPUT_CLASS =
  "mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10";

const LABEL_CLASS = "text-sm font-semibold text-ink";

/** Convert ISO string (or partial) to datetime-local input value */
function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  // datetime-local expects "yyyy-MM-ddTHH:mm"
  return iso.slice(0, 16);
}

export default function ImportVietcombankPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [fields, setFields] = useState<Fields | null>(null);
  const [parseError, setParseError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleParse() {
    setParseError("");
    setSaveError("");

    const parsed = parseVietcombankReceipt(rawText);

    if (!parsed.amount) {
      setParseError(
        "Không tìm thấy số tiền trong biên lai. Vui lòng kiểm tra lại nội dung dán vào."
      );
      setFields(null);
      return;
    }

    setFields({
      transaction_type: "expense",
      amount: String(parsed.amount),
      transaction_time: toDateTimeLocal(parsed.transaction_time),
      receiver_name: parsed.receiver_name ?? "",
      receiver_account: parsed.receiver_account ?? "",
      receiver_bank: parsed.receiver_bank ?? "",
      description: parsed.description ?? "",
      category: "",
      fee: String(parsed.fee),
    });
  }

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!fields) return;

    setSaveError("");

    const amount = Number(fields.amount);
    if (!amount || !fields.transaction_time) {
      setSaveError("Vui lòng nhập số tiền và thời gian giao dịch.");
      return;
    }

    const configError = getSupabaseConfigError();
    if (configError) {
      setSaveError("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      return;
    }

    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setSaveError("Vui lòng đăng nhập để lưu giao dịch.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("transactions")
      .insert({
        amount,
        user_id: user.id,
        transaction_time: new Date(fields.transaction_time).toISOString(),
        transaction_type: fields.transaction_type,
        receiver_name: fields.receiver_name || null,
        receiver_bank: fields.receiver_bank || null,
        description: fields.description || null,
        category: fields.category || null,
        fee: Number(fields.fee) || 0,
        currency: "VND",
        bank_name: "Vietcombank",
        raw_text: rawText || null,
      });

    if (error) {
      setSaveError("Không thể lưu giao dịch. Vui lòng thử lại.");
      setIsSaving(false);
      return;
    }

    router.push("/transactions");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Vietcombank
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Import biên lai Vietcombank
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Dán nội dung biên lai chuyển khoản để tự động tạo giao dịch
              </p>
            </div>
            <a
              href="/transactions"
              className="inline-flex w-fit rounded-full border border-emerald/20 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald shadow-lg shadow-emerald-900/5 transition hover:-translate-y-1 hover:border-emerald/35 hover:bg-white hover:shadow-xl"
            >
              Quay lại danh sách
            </a>
          </div>
        </div>

        {/* Paste area */}
        <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          <div className="space-y-6">
            <label className="block">
              <span className={LABEL_CLASS}>Nội dung biên lai</span>
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="mt-2 w-full resize-y rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 font-mono text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                placeholder={"Dán nội dung biên lai Vietcombank vào đây...\n\nVí dụ:\nTrans. Date, Time: 25/12/2024 14:30:00\nAmount: 1,500,000 VND\nBeneficiary Name: NGUYEN VAN A\n..."}
              />
            </label>

            {parseError ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {parseError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
            >
              Phân tích biên lai
            </button>
          </div>
        </div>

        {/* Preview + edit */}
        {fields ? (
          <div className="mt-6 rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
            <p className="mb-6 text-sm font-semibold uppercase text-emerald">
              Thông tin trích xuất — có thể chỉnh sửa trước khi lưu
            </p>

            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL_CLASS}>Số tiền (VND)</span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={fields.amount}
                    onChange={(e) => setField("amount", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="1500000"
                  />
                </label>

                <label className="block">
                  <span className={LABEL_CLASS}>Thời gian giao dịch</span>
                  <input
                    type="datetime-local"
                    value={fields.transaction_time}
                    onChange={(e) => setField("transaction_time", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </label>
              </div>

              <label className="block">
                <span className={LABEL_CLASS}>Loại giao dịch</span>
                <select
                  value={fields.transaction_type}
                  onChange={(e) =>
                    setField(
                      "transaction_type",
                      e.target.value as Fields["transaction_type"]
                    )
                  }
                  className={INPUT_CLASS}
                >
                  <option value="expense">Chi tiêu</option>
                  <option value="income">Thu nhập</option>
                </select>
              </label>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL_CLASS}>Người nhận</span>
                  <input
                    type="text"
                    value={fields.receiver_name}
                    onChange={(e) => setField("receiver_name", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Nguyễn Văn A"
                  />
                </label>

                <label className="block">
                  <span className={LABEL_CLASS}>Tài khoản người nhận</span>
                  <input
                    type="text"
                    value={fields.receiver_account}
                    onChange={(e) => setField("receiver_account", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="9876543210"
                  />
                </label>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <label className="block">
                  <span className={LABEL_CLASS}>Ngân hàng người nhận</span>
                  <input
                    type="text"
                    value={fields.receiver_bank}
                    onChange={(e) => setField("receiver_bank", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Techcombank"
                  />
                </label>

                <label className="block">
                  <span className={LABEL_CLASS}>Phí (VND)</span>
                  <input
                    type="number"
                    min="0"
                    value={fields.fee}
                    onChange={(e) => setField("fee", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="0"
                  />
                </label>
              </div>

              <label className="block">
                <span className={LABEL_CLASS}>Danh mục</span>
                <input
                  type="text"
                  value={fields.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Ăn uống"
                />
              </label>

              <label className="block">
                <span className={LABEL_CLASS}>Nội dung chuyển tiền</span>
                <textarea
                  rows={3}
                  value={fields.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-2 w-full resize-none rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                  placeholder="Ghi chú nội dung chuyển khoản"
                />
              </label>

              {saveError ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {saveError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <a
                  href="/transactions"
                  className="inline-flex flex-1 justify-center rounded-full border border-emerald/20 bg-white px-6 py-3.5 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 transition hover:border-emerald/35 hover:bg-leaf"
                >
                  Huỷ
                </a>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
                >
                  {isSaving ? "Đang lưu..." : "Lưu giao dịch"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
