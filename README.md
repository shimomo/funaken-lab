# 舟券ラボ（funaken-lab）

[![ci](https://github.com/shimomo/funaken-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/shimomo/funaken-lab/actions/workflows/ci.yml)
[![pages](https://github.com/shimomo/funaken-lab/actions/workflows/pages.yml/badge.svg)](https://github.com/shimomo/funaken-lab/actions/workflows/pages.yml)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

ボートレースの買い方を、実際のレース結果で検証するバックテストの実験室です。ブラウザだけで動き、サーバーを持ちません。

**→ [shimomo.github.io/funaken-lab](https://shimomo.github.io/funaken-lab/) でそのまま試せます。**

- **締切前に見えていた情報だけで買う。** 戦略が受け取る型には結果も確定オッズも無いので、未来の情報を読もうとするとコンパイルエラーになります。
- **払戻は払戻表で決済する。** 特払・不成立・返還・票なし・同着を分けて数え、返還や不成立は回収率の母数から外します（[評価プロトコル](docs/protocol.md)）。
- **回収率に幅を付ける。** レース単位のブートストラップで 95% 区間を出します。
- **戦略のコードは手元から出ない。** 取得も集計もブラウザ（Web Worker）の中で完結します。

```console
$ pnpm backtest --from 2026-09-14 --to 2026-09-20 --strategy boat1-win
1号艇の単勝
期間 2026-09-14 〜 2026-09-20（データなし 0 日）
レース 1164  購入 1164  的中 623
購入 115,500円  払戻 105,080円
回収率 91.0%（95% 区間 84.2% 〜 97.9%）
的中率 53.9%  最大ドローダウン 10,760円
的中 623  不的中 530  特払 2  返還 9  不成立・中止 0  票なし 0  未確定 0
```

## 戦略の書き方

戦略は「1 レースぶんの情報を受け取り、買い目を返す関数」です。`lookahead` で、締切後の情報をどこまで覗くかを宣言します。

```ts
import { defineStrategy, formation } from '@funaken-lab/core';

export const fastInside = defineStrategy({
  id: 'fast-inside',
  name: '1号艇の展示タイムが最速なら 1-23-234',
  description: '直前情報の展示タイムで 1 号艇が最速のときだけ、1 号艇頭の 3連単を買う。',
  lookahead: 'none',
  decide: (race) => {
    const times = race.preview?.entries.map((entry) => entry.exhibitionTime ?? Infinity) ?? [];
    const inside = times[0];
    if (inside === undefined || inside > Math.min(...times)) {
      return [];
    }
    // race.result と書くとコンパイルエラーになる（締切前には存在しない）
    return formation('trifecta', '1-23-234');
  },
});
```

サンプルの戦略は [`presets.ts`](packages/core/src/presets.ts) にあります。どれも「よく知られた買い方」の基準線で、狙い目という意味ではありません。

## 構成

```
packages/core          検証エンジン（ドメイン型・決済・集計・統計）
  src/source/          Turnmark API の取得と正規化（@funaken-lab/core/turnmark）
  test/fixtures/       実データから切り出した境界ケース
  scripts/             CLI（バックテスト・フィクスチャ生成）
apps/web               画面（Vite + React）。取得と集計は Web Worker で回す
docs/protocol.md       評価プロトコル
```

## 開発

Node.js 24 以上と pnpm（Corepack）が要ります。

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test
pnpm typecheck
pnpm check        # Biome（lint と format）
pnpm backtest --from 2026-09-01 --to 2026-09-07 --strategy boat1-trifecta
```

### 技術メモ

- **TypeScript 7（ネイティブ版の tsc）。** typescript-eslint は 2026 年 9 月時点で TypeScript 7 に対応していない（peer が `<6.1.0`）ので、lint と format は TypeScript に依存しない Biome で行っています。
- **ビルドなしで同じソースを読む。** `erasableSyntaxOnly` と `.ts` 拡張子付きの import で、Node（型の除去）・Vite・Vitest のどれからも同じ `.ts` をそのまま読みます。
- **外部の JSON は境界で検証する。** zod で検証してからドメイン型へ正規化します。zod は取得用のサブパス（`@funaken-lab/core/turnmark`）に閉じ込め、画面のバンドルには入れていません。

## ロードマップ

- [ ] ブラウザ内のエディタ（Monaco）で戦略を書く。エンジンの型定義を注入して補完を効かせる
- [ ] 日次の JSON を列指向の月次ファイルに前処理し、全期間を数秒で回す
- [ ] 累積損益のグラフと、月別・賭式別の内訳
- [ ] 買い目表記の型レベル検証（`'1-1-2'` と書いた時点でエラーにする）
- [ ] 戦略の URL 共有（コードは URL のハッシュにだけ入れ、サーバーには送らない）
- [x] GitHub Pages へのデプロイ
- [ ] MCP サーバー（検証エンジンを tools として公開する）

## データ

[Turnmark API](https://github.com/turnmark/api) の前日までの確定データ（2026 年 1 月 1 日以降）を使っています。非公式のツールで、ボートレース公式サイトおよび関連団体とは関係ありません。データの正確性は保証しません。

## ライセンス

舟券ラボは [MIT license](LICENSE) の元で公開されています。
