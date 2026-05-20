"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

export default function NewTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const amount = Number(formData.get("amount"));
    const transactionTime = String(formData.get("transaction_time"));
    const transactionType =
      formData.get("transaction_type") === "income" ? "income" : "expense";
    const configError = getSupabaseConfigError();

    if (!amount || !transactionTime) {
      setErrorMessage("Vui lòng nhập số tiền và thời gian giao dịch.");
      setIsSubmitting(false);
      return;
    }

    if (configError) {
      setErrorMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await getSupabaseClient().from("transactions").insert({
      amount,
      transaction_time: new Date(transactionTime).toISOString(),
      receiver_name: String(formData.get("receiver_name") || ""),
      receiver_bank: String(formData.get("receiver_bank") || ""),
      description: String(formData.get("description") || ""),
      category: String(formData.get("category") || ""),
      transaction_type: transactionType,
      currency: "VND",
      fee: 0,
      bank_name: "Manual"
    });

    if (error) {
      setErrorMessage("Không thể lưu giao dịch. Vui lòng thử lại.");
      setIsSubmitting(false);
      return;
    }

    router.push("/transactions");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Giao dịch thủ công
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Thêm giao dịch mới
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Ghi lại khoản chi hoặc khoản thu thủ công
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

        <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-semibold text-ink">
                Loại giao dịch
              </span>
              <select
                name="transaction_type"
                defaultValue="expense"
                className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
              </select>
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  Số tiền
                </span>
                <input
                  required
                  min="1"
                  name="amount"
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                  placeholder="50000"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  Thời gian giao dịch
                </span>
                <input
                  required
                  name="transaction_time"
                  type="datetime-local"
                  className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                />
              </label>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  Người nhận
                </span>
                <input
                  name="receiver_name"
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                  placeholder="Nguyễn Văn A"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  Ngân hàng nhận
                </span>
                <input
                  name="receiver_bank"
                  type="text"
                  className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                  placeholder="Vietcombank"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Danh mục</span>
              <input
                name="category"
                type="text"
                className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                placeholder="Ăn uống"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-ink">Mô tả</span>
              <textarea
                name="description"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
                placeholder="Ghi chú ngắn cho giao dịch"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {errorMessage}
              </p>
            ) : null}

            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu giao dịch"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
