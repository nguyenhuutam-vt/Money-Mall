"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import TransactionForm, {
  type TransactionFormValues
} from "../../TransactionForm";

type Transaction = TransactionFormValues & {
  id: string | number;
};

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const transactionId = params.id;
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  useEffect(() => {
    async function fetchTransaction() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setErrorMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) {
        setIsLoginRequired(true);
        setCurrentUserId(null);
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, transaction_type, amount, transaction_time, receiver_name, receiver_bank, description, category"
        )
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMessage("Không thể tải giao dịch. Vui lòng thử lại.");
      } else if (!data) {
        setNotFound(true);
      } else {
        setTransaction(data);
      }

      setIsLoading(false);
    }

    fetchTransaction();
  }, [transactionId]);

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

    if (!amount || !transactionTime || !transactionType) {
      setErrorMessage("Vui lòng nhập loại giao dịch, số tiền và ngày giao dịch.");
      setIsSubmitting(false);
      return;
    }

    if (configError) {
      setErrorMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
      setIsSubmitting(false);
      return;
    }

    if (!currentUserId) {
      setErrorMessage("Vui lòng đăng nhập để cập nhật giao dịch.");
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await getSupabaseClient()
      .from("transactions")
      .update({
        transaction_type: transactionType,
        amount,
        transaction_time: new Date(transactionTime).toISOString(),
        receiver_name: String(formData.get("receiver_name") || ""),
        receiver_bank: String(formData.get("receiver_bank") || ""),
        description: String(formData.get("description") || ""),
        category: String(formData.get("category") || "")
      })
      .eq("id", transactionId)
      .eq("user_id", currentUserId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setErrorMessage("Không thể cập nhật giao dịch. Vui lòng thử lại.");
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
                Sửa giao dịch
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Cập nhật thông tin khoản thu hoặc chi đã ghi lại
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
          {isLoading ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center text-sm font-medium text-emerald">
              Đang tải giao dịch...
            </div>
          ) : isLoginRequired ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center">
              <p className="font-semibold text-ink">
                Vui lòng đăng nhập để sửa giao dịch
              </p>
              <p className="mt-2 text-sm text-ink/60">
                Đăng nhập bằng Google để chỉnh sửa giao dịch của riêng bạn.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Về trang chủ
              </Link>
            </div>
          ) : notFound ? (
            <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center">
              <p className="font-semibold text-ink">Không tìm thấy giao dịch</p>
              <p className="mt-2 text-sm text-ink/60">
                Giao dịch này có thể đã bị xoá hoặc không còn tồn tại.
              </p>
              <a
                href="/transactions"
                className="mt-5 inline-flex rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Về danh sách giao dịch
              </a>
            </div>
          ) : transaction ? (
            <TransactionForm
              initialValues={transaction}
              isSubmitting={isSubmitting}
              errorMessage={errorMessage}
              submitLabel="Lưu thay đổi"
              submittingLabel="Đang lưu..."
              onSubmit={handleSubmit}
              showCancel
            />
          ) : (
            <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-10 text-center text-sm font-medium text-red-600">
              {errorMessage || "Không thể hiển thị giao dịch. Vui lòng thử lại."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
