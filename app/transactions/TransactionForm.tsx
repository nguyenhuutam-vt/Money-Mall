"use client";

import { FormEventHandler, useState } from "react";
import { suggestTransactionCategory } from "@/lib/categorization";

export type TransactionFormValues = {
  transaction_type?: "expense" | "income" | null;
  amount?: number;
  transaction_time?: string;
  receiver_name?: string | null;
  receiver_bank?: string | null;
  description?: string | null;
  category?: string | null;
};

type TransactionFormProps = {
  initialValues?: TransactionFormValues;
  isSubmitting: boolean;
  errorMessage: string;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  enableCategorySuggestion?: boolean;
  showCancel?: boolean;
};

function formatDateTimeLocal(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

function isMissingCategory(category: string) {
  return (
    !category.trim() ||
    category.trim().toLocaleLowerCase("vi-VN") ===
      "Chưa có".toLocaleLowerCase("vi-VN")
  );
}

export default function TransactionForm({
  initialValues,
  isSubmitting,
  errorMessage,
  submitLabel,
  submittingLabel,
  onSubmit,
  enableCategorySuggestion = false,
  showCancel = false
}: TransactionFormProps) {
  const initialTransactionType = initialValues?.transaction_type ?? "expense";
  const initialReceiverName = initialValues?.receiver_name ?? "";
  const initialDescription = initialValues?.description ?? "";
  const initialCategory = initialValues?.category ?? "";
  const [transactionType, setTransactionType] = useState(initialTransactionType);
  const [receiverName, setReceiverName] = useState(initialReceiverName);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(() => {
    if (!enableCategorySuggestion || !isMissingCategory(initialCategory)) {
      return initialCategory;
    }

    return suggestTransactionCategory({
      receiver_name: initialReceiverName,
      description: initialDescription,
      transaction_type: initialTransactionType
    });
  });
  const [hasEditedCategory, setHasEditedCategory] = useState(false);

  function updateSuggestedCategory(
    nextTransactionType: "expense" | "income",
    nextReceiverName: string,
    nextDescription: string
  ) {
    if (!enableCategorySuggestion || hasEditedCategory) {
      return;
    }

    setCategory(
      suggestTransactionCategory({
        receiver_name: nextReceiverName,
        description: nextDescription,
        transaction_type: nextTransactionType
      })
    );
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm font-semibold text-ink">Loại giao dịch</span>
        <select
          required
          name="transaction_type"
          value={transactionType}
          onChange={(event) => {
            const nextTransactionType =
              event.target.value === "income" ? "income" : "expense";

            setTransactionType(nextTransactionType);
            updateSuggestedCategory(
              nextTransactionType,
              receiverName,
              description
            );
          }}
          className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
        >
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Số tiền</span>
          <input
            required
            min="1"
            name="amount"
            type="number"
            defaultValue={initialValues?.amount}
            className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
            placeholder="50000"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">
            Ngày giao dịch
          </span>
          <input
            required
            name="transaction_time"
            type="datetime-local"
            defaultValue={formatDateTimeLocal(initialValues?.transaction_time)}
            className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
          />
        </label>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Người nhận</span>
          <input
            name="receiver_name"
            type="text"
            value={receiverName}
            onChange={(event) => {
              const nextReceiverName = event.target.value;

              setReceiverName(nextReceiverName);
              updateSuggestedCategory(
                transactionType,
                nextReceiverName,
                description
              );
            }}
            className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
            placeholder="Nguyễn Văn A"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-ink">
            Ngân hàng người nhận
          </span>
          <input
            name="receiver_bank"
            type="text"
            defaultValue={initialValues?.receiver_bank ?? ""}
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
          value={category}
          onChange={(event) => {
            setHasEditedCategory(true);
            setCategory(event.target.value);
          }}
          className="mt-2 w-full rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
          placeholder="Ăn uống"
        />
        {enableCategorySuggestion ? (
          <p className="mt-2 text-xs font-medium text-emerald">
            Gợi ý tự động, bạn có thể sửa lại
          </p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-ink">Mô tả</span>
        <textarea
          name="description"
          rows={4}
          value={description}
          onChange={(event) => {
            const nextDescription = event.target.value;

            setDescription(nextDescription);
            updateSuggestedCategory(
              transactionType,
              receiverName,
              nextDescription
            );
          }}
          className="mt-2 w-full resize-none rounded-2xl border border-emerald/15 bg-leaf/40 px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:bg-white focus:ring-4 focus:ring-emerald/10"
          placeholder="Ghi chú ngắn cho giao dịch"
        />
      </label>

      {errorMessage ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <div className={showCancel ? "flex flex-col-reverse gap-3 sm:flex-row" : ""}>
        {showCancel ? (
          <a
            href="/transactions"
            className="inline-flex flex-1 justify-center rounded-full border border-emerald/20 bg-white px-6 py-3.5 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 transition hover:border-emerald/35 hover:bg-leaf"
          >
            Huỷ
          </a>
        ) : null}
        <button
          disabled={isSubmitting}
          type="submit"
          className={`${showCancel ? "flex-1" : "w-full"} rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0`}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </form>
  );
}
