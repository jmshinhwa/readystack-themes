# JCT 経過措置リンター 2026

![インボイス経過措置リンター 2026（80%→70%）](https://getreadystack.com/img/promo/sku25591_result_card.jpg)

2026年9月30日で80%控除が終わります。10月1日からは50%ではなく70%です（令和8年度税制改正）。請求・仕入コードに残った 0.8 と 0.5、明細ごとの端数処理、T+13桁でない登録番号を、行番号と修正案つきで指摘します。

## What it finds

```
// 免税事業者からの仕入れ（経過措置）
const KEIKA_RATE = 0.8;
const deduct = shiire * KEIKA_RATE;
const afterOct2026 = shiire * 0.5;   // 経過措置 50%
const items = cart.map(i => ({ ...i, tax: Math.round(i.price * 0.1) }));
const keigen = food.price * 0.1;
const total = Math.round(subtotal * 1.1);
const kyuzeiritsu = price * 1.05;
const TOROKU = /^T\d{12}$/;
const kokuzei = amount * 0.078;
await fs.unlink(receiptPath);
```

## What it does for free

- 開いている1ファイルを24規則すべてで検査（行番号・深刻度・修正案つき）
- 選択した行だけの検査
- 結果パネルの再表示
- コードは端末から出ません（送信なし）

## With a licence

- **リポジトリ全体の走査** — 1ファイルではなく、テンプレート・バッチ・移行スクリプトまで全部を1回で洗い出す
- **結果の書き出し（CSV/JSON/HTML）** — 指摘一覧をファイルとして残し、改修チケットや社内の確認資料にそのまま使える
- **保存時の自動再検査** — 改修中に0.8が戻ってきても、保存した瞬間に気づける
- **CI 用 JSON 出力** — プルリクで落とせる。2026年10月1日以降、0.8 が再び入るのを機械が止める

[**製品版を入手 — $29**](https://buy.polar.sh/polar_cl_akmxSIxDli9uaowwy6ffgNIUozrZ7Qxg6oYFn3rQphD) - $29 once, one licence key per person or team seat, 7-day full refund.


## Install

```
ext install jct-transition-lint-2026
```
