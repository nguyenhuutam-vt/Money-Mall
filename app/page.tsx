import { getSupabaseClient, getSupabaseConfigError } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function checkSupabaseConnection() {
  const configError = getSupabaseConfigError();

  if (configError) {
    return {
      isConnected: false,
      message: "Chưa cấu hình Supabase"
    };
  }

  const { error } = await getSupabaseClient()
    .from("transactions")
    .select("id", { count: "exact", head: true });

  if (error) {
    return {
      isConnected: false,
      message: "Không thể kết nối Supabase"
    };
  }

  return {
    isConnected: true,
    message: "Đã kết nối Supabase"
  };
}

const features = [
  {
    title: "Ghi giao dịch thủ công",
    description:
      "Nhập khoản chi, thu nhập, danh mục và ghi chú chỉ trong vài bước đơn giản.",
    status: "MVP"
  },
  {
    title: "Đồng bộ biên lai Gmail",
    description:
      "Giai đoạn sau sẽ đọc email biên lai ngân hàng và gợi ý giao dịch để bạn xác nhận.",
    status: "Sắp tới"
  },
  {
    title: "Dashboard chi tiêu",
    description:
      "Theo dõi tổng chi, xu hướng và nhóm chi tiêu nổi bật bằng các biểu đồ dễ hiểu.",
    status: "Sắp tới"
  }
];

const sampleTransactions = [
  {
    name: "Cà phê sáng",
    category: "Ăn uống",
    amount: "-35.000 VND"
  },
  {
    name: "Chuyển khoản nhận lương",
    category: "Thu nhập",
    amount: "+18.500.000 VND"
  },
  {
    name: "Di chuyển Grab",
    category: "Đi lại",
    amount: "-72.000 VND"
  }
];

const spendingGroups = [
  {
    name: "Ăn uống",
    amount: "1.240.000",
    width: "w-[72%]"
  },
  {
    name: "Đi lại",
    amount: "680.000",
    width: "w-[44%]"
  },
  {
    name: "Mua sắm",
    amount: "920.000",
    width: "w-[58%]"
  }
];

const roadmap = [
  {
    stage: "Giai đoạn 1",
    title: "Nhập giao dịch thủ công",
    description:
      "Tạo nền tảng dữ liệu rõ ràng với form nhập giao dịch đơn giản, dễ dùng."
  },
  {
    stage: "Giai đoạn 2",
    title: "Đọc biên lai từ Gmail",
    description:
      "Kết nối Gmail để phát hiện email biên lai chuyển khoản và trích xuất thông tin."
  },
  {
    stage: "Giai đoạn 3",
    title: "Tự động phân loại chi tiêu",
    description:
      "Gợi ý danh mục, tổng hợp thống kê và giúp bạn hiểu thói quen chi tiêu."
  }
];

export default async function Home() {
  const supabaseStatus = await checkSupabaseConnection();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_8%,#bbf7d0_0,transparent_30%),radial-gradient(circle_at_82%_18%,#ccfbf1_0,transparent_28%),linear-gradient(135deg,#f0fdf4_0%,#ffffff_46%,#ecfdf5_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-soft-grid opacity-70" />
      <div className="pointer-events-none absolute left-[-140px] top-10 h-96 w-96 rounded-full bg-mint/30 blur-3xl animate-soft-float" />
      <div className="pointer-events-none absolute right-[-120px] top-36 h-[28rem] w-[28rem] rounded-full bg-emerald/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute bottom-32 left-[42%] h-80 w-80 rounded-full bg-lime-200/35 blur-3xl animate-soft-float animation-delay-500" />
      <div className="pointer-events-none absolute left-[8%] top-[48rem] h-40 w-40 rounded-full bg-emerald/10 blur-2xl animate-soft-float animation-delay-300" />
      <div className="pointer-events-none absolute right-[16%] top-[64rem] h-52 w-52 rounded-full bg-mint/20 blur-3xl animate-pulse-glow" />

      <section className="relative">
        <div className="mx-auto grid min-h-screen max-w-7xl gap-12 px-6 py-6 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-10">
          <div className="flex flex-col justify-center">
            <nav className="mb-14 flex items-center justify-between rounded-full border border-white/80 bg-white/75 px-4 py-3 text-sm shadow-xl shadow-emerald-900/10 backdrop-blur-2xl animate-fade-up">
              <span className="font-semibold text-ink">
                Expense Mail App
              </span>
              <span className="rounded-full bg-emerald/10 px-3 py-1 font-medium text-emerald">
                MVP
              </span>
            </nav>

            <div className="relative rounded-[2.25rem] border border-white/75 bg-white/45 p-5 shadow-2xl shadow-emerald-900/10 backdrop-blur-2xl sm:p-7 animate-fade-up animation-delay-150">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <p className="mb-5 w-fit rounded-full border border-emerald/15 bg-white/75 px-4 py-2 text-sm font-semibold text-emerald shadow-sm shadow-emerald-900/5 backdrop-blur">
                Ứng dụng quản lý chi tiêu cho người Việt
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
                Quản lý chi tiêu tự động từ biên lai ngân hàng
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink/70">
                Ghi lại giao dịch thủ công hôm nay, sau đó kết nối Gmail để tự
                động đọc biên lai chuyển khoản.
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row animate-fade-up animation-delay-500">
              <a
                href="/transactions/new"
                className="rounded-full bg-gradient-to-r from-emerald to-mint px-6 py-3 text-center text-sm font-semibold text-white shadow-xl shadow-emerald-600/25 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-600/35 active:translate-y-0"
              >
                Bắt đầu ghi giao dịch
              </a>
              <a
                href="/transactions"
                className="rounded-full border border-emerald/20 bg-white/80 px-6 py-3 text-center text-sm font-semibold text-emerald shadow-lg shadow-emerald-900/5 backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald/40 hover:bg-white hover:shadow-xl hover:shadow-emerald-900/10 active:translate-y-0"
              >
                Xem giao dịch
              </a>
            </div>

            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-3 text-center animate-fade-up animation-delay-500">
              <div className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
                <dt className="text-xs text-ink/55">Trạng thái</dt>
                <dd className="mt-1 font-semibold text-emerald">MVP</dd>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
                <dt className="text-xs text-ink/55">Supabase</dt>
                <dd
                  className={`mt-1 font-semibold ${
                    supabaseStatus.isConnected ? "text-emerald" : "text-red-500"
                  }`}
                >
                  {supabaseStatus.message}
                </dd>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/65 p-4 shadow-lg shadow-emerald-900/5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/90">
                <dt className="text-xs text-ink/55">Gmail API</dt>
                <dd className="mt-1 font-semibold text-ink">Sau</dd>
              </div>
            </dl>
          </div>

          <aside
            id="preview"
            className="relative self-center animate-fade-up animation-delay-300"
            aria-label="Bản xem trước thống kê chi tiêu"
          >
            <div className="absolute -left-6 top-14 z-10 hidden rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl lg:block animate-soft-float">
              <p className="text-xs font-medium text-ink/50">
                Tiết kiệm dự kiến
              </p>
              <p className="mt-1 text-xl font-semibold text-emerald">
                +1.240.000 VND
              </p>
            </div>

            <div className="absolute -right-3 bottom-12 z-10 hidden rounded-3xl border border-white/70 bg-white/75 px-5 py-4 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl sm:block animate-soft-float animation-delay-500">
              <p className="text-xs font-medium text-ink/50">Đã ghi hôm nay</p>
              <p className="mt-1 text-xl font-semibold text-ink">7 giao dịch</p>
            </div>

            <div className="rounded-[2.25rem] border border-white/80 bg-white/65 p-3 shadow-[0_28px_90px_rgba(6,95,70,0.16)] backdrop-blur-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_36px_110px_rgba(6,95,70,0.22)] sm:p-4">
              <div className="mb-3 flex items-center gap-2 px-3 pt-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald/35" />
                <span className="h-2.5 w-2.5 rounded-full bg-mint/45" />
                <span className="h-2.5 w-2.5 rounded-full bg-lime-300/65" />
                <span className="ml-auto rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                  Live preview
                </span>
              </div>

              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald via-emerald to-mint p-6 text-white shadow-2xl shadow-emerald-600/25">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/75">Tổng chi tháng này</p>
                    <p className="mt-3 text-3xl font-semibold sm:text-4xl">
                      3.842.000 VND
                    </p>
                  </div>
                  <span className="rounded-full border border-white/30 bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
                    MVP
                  </span>
                </div>

                <div className="mt-7 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <p className="text-xs text-white/70">Đã chi</p>
                    <p className="mt-1 font-semibold">62%</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <p className="text-xs text-white/70">Còn lại</p>
                    <p className="mt-1 font-semibold">2.1M</p>
                  </div>
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <p className="text-xs text-white/70">Tuần này</p>
                    <p className="mt-1 font-semibold">840K</p>
                  </div>
                </div>

                <div className="mt-6 flex h-24 items-end gap-2 rounded-3xl bg-white/10 p-3">
                  <div className="h-[34%] flex-1 rounded-t-full bg-white/45" />
                  <div className="h-[52%] flex-1 rounded-t-full bg-white/60" />
                  <div className="h-[42%] flex-1 rounded-t-full bg-white/50" />
                  <div className="h-[75%] flex-1 rounded-t-full bg-white/90" />
                  <div className="h-[58%] flex-1 rounded-t-full bg-white/65" />
                  <div className="h-[82%] flex-1 rounded-t-full bg-white/95" />
                  <div className="h-[48%] flex-1 rounded-t-full bg-white/55" />
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full w-[62%] rounded-full bg-white/90 shadow-lg shadow-white/30" />
                </div>
                <p className="mt-3 text-sm text-white/75">
                  62% ngân sách tháng đã được ghi nhận
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {spendingGroups.map((group) => (
                  <div
                    key={group.name}
                    className="rounded-3xl border border-emerald/10 bg-white/80 p-4 shadow-sm shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-ink/55">
                        {group.name}
                      </p>
                      <p className="text-xs font-semibold text-emerald">
                        {group.amount}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-emerald/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-emerald to-mint ${group.width}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[1.75rem] border border-emerald/10 bg-white/85 p-4 shadow-inner shadow-emerald-900/5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-ink">Giao dịch gần đây</h2>
                  <span className="rounded-full bg-emerald/10 px-3 py-1 text-sm font-semibold text-emerald">
                    Thủ công
                  </span>
                </div>

                <div className="space-y-3">
                  {sampleTransactions.map((transaction) => (
                    <div
                      key={transaction.name}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-transparent bg-leaf/70 px-4 py-3 shadow-sm shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/10 hover:bg-white hover:shadow-lg hover:shadow-emerald-900/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-emerald shadow-sm">
                        {transaction.category.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-medium text-ink">
                          {transaction.name}
                        </p>
                        <p className="mt-1 text-sm text-ink/55">
                          {transaction.category}
                        </p>
                      </div>
                      <p
                        className={`text-right text-sm font-semibold ${
                          transaction.amount.startsWith("+")
                            ? "text-emerald"
                            : "text-ink"
                        }`}
                      >
                        {transaction.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="features"
        className="relative mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-10"
      >
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-semibold uppercase text-emerald">
            Tính năng
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            Bắt đầu nhỏ, mở rộng đúng lúc.
          </h2>
          <p className="mt-4 leading-7 text-ink/65">
            MVP tập trung vào trải nghiệm ghi chép rõ ràng trước, sau đó mới
            thêm tự động hóa khi dữ liệu và luồng sử dụng đã ổn định.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-[1.5rem] border border-emerald/10 bg-white/80 p-6 shadow-sm shadow-emerald-900/5 backdrop-blur transition duration-300 hover:-translate-y-2 hover:border-emerald/20 hover:shadow-xl hover:shadow-emerald-900/10"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/10 text-lg font-semibold text-emerald transition duration-300 group-hover:scale-110 group-hover:bg-emerald group-hover:text-white">
                {feature.title.slice(0, 1)}
              </div>
              <div className="mb-4 flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold text-ink">
                  {feature.title}
                </h3>
                <span className="shrink-0 rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-emerald">
                  {feature.status}
                </span>
              </div>
              <p className="leading-7 text-ink/65">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="roadmap" className="relative px-6 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-emerald/10 bg-white/70 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold uppercase text-emerald">
              Roadmap
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
              Lộ trình phát triển MVP
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {roadmap.map((item, index) => (
              <article
                key={item.title}
                className="relative rounded-[1.5rem] bg-gradient-to-br from-white to-leaf p-6 shadow-sm shadow-emerald-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
              >
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald text-sm font-semibold text-white shadow-lg shadow-emerald-600/25">
                    {index + 1}
                  </span>
                  <p className="font-semibold text-emerald">{item.stage}</p>
                </div>
                <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-3 leading-7 text-ink/65">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
