export type TransactionCategory =
  | "Ăn uống"
  | "Di chuyển"
  | "Mua sắm"
  | "Siêu thị"
  | "Nhà cửa"
  | "Chuyển khoản cá nhân"
  | "Hoá đơn"
  | "Giải trí"
  | "Sức khoẻ"
  | "Giáo dục"
  | "Thu nhập"
  | "Khác";

export type TransactionCategoryInput = {
  receiver_name?: string | null;
  receiver_bank?: string | null;
  description?: string | null;
  transaction_type?: "expense" | "income" | string | null;
};

type CategoryRule = {
  category: TransactionCategory;
  keywords: string[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Ăn uống",
    keywords: [
      "cafe",
      "coffee",
      "trà sữa",
      "tra sua",
      "highlands",
      "phuc long",
      "starbucks",
      "food",
      "restaurant",
      "ăn",
      "an",
      "uống",
      "uong"
    ]
  },
  {
    category: "Siêu thị",
    keywords: [
      "bách hóa xanh",
      "bach hoa xanh",
      "coopmart",
      "winmart",
      "lotte mart",
      "aeon"
    ]
  },
  {
    category: "Di chuyển",
    keywords: ["grab", "be", "gojek", "taxi", "xe", "xăng", "xang", "petrol"]
  },
  {
    category: "Hoá đơn",
    keywords: [
      "điện",
      "dien",
      "nước",
      "nuoc",
      "internet",
      "wifi",
      "điện thoại",
      "dien thoai",
      "mobifone",
      "vinaphone",
      "viettel"
    ]
  },
  {
    category: "Chuyển khoản cá nhân",
    keywords: [
      "chuyen tien",
      "chuyển tiền",
      "nguoi than",
      "người thân",
      "cá nhân",
      "ca nhan"
    ]
  },
  {
    category: "Giải trí",
    keywords: ["netflix", "spotify", "cinema", "rạp phim", "rap phim", "game"]
  },
  {
    category: "Mua sắm",
    keywords: ["shopping", "mua sắm", "mua sam", "shopee", "lazada", "tiki"]
  },
  {
    category: "Nhà cửa",
    keywords: ["nhà cửa", "nha cua", "tiền nhà", "tien nha", "thuê nhà", "thue nha"]
  },
  {
    category: "Sức khoẻ",
    keywords: ["sức khoẻ", "suc khoe", "y tế", "y te", "bệnh viện", "benh vien"]
  },
  {
    category: "Giáo dục",
    keywords: ["giáo dục", "giao duc", "học phí", "hoc phi", "trường", "truong"]
  }
];

const INCOME_KEYWORDS = [
  "salary",
  "lương",
  "luong",
  "payroll",
  "công ty",
  "cong ty",
  "thu nhập",
  "thu nhap"
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesKeyword(text: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);
  const keywordPattern = new RegExp(
    `(^|\\s)${escapeRegex(normalizedKeyword)}($|\\s)`
  );

  return keywordPattern.test(text);
}

export function suggestTransactionCategory(
  transaction: TransactionCategoryInput
): TransactionCategory {
  const text = normalizeText(
    [
      transaction.receiver_name,
      transaction.receiver_bank,
      transaction.description
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (
    transaction.transaction_type === "income" ||
    INCOME_KEYWORDS.some((keyword) => includesKeyword(text, keyword))
  ) {
    return "Thu nhập";
  }

  const matchedRule = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => includesKeyword(text, keyword))
  );

  return matchedRule?.category ?? "Khác";
}
