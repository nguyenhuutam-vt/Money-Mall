"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import {
  getEffectiveTransactionDate,
  getVietnamMonthValue
} from "@/lib/transactionDates";

type Transaction = {
  id: string | number;
  transaction_time: string | null;
  created_at: string | null;
  amount: number | string | null;
  transaction_type: "expense" | "income" | null;
  receiver_name: string | null;
  category: string | null;
  description: string | null;
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có thời gian";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có thời gian";
  }

  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);
  const day = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh"
  }).format(date);

  return `${time} ${day}`;
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "Chưa có";
}

function getAmount(value: Transaction["amount"]) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
}

function transactionTypeLabel(type: Transaction["transaction_type"]) {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

function transactionTypeBadgeClass(type: Transaction["transaction_type"]) {
  return type === "income"
    ? "border-emerald/15 bg-emerald/10 text-emerald"
    : "border-rose-100 bg-rose-50 text-rose-600";
}

async function getMonthlyTransactions(userId: string) {
  const configError = getSupabaseConfigError();

  if (configError) {
    return { data: null, error: new Error(configError) };
  }

  const supabase = getSupabaseClient();
  const now = new Date();
  const currentMonth = getVietnamMonthValue(now);
  const SELECT_FIELDS =
    "id, transaction_time, created_at, amount, transaction_type, receiver_name, category, description";

  const { data, error } = await supabase
    .from("transactions")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error };
  }

  return {
    data: ((data ?? []) as Transaction[]).filter((transaction) => {
      const effectiveDate = getEffectiveTransactionDate(transaction);

      return getVietnamMonthValue(effectiveDate) === currentMonth;
    }),
    error: null
  };
}

async function getLatestTransactions(userId: string) {
  const configError = getSupabaseConfigError();

  if (configError) {
    return {
      data: null,
      error: new Error(configError)
    };
  }

  const { data, error } = await getSupabaseClient()
    .from("transactions")
    .select(
      "id, transaction_time, created_at, amount, transaction_type, receiver_name, category, description"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error };
  }

  const sortedTransactions = ((data ?? []) as Transaction[]).sort(
    (first, second) => {
      const firstDate = getEffectiveTransactionDate(first);
      const secondDate = getEffectiveTransactionDate(second);
      const firstTime = firstDate ? new Date(firstDate).getTime() : 0;
      const secondTime = secondDate ? new Date(secondDate).getTime() : 0;

      return secondTime - firstTime;
    }
  );

  return { data: sortedTransactions.slice(0, 5), error: null };
}

export default function DashboardPage() {
  const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>(
    []
  );
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoginRequired, setIsLoginRequired] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function fetchDashboard() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setErrorMessage(
          "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
        );
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      const user = userData.user;

      if (!isCurrentRequest) {
        return;
      }

      if (userError || !user) {
        setIsLoginRequired(true);
        setIsLoading(false);
        return;
      }

      const [
        { data: monthlyData, error: monthlyError },
        { data: latestData, error: latestError }
      ] = await Promise.all([
        getMonthlyTransactions(user.id),
        getLatestTransactions(user.id)
      ]);

      if (!isCurrentRequest) {
        return;
      }

      if (monthlyError || latestError) {
        setErrorMessage("Không thể tải dashboard. Vui lòng thử lại.");
        setMonthlyTransactions([]);
        setLatestTransactions([]);
      } else {
        setMonthlyTransactions((monthlyData ?? []) as Transaction[]);
        setLatestTransactions((latestData ?? []) as Transaction[]);
      }

      setIsLoading(false);
    }

    fetchDashboard();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  const totalExpense = monthlyTransactions.reduce(
    (total, transaction) =>
      transaction.transaction_type === "income"
        ? total
        : total + getAmount(transaction.amount),
    0
  );
  const totalIncome = monthlyTransactions.reduce(
    (total, transaction) =>
      transaction.transaction_type === "income"
        ? total + getAmount(transaction.amount)
        : total,
    0
  );
  const largestTransaction = monthlyTransactions.reduce<Transaction | null>(
    (largest, transaction) => {
      if (!largest) {
        return transaction;
      }

      return getAmount(transaction.amount) > getAmount(largest.amount)
        ? transaction
        : largest;
    },
    null
  );

  const stats = [
    {
      label: "Tổng chi tháng này",
      value: formatAmount(totalExpense),
      note: "Các giao dịch Chi tiêu"
    },
    {
      label: "Tổng thu tháng này",
      value: formatAmount(totalIncome),
      note: "Các giao dịch Thu nhập"
    },
    {
      label: "Số giao dịch",
      value: monthlyTransactions.length.toString(),
      note: "Trong tháng hiện tại"
    },
    {
      label: "Giao dịch lớn nhất",
      value: largestTransaction
        ? formatAmount(getAmount(largestTransaction.amount))
        : "Chưa có",
      note: largestTransaction
        ? displayValue(
            largestTransaction.description || largestTransaction.receiver_name
          )
        : "Thêm giao dịch để xem thống kê"
    }
  ];

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8 animate-fade-up">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Tổng quan tháng này
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Theo dõi nhanh chi tiêu và các giao dịch gần đây
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/transactions/new"
                className="rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
              >
                Thêm giao dịch
              </Link>
              <Link
                href="/transactions"
                className="rounded-full border border-emerald/20 bg-white/80 px-5 py-3 text-center text-sm font-semibold text-emerald shadow-lg shadow-emerald-900/5 transition hover:-translate-y-1 hover:border-emerald/35 hover:bg-white hover:shadow-xl"
              >
                Xem tất cả giao dịch
              </Link>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 px-6 py-10 text-center shadow-xl shadow-emerald-900/5 animate-fade-up animation-delay-150">
            <p className="text-sm font-semibold text-emerald">
              Đang tải dashboard...
            </p>
          </div>
        ) : isLoginRequired ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur animate-fade-up animation-delay-150">
            <p className="text-lg font-semibold text-ink">
              Vui lòng đăng nhập để xem dashboard
            </p>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">
              Đăng nhập bằng Google để xem thống kê từ giao dịch của riêng bạn.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
            >
              Về trang chủ
            </Link>
          </div>
        ) : errorMessage ? (
          <div className="rounded-[2rem] border border-red-100 bg-red-50 px-6 py-10 text-center shadow-xl shadow-red-900/5 animate-fade-up animation-delay-150">
            <h2 className="text-lg font-semibold text-red-700">
              Không thể tải dashboard
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {errorMessage}
            </p>
          </div>
        ) : monthlyTransactions.length === 0 && latestTransactions.length === 0 ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur animate-fade-up animation-delay-150">
            <p className="text-lg font-semibold text-ink">
              Tháng này chưa có giao dịch nào
            </p>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">
              Hãy thêm giao dịch đầu tiên để dashboard bắt đầu tổng hợp chi
              tiêu trong tháng.
            </p>
            <Link
              href="/transactions/new"
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
            >
              Thêm giao dịch
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {stats.map((stat, index) => (
                <article
                  key={stat.label}
                  className="rounded-[1.5rem] border border-emerald/10 bg-white/90 p-5 shadow-xl shadow-emerald-900/5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/10 animate-fade-up"
                  style={{ animationDelay: `${150 + index * 100}ms` }}
                >
                  <p className="text-sm font-semibold text-ink/55">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/55">
                    {stat.note}
                  </p>
                </article>
              ))}
            </div>

            <section className="rounded-[2rem] border border-emerald/10 bg-white/90 p-5 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6 animate-fade-up animation-delay-300">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink">
                    Giao dịch gần đây
                  </h2>
                  <p className="mt-1 text-sm text-ink/55">
                    5 giao dịch mới nhất
                  </p>
                </div>
                <span className="rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                  {latestTransactions.length} giao dịch
                </span>
              </div>

              <div className="space-y-3">
                {latestTransactions.map((transaction) => {
                  const title =
                    transaction.description ||
                    transaction.receiver_name ||
                    transaction.category;

                  return (
                    <article
                      key={transaction.id}
                      className="grid grid-cols-[auto_1fr] gap-3 rounded-3xl border border-emerald/10 bg-leaf/55 p-4 shadow-sm shadow-emerald-900/5 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/10 sm:grid-cols-[auto_1fr_auto]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald shadow-sm">
                        {displayValue(transaction.category).slice(0, 1)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-ink">
                          {displayValue(title)}
                        </h3>
                        <p className="mt-1 text-sm text-ink/55">
                          {formatDate(
                            getEffectiveTransactionDate(transaction)
                          )}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-emerald">
                            {displayValue(transaction.category)}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${transactionTypeBadgeClass(
                              transaction.transaction_type
                            )}`}
                          >
                            {transactionTypeLabel(transaction.transaction_type)}
                          </span>
                        </div>
                      </div>

                      <p className="col-span-2 whitespace-nowrap text-left font-semibold text-emerald sm:col-span-1 sm:text-right">
                        {formatAmount(getAmount(transaction.amount))}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
