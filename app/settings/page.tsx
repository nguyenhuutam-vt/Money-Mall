"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

type BankAccount = {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string | null;
  nickname: string | null;
  is_primary: boolean | null;
};

type BankAccountForm = {
  bank_name: string;
  account_number: string;
  account_holder: string;
  nickname: string;
  is_primary: boolean;
};

function createEmptyForm(): BankAccountForm {
  return {
    account_holder: "",
    account_number: "",
    bank_name: "",
    is_primary: false,
    nickname: ""
  };
}

function maskAccountNumber(accountNumber: string) {
  const trimmedAccountNumber = accountNumber.trim();

  if (trimmedAccountNumber.length <= 4) {
    return trimmedAccountNumber;
  }

  if (trimmedAccountNumber.length <= 8) {
    return `${"*".repeat(trimmedAccountNumber.length - 2)}${trimmedAccountNumber.slice(-2)}`;
  }

  return `${trimmedAccountNumber.slice(0, 2)}${"*".repeat(6)}${trimmedAccountNumber.slice(-4)}`;
}

function optionalText(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}

function displayValue(value: string | null) {
  return value?.trim() ? value : "Chưa có";
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState<BankAccountForm>(createEmptyForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null
  );
  const [isLoginRequired, setIsLoginRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isCurrentRequest = true;

    async function fetchAccounts() {
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
        setAccounts([]);
        setIsLoginRequired(true);
        setIsLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from("bank_accounts")
        .select(
          "id, bank_name, account_number, account_holder, nickname, is_primary"
        )
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });

      if (!isCurrentRequest) {
        return;
      }

      if (error) {
        setErrorMessage(
          "Không thể tải danh sách tài khoản ngân hàng. Vui lòng thử lại."
        );
        setAccounts([]);
      } else {
        setAccounts((data ?? []) as BankAccount[]);
      }

      setIsLoading(false);
    }

    fetchAccounts();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  async function reloadAccounts(userId: string) {
    const { data, error } = await getSupabaseClient()
      .from("bank_accounts")
      .select(
        "id, bank_name, account_number, account_holder, nickname, is_primary"
      )
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(
        "Đã lưu nhưng không thể tải lại danh sách tài khoản ngân hàng."
      );
      return false;
    }

    setAccounts((data ?? []) as BankAccount[]);
    return true;
  }

  function updateFormField<Field extends keyof BankAccountForm>(
    field: Field,
    value: BankAccountForm[Field]
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUserId) {
      setErrorMessage("Vui lòng đăng nhập để quản lý tài khoản ngân hàng.");
      return;
    }

    const bankName = form.bank_name.trim();
    const accountNumber = form.account_number.trim();

    if (!bankName || !accountNumber) {
      setErrorMessage("Vui lòng nhập ngân hàng và số tài khoản.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      account_holder: optionalText(form.account_holder),
      account_number: accountNumber,
      bank_name: bankName,
      is_primary: form.is_primary,
      nickname: optionalText(form.nickname),
      updated_at: new Date().toISOString()
    };

    const saveRequest = editingAccountId
      ? getSupabaseClient()
          .from("bank_accounts")
          .update(payload)
          .eq("id", editingAccountId)
          .eq("user_id", currentUserId)
      : getSupabaseClient()
          .from("bank_accounts")
          .insert({
            ...payload,
            user_id: currentUserId
          });

    const { error } = await saveRequest;

    if (error) {
      setErrorMessage(
        editingAccountId
          ? "Không thể cập nhật tài khoản ngân hàng. Vui lòng thử lại."
          : "Không thể thêm tài khoản ngân hàng. Vui lòng kiểm tra thông tin và thử lại."
      );
      setIsSaving(false);
      return;
    }

    await reloadAccounts(currentUserId);
    setForm(createEmptyForm());
    setEditingAccountId(null);
    setSuccessMessage(
      editingAccountId ? "Đã cập nhật tài khoản" : "Đã thêm tài khoản"
    );
    setIsSaving(false);
  }

  function handleEdit(account: BankAccount) {
    setForm({
      account_holder: account.account_holder ?? "",
      account_number: account.account_number,
      bank_name: account.bank_name,
      is_primary: Boolean(account.is_primary),
      nickname: account.nickname ?? ""
    });
    setEditingAccountId(account.id);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleCancelEdit() {
    setForm(createEmptyForm());
    setEditingAccountId(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleDelete(account: BankAccount) {
    if (!currentUserId) {
      setErrorMessage("Vui lòng đăng nhập để xoá tài khoản ngân hàng.");
      return;
    }

    const shouldDelete = window.confirm(
      `Xoá tài khoản ${account.bank_name} - ${maskAccountNumber(account.account_number)}?`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingAccountId(account.id);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await getSupabaseClient()
      .from("bank_accounts")
      .delete()
      .eq("id", account.id)
      .eq("user_id", currentUserId);

    if (error) {
      setErrorMessage("Không thể xoá tài khoản ngân hàng. Vui lòng thử lại.");
      setDeletingAccountId(null);
      return;
    }

    await reloadAccounts(currentUserId);

    if (editingAccountId === account.id) {
      setForm(createEmptyForm());
      setEditingAccountId(null);
    }

    setSuccessMessage("Đã xoá tài khoản");
    setDeletingAccountId(null);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_48%,#ecfdf5_100%)] px-6 py-8 text-ink sm:py-12">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur sm:p-8">
          <p className="text-sm font-semibold uppercase text-emerald">
            Settings
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Cài đặt
          </h1>
          <div className="mt-6 max-w-3xl">
            <h2 className="text-xl font-semibold text-ink">
              Tài khoản ngân hàng của tôi
            </h2>
            <p className="mt-2 leading-7 text-ink/65">
              App dùng thông tin này để phân biệt tiền vào và tiền ra khi đọc
              biên lai Gmail.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 px-6 py-10 text-center shadow-xl shadow-emerald-900/5">
            <p className="text-sm font-semibold text-emerald">
              Đang tải cài đặt...
            </p>
          </div>
        ) : isLoginRequired ? (
          <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-8 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur">
            <p className="text-lg font-semibold text-ink">
              Vui lòng đăng nhập để quản lý tài khoản ngân hàng
            </p>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-ink/60">
              Đăng nhập bằng Google để lưu thông tin tài khoản ngân hàng của
              riêng bạn.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <form
              onSubmit={handleSubmit}
              className="rounded-[2rem] border border-emerald/10 bg-white/90 p-5 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6"
            >
              <div className="grid gap-4">
                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Ngân hàng
                  </span>
                  <input
                    type="text"
                    value={form.bank_name}
                    onChange={(event) =>
                      updateFormField("bank_name", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                    placeholder="Vietcombank"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Số tài khoản
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.account_number}
                    onChange={(event) =>
                      updateFormField("account_number", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                    placeholder="0123456789"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Tên chủ tài khoản
                  </span>
                  <input
                    type="text"
                    value={form.account_holder}
                    onChange={(event) =>
                      updateFormField("account_holder", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                    placeholder="Nguyễn Văn A"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-ink">
                    Tên gợi nhớ
                  </span>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(event) =>
                      updateFormField("nickname", event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-emerald/15 bg-white px-4 py-3 text-ink outline-none transition placeholder:text-ink/35 focus:border-emerald focus:ring-4 focus:ring-emerald/10"
                    placeholder="Tài khoản nhận lương"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-emerald/10 bg-leaf/55 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.is_primary}
                    onChange={(event) =>
                      updateFormField("is_primary", event.target.checked)
                    }
                    className="h-5 w-5 rounded border-emerald/25 text-emerald accent-emerald"
                  />
                  <span className="text-sm font-semibold text-ink">
                    Tài khoản chính
                  </span>
                </label>
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0 sm:w-auto"
                >
                  {isSaving
                    ? "Đang lưu..."
                    : editingAccountId
                      ? "Lưu thay đổi"
                      : "Thêm tài khoản"}
                </button>

                {editingAccountId ? (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="inline-flex w-full items-center justify-center rounded-full border border-emerald/15 bg-white px-6 py-3.5 text-sm font-semibold text-emerald transition hover:border-emerald/30 hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
                  >
                    Huỷ
                  </button>
                ) : null}
              </div>
            </form>

            <div className="rounded-[2rem] border border-emerald/10 bg-white/90 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur sm:p-6">
              {accounts.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-emerald/20 bg-leaf/45 px-5 py-8 text-center">
                  <p className="font-semibold text-ink">
                    Chưa có tài khoản ngân hàng
                  </p>
                  <p className="mt-2 text-sm leading-6 text-ink/60">
                    Thêm tài khoản của bạn để app nhận diện chiều giao dịch từ
                    biên lai Gmail.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="grid gap-4 rounded-3xl border border-emerald/10 bg-leaf/45 p-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-ink">
                            {account.bank_name}
                          </p>
                          {account.is_primary ? (
                            <span className="rounded-full border border-emerald/15 bg-white px-2.5 py-1 text-xs font-semibold text-emerald">
                              Chính
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 font-mono text-sm font-semibold text-ink/70">
                          {maskAccountNumber(account.account_number)}
                        </p>
                      </div>

                      <div className="min-w-0 text-sm text-ink/65">
                        <p className="truncate">
                          Chủ TK:{" "}
                          <span className="font-semibold text-ink">
                            {displayValue(account.account_holder)}
                          </span>
                        </p>
                        <p className="mt-1 truncate">
                          Gợi nhớ:{" "}
                          <span className="font-semibold text-ink">
                            {displayValue(account.nickname)}
                          </span>
                        </p>
                      </div>

                      <div className="flex gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => handleEdit(account)}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald/15 bg-white px-4 py-2.5 text-sm font-semibold text-emerald transition hover:border-emerald/30 hover:bg-white/80 md:flex-none"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(account)}
                          disabled={deletingAccountId === account.id}
                          className="inline-flex flex-1 items-center justify-center rounded-full border border-red-100 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-65 md:flex-none"
                        >
                          {deletingAccountId === account.id
                            ? "Đang xoá..."
                            : "Xoá"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
