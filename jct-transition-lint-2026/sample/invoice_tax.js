// 請求書の税額計算（2023年10月のインボイス開始時に作成）
const TAX_RATE = 0.1;
const REDUCED_RATE = 0.08;

// 免税事業者からの仕入：経過措置 80% 控除
const KEIKA_DEDUCT_RATE = 0.8;
// 2026年10月以降は 50% 控除（経過措置の終了日 2029/09/30）
const KEIKA_DEDUCT_RATE_NEXT = 0.5;

const REGISTRATION_NO_RE = /^T\d{12}$/;

function invoiceTax(items) {
  // 明細ごとに税額を計算
  const lines = items.map((item) => Math.round(item.price * item.qty * TAX_RATE));
  return lines.reduce((a, b) => a + b, 0);
}

function deductibleInputTax(purchase) {
  // 仕入税額控除（免税事業者からの仕入は経過措置）
  const tax = purchase.amount * TAX_RATE;
  return purchase.supplierRegistered ? tax : tax * KEIKA_DEDUCT_RATE;
}

module.exports = { invoiceTax, deductibleInputTax, REGISTRATION_NO_RE };
