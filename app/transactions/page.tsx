"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

type Transaction = {
  id: string | number;
  transaction_time: string;
  amount: number;
  transaction_type: "expense" | "income" | null;
  receiver_name: string | null;
  receiver_bank: string | null;
  category: string | null;
  description: string | null;
};

function formatAmount(amount: number) {
  return `${new Intl.NumberFormat("en-US").format(amount)} VND`;
}

function formatDate(value: string) {
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

function getCurrentMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1));
}

function transactionTypeLabel(type: Transaction["transaction_type"]) {
  return type === "income" ? "Thu nhập" : "Chi tiêu";
}

function transactionTypeBadgeClass(type: Transaction["transaction_type"]) {
  return type === "income"
    ? "border-emerald/15 bg-emerald/10 text-emerald"
    : "border-rose-100 bg-rose-50 text-rose-600";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | NonNullable<Transaction["transaction_type"]>
  >("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(getCurrentMonthValue);

  useEffect(() => {
    async function fetchTransactions() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setErrorMessage("Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await getSupabaseClient()
        .from("transactions")
        .select(
          "id, transaction_time, amount, transaction_type, receiver_name, receiver_bank, category, description"
        )
        .order("transaction_time", { ascending: false });

      if (error) {
        setErrorMessage("Không thể tải danh sách giao dịch. Vui lòng thử lại.");
      } else {
        setTransactions(data ?? []);
      }

      setIsLoading(false);
    }

    fetchTransactions();
  }, []);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        transactions
          .map((transaction) => transaction.category?.trim())
          .filter((category): category is string => Boolean(category))
      )
    ).sort((firstCategory, secondCategory) =>
      firstCategory.localeCompare(secondCategory, "vi-VN")
    );
  }, [transactions]);

  const monthOptions = useMemo(() => {
    const months = new Set([getCurrentMonthValue()]);

    transactions.forEach((transaction) => {
      if (transaction.transaction_time) {
        months.add(transaction.transaction_time.slice(0, 7));
      }
    });

    return Array.from(months).sort((firstMonth, secondMonth) =>
      secondMonth.localeCompare(firstMonth)
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("vi-VN");

    return transactions.filter((transaction) => {
      const matchesSearch =
        !normalizedSearchTerm ||
        [
          transaction.receiver_name,
          transaction.description,
          transaction.receiver_bank
        ].some((value) =>
          value?.toLocaleLowerCase("vi-VN").includes(normalizedSearchTerm)
        );
      const matchesType =
        typeFilter === "all" || transaction.transaction_type === typeFilter;
      const matchesCategory =
        categoryFilter === "all" ||
        transaction.category?.trim() === categoryFilter;
      const matchesMonth =
        monthFilter === "all" ||
        transaction.transaction_time.slice(0, 7) === monthFilter;

      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    });
  }, [categoryFilter, monthFilter, searchTerm, transactions, typeFilter]);

  function resetFilters() {
    setSearchTerm("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setMonthFilter(getCurrentMonthValue());
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Giao dịch
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Danh sách giao dịch
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Theo dõi các khoản thu chi đã ghi lại
              </p>
            </div>
            <a
              href="/transactions/new"
              className="inline-flex w-fit rounded-full bg-gradient-to-r from-emerald to-mint px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-600/30"
            >
              Thêm giao dịch
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6">
          <div>
            {isLoading ? (
              <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center text-sm font-medium text-emerald">
                Đang tải giao dịch...
              </div>
            ) : errorMessage ? (
              <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-10 text-center text-sm font-medium text-red-600">
                {errorMessage}
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center">
                <p className="font-semibold text-ink">Chưa có giao dịch nào</p>
                <p className="mt-2 text-sm text-ink/60">
                  Hãy thêm giao dịch đầu tiên để bắt đầu theo dõi chi tiêu.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 rounded-3xl border border-emerald/10 bg-leaf/60 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-ink">
                        Bộ lọc giao dịch
                      </h2>
                      <p className="mt-1 text-sm text-ink/55">
                        {filteredTransactions.length} giao dịch phù hợp
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="w-full rounded-full border border-emerald/20 bg-white px-4 py-2.5 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 transition hover:border-emerald/35 hover:bg-white/80 sm:w-auto"
                    >
                      Xoá bộ lọc
                    </button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
                    <label className="block">
                      <span className="text-sm font-semibold text-ink">
                        Tìm kiếm
                      </span>
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        type="search"
                        className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                        placeholder="Tìm theo người nhận hoặc mô tả..."
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-ink">
                        Loại giao dịch
                      </span>
                      <select
                        value={typeFilter}
                        onChange={(event) =>
                          setTypeFilter(
                            event.target.value as typeof typeFilter
                          )
                        }
                        className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                      >
                        <option value="all">Tất cả</option>
                        <option value="expense">Chi tiêu</option>
                        <option value="income">Thu nhập</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-ink">
                        Danh mục
                      </span>
                      <select
                        value={categoryFilter}
                        onChange={(event) =>
                          setCategoryFilter(event.target.value)
                        }
                        className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                      >
                        <option value="all">Tất cả danh mục</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-ink">
                        Tháng
                      </span>
                      <select
                        value={monthFilter}
                        onChange={(event) => setMonthFilter(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                      >
                        <option value="all">Tất cả thời gian</option>
                        {monthOptions.map((month) => (
                          <option key={month} value={month}>
                            {formatMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="rounded-3xl border border-emerald/10 bg-leaf/70 px-5 py-10 text-center">
                    <p className="font-semibold text-ink">
                      Không tìm thấy giao dịch phù hợp
                    </p>
                    <p className="mt-2 text-sm text-ink/60">
                      Hãy thử đổi từ khoá, danh mục, loại giao dịch hoặc tháng.
                    </p>
                  </div>
                ) : (
                  <>
                <div className="hidden overflow-hidden rounded-3xl border border-emerald/10 md:block">
                  <table className="w-full border-collapse bg-white text-left text-sm">
                    <thead className="bg-leaf text-xs uppercase text-emerald">
                      <tr>
                        <th className="px-4 py-4 font-semibold">Thời gian</th>
                        <th className="px-4 py-4 font-semibold">Số tiền</th>
                        <th className="px-4 py-4 font-semibold">Loại</th>
                        <th className="px-4 py-4 font-semibold">Người nhận</th>
                        <th className="px-4 py-4 font-semibold">Ngân hàng</th>
                        <th className="px-4 py-4 font-semibold">Danh mục</th>
                        <th className="px-4 py-4 font-semibold">Mô tả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald/10">
                      {filteredTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="transition hover:bg-leaf/50"
                        >
                          <td className="px-4 py-4 text-ink/70">
                            {formatDate(transaction.transaction_time)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-emerald">
                            {formatAmount(transaction.amount)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${transactionTypeBadgeClass(
                                transaction.transaction_type
                              )}`}
                            >
                              {transactionTypeLabel(
                                transaction.transaction_type
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {displayValue(transaction.receiver_name)}
                          </td>
                          <td className="px-4 py-4 text-ink/70">
                            {displayValue(transaction.receiver_bank)}
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                              {displayValue(transaction.category)}
                            </span>
                          </td>
                          <td className="max-w-xs px-4 py-4 text-ink/70">
                            {displayValue(transaction.description)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-4 md:hidden">
                  {filteredTransactions.map((transaction) => (
                    <article
                      key={transaction.id}
                      className="rounded-3xl border border-emerald/10 bg-white p-5 shadow-lg shadow-emerald-900/5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-ink/55">
                            {formatDate(transaction.transaction_time)}
                          </p>
                          <h2 className="mt-2 font-semibold text-ink">
                            {displayValue(transaction.receiver_name)}
                          </h2>
                        </div>
                        <p className="whitespace-nowrap text-sm font-semibold text-emerald">
                          {formatAmount(transaction.amount)}
                        </p>
                      </div>

                      <dl className="mt-5 grid gap-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-ink/55">Loại</dt>
                          <dd className="text-right">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${transactionTypeBadgeClass(
                                transaction.transaction_type
                              )}`}
                            >
                              {transactionTypeLabel(
                                transaction.transaction_type
                              )}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-ink/55">Ngân hàng</dt>
                          <dd className="text-right font-medium">
                            {displayValue(transaction.receiver_bank)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-ink/55">Danh mục</dt>
                          <dd className="text-right font-medium">
                            {displayValue(transaction.category)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink/55">Mô tả</dt>
                          <dd className="mt-1 font-medium">
                            {displayValue(transaction.description)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
