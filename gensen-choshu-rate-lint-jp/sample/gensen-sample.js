// 報酬の源泉徴収（チャットAIに書かせた版）
const GENSEN_RATE = 0.1;          // 源泉徴収率
const GENSEN_RATE_HIGH = 0.2;     // 源泉 100万円超の部分
const CONSUMPTION_TAX_RATE = 0.1; // 消費税

function gensen(amount) {
  if (amount > 1000000) {
    return Math.round((amount - 1000000) * GENSEN_RATE_HIGH + 100000);
  }
  return Math.round(amount * GENSEN_RATE);
}

// 復興分を足した版
function gensenV2(amount) {
  if (amount > 1000000) return Math.floor((amount - 1000000) * 0.2042 + 100000);
  return Math.floor(amount * 0.1021);
}

// 令和9年改正を先取りした版
const FUKKO_RATE = 0.011; // 復興特別所得税 1.1%
function gensenNew(fee) {
  const incomeTax = Math.floor(fee * 0.1);
  return incomeTax + Math.floor(incomeTax * FUKKO_RATE);
}

function gensenLarge(feeTaxIncluded) {
  return Math.floor(feeTaxIncluded * 0.2042); // 源泉 20.42%
}

const FUKKO_END_YEAR = 2037; // 復興特別所得税の最終年
module.exports = { gensen, gensenV2, gensenNew, gensenLarge, CONSUMPTION_TAX_RATE, FUKKO_END_YEAR };
