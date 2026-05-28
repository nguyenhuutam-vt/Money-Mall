"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";
import { getVietnamMonthValue } from "@/lib/transactionDates";

type Budget = {
  id: string;
  category: string;
  month: string;
  amount: number | string;
};

const CATEGORIES = [
  "Ăn uống",
  "Di chuyển",
  "Mua sắm",
  "Siêu thị",
  "Nhà cửa",
  "Chuyển khoản cá nhân",
  "Hoá đơn",
  "Giải trí",
  "Sức khoẻ",
  "Giáo dục",
  "Khác"
];

function getCurrentMonthValue() {
  return getVietnamMonthValue(new Date()) ?? "";
}

function formatAmount(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "Chưa có";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(amount);
}

function toBudgetInputs(budgets: Budget[]) {
  return CATEGORIES.reduce<Record<string, string>>((values, category) => {
    const savedBudget = budgets.find((budget) => budget.category === category);

    values[category] =
      savedBudget && savedBudget.amount !== null
        ? String(savedBudget.amount)
        : "";

    return values;
  }, {});
}

export default function BudgetsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>(
    () => toBudgetInputs([])
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoginRequired, setIsLoginRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;

    async function fetchBudgets() {
      const configError = getSupabaseConfigError();

      if (configError) {
        setErrorMessage(
          "Chưa cấu hình Supabase. Vui lòng kiểm tra biến môi trường."
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoginRequired(false);

      const supabase = getSupabaseClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      const user = userData.user;

      if (!isCurrentRequest) {
        return;
      }

      if (userError || !user) {
        setCurrentUserId(null);
        setBudgets([]);
        setBudgetInputs(toBudgetInputs([]));
        setIsLoginRequired(true);
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      if (!selectedMonth) {
        setBudgets([]);
        setBudgetInputs(toBudgetInputs([]));
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("budgets")
        .select("id, category, month, amount")
        .eq("user_id", user.id)
        .eq("month", selectedMonth)
        .order("category", { ascending: true });

      if (!isCurrentRequest) {
        return;
      }

      if (error) {
        setErrorMessage("Không thể tải ngân sách. Vui lòng thử lại.");
        setBudgets([]);
        setBudgetInputs(toBudgetInputs([]));
      } else {
        const savedBudgets = (data ?? []) as Budget[];
        setBudgets(savedBudgets);
        setBudgetInputs(toBudgetInputs(savedBudgets));
      }

      setIsLoading(false);
    }

    fetchBudgets();

    return () => {
      isCurrentRequest = false;
    };
  }, [selectedMonth]);

  const savedBudgetByCategory = useMemo(() => {
    return new Map(budgets.map((budget) => [budget.category, budget]));
  }, [budgets]);

  async function handleSave() {
    if (!currentUserId) {
      setErrorMessage("Vui lòng đăng nhập để lưu ngân sách.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedMonth) {
      setErrorMessage("Vui lòng chọn tháng.");
      setIsSaving(false);
      return;
    }

    const rows = CATEGORIES.map((category) => {
      const value = budgetInputs[category]?.trim() ?? "";
      const amount = Number(value);

      return {
        amount,
        category,
        value
      };
    }).filter((row) => row.value !== "");

    if (rows.length === 0) {
      setErrorMessage("Vui lòng nhập ít nhất một ngân sách.");
      setIsSaving(false);
      return;
    }

    if (rows.some((row) => !Number.isFinite(row.amount) || row.amount < 0)) {
      setErrorMessage("Số tiền ngân sách không hợp lệ.");
      setIsSaving(false);
      return;
    }

    const updatedAt = new Date().toISOString();
    const { error } = await getSupabaseClient().from("budgets").upsert(
      rows.map((row) => ({
        amount: row.amount,
        category: row.category,
        month: selectedMonth,
        updated_at: updatedAt,
        user_id: currentUserId
      })),
      { onConflict: "user_id,category,month" }
    );

    if (error) {
      setErrorMessage("Không thể lưu ngân sách. Vui lòng thử lại.");
      setIsSaving(false);
      return;
    }

    const { data, error: reloadError } = await getSupabaseClient()
      .from("budgets")
      .select("id, category, month, amount")
      .eq("user_id", currentUserId)
      .eq("month", selectedMonth)
      .order("category", { ascending: true });

    if (reloadError) {
      setErrorMessage("Đã lưu nhưng không thể tải lại ngân sách.");
    } else {
      const savedBudgets = (data ?? []) as Budget[];
      setBudgets(savedBudgets);
      setBudgetInputs(toBudgetInputs(savedBudgets));
      setSuccessMessage("Đã lưu ngân sách");
    }

    setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-emerald">
                Budget
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
                Ngân sách tháng
              </h1>
              <p className="mt-3 leading-7 text-ink/65">
                Đặt giới hạn chi tiêu cho từng danh mục
              </p>
            </div>

            <label className="block md:w-56">
              <span className="text-sm font-semibold text-ink">
                Chọn tháng
              </span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-4 focus:ring-emerald/10"
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 px-6 py-10 text-center shadow-xl shadow-emerald-900/5">
            <p className="text-sm font-semibold text-emerald">
              Đang tải ngân sách...
            </p>
          </div>
        ) : isLoginRequired ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur">
            <p className="text-lg font-semibold text-ink">
              Vui lòng đăng nhập để quản lý ngân sách
            </p>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">
              Đăng nhập bằng Google để lưu ngân sách theo tài khoản của bạn.
            </p>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6">
            <div className="space-y-3">
              {CATEGORIES.map((category) => {
                const savedBudget = savedBudgetByCategory.get(category);

                return (
                  <div
                    key={category}
                    className="grid gap-3 rounded-3xl border border-emerald/10 bg-leaf/45 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{category}</p>
                      <p className="mt-1 text-sm text-ink/55">
                        Đã lưu:{" "}
                        <span className="font-semibold text-emerald">
                          {savedBudget
                            ? formatAmount(savedBudget.amount)
                            : "Chưa có"}
                        </span>
                      </p>
                    </div>

                    <label className="block">
                      <span className="sr-only">
                        Ngân sách cho {category}
                      </span>
                      <input
                        min="0"
                        type="number"
                        inputMode="numeric"
                        value={budgetInputs[category] ?? ""}
                        onChange={(event) =>
                          setBudgetInputs((currentInputs) => ({
                            ...currentInputs,
                            [category]: event.target.value
                          }))
                        }
                        className="w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                        placeholder="500000"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {errorMessage ? (
              <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-5 rounded-2xl bg-emerald/10 px-4 py-3 text-sm font-semibold text-emerald">
                {successMessage}
              </p>
            ) : null}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="mt-6 w-full rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 sm:w-auto"
            >
              {isSaving ? "Đang lưu..." : "Lưu ngân sách"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
