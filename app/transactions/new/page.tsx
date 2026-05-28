"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import TransactionForm from "../TransactionForm";

export default function NewTransactionPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function checkAuth() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setIsCheckingAuth(false);
        return;
      }

      const { data, error } = await getSupabaseClient().auth.getUser();

      if (!isCurrentRequest) {
        return;
      }

      setIsLoginRequired(Boolean(error || !data.user));
      setIsCheckingAuth(false);
    }

    checkAuth();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

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

    const supabase = getSupabaseClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      setErrorMessage("Vui lòng đăng nhập để lưu giao dịch.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      amount,
      user_id: user.id,
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
          {isCheckingAuth ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center text-sm font-medium text-emerald">
              Đang kiểm tra đăng nhập...
            </div>
          ) : isLoginRequired ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center">
              <p className="font-semibold text-ink">
                Vui lòng đăng nhập để thêm giao dịch
              </p>
              <p className="mt-2 text-sm text-ink/60">
                Đăng nhập bằng Google để lưu giao dịch vào tài khoản của bạn.
              </p>
            </div>
          ) : (
            <TransactionForm
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              submitLabel="Lưu giao dịch"
              submittingLabel="Đang lưu..."
              onSubmit={handleSubmit}
              enableCategorySuggestion
            />
          )}
        </div>
      </section>
    </main>
  );
}
