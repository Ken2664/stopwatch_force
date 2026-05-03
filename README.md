# 時計（マジック用ストップウォッチPWA）

iPhone純正「時計」アプリのストップウォッチを完全模倣しつつ、
裏ではマジシャンがミリ秒値を任意に固定できる「フォース機能」を備えた Web アプリ（PWA）です。
Vercel ホスティング前提、フルクライアント完結、外部API依存なし。

## 主な機能

- 純正クローン UI（ダークモード固定 / 等幅数字 / 円形ボタン / 下部タブバー）
- `requestAnimationFrame` + `performance.now()` による高精度タイマー
- 隠しタップ領域（A/B/C/D）による以下のシークレット操作:
  - **A (左上)**: フォースON、ターゲット 17（ハートの4 想定）
  - **B (右上)**: フォースON、ターゲット 34
  - **C (タブバー「世界時計」長押し 800ms)**: 設定モーダルを開く
  - **D (左下)**: 緊急キャンセル（フォースOFF）
- 設定モーダルでターゲット数字（1〜52）を直接変更、`localStorage` に永続化
- リセット時にフォースフラグを自動 OFF（二度目疑い対策）
- Service Worker による完全オフライン動作（PWA）

## ディレクトリ構成

```
.
├─ index.html
├─ manifest.json
├─ sw.js
├─ vercel.json
├─ requirements.yaml
├─ specification.yaml
├─ README.md
├─ assets/
│  ├─ icons/
│  │  ├─ icon-192.svg
│  │  ├─ icon-512.svg
│  │  └─ apple-touch-icon.svg
│  └─ images/
│     ├─ tabbar-clock.svg
│     ├─ tabbar-alarm.svg
│     ├─ tabbar-stopwatch.svg
│     └─ tabbar-timer.svg
├─ css/
│  ├─ reset.css
│  ├─ main.css
│  ├─ stopwatch.css
│  ├─ tabbar.css
│  └─ modal.css
└─ js/
   ├─ app.js          (エントリポイント / 状態遷移)
   ├─ stopwatch.js    (計測エンジン)
   ├─ force.js        (フォース制御 + 永続化)
   ├─ ui.js           (DOM 操作)
   ├─ secret.js       (シークレット領域)
   ├─ modal.js        (設定モーダル)
   └─ register-sw.js  (Service Worker 登録)
```

## ローカル動作確認

任意の静的サーバーで配信してください。Service Worker は `https` または `localhost` でのみ動作します。

```powershell
# Python 3 がある場合
python -m http.server 5500

# Node.js がある場合
npx serve -l 5500 .
```

ブラウザで `http://localhost:5500/` を開きます。
iPhone 実機で確認する場合は、同一 LAN 上で接続するか Vercel にデプロイしてください。

## デプロイ（Vercel）

1. このディレクトリを GitHub リポジトリとして push
2. Vercel ダッシュボードで「Import Project」→ 該当リポジトリを選択
3. Framework Preset は **Other**、ビルドコマンド・出力ディレクトリはともに空でOK
4. Deploy を実行
5. 発行された URL を iPhone Safari で開き、共有メニュー →「ホーム画面に追加」

`main` ブランチへの push で自動デプロイされます。

## 操作フロー（演技手順）

1. アプリをホーム画面アイコンから起動（フルスクリーン）
2. マジシャンが演技直前にスマホを観客に渡す際、さりげなく **左上隅** をタップ → フォースON（ターゲット 17）
3. 観客が「開始」→「停止」を押下 → ミリ秒部分が `.17` で固定停止
4. 観客が「リセット」を押下 → 計測クリア & フォースフラグ自動OFF
5. 観客が「もう一回」を試みても、2回目は通常のストップウォッチとして動作

## 開発時の注意（重要）

- **停止ボタンの判定は `touchstart` を最優先**。`click` は iOS Safari で 300ms 遅延が発生し、観客に違和感を与える
- **`body` の `touch-action` / `overscroll-behavior` を必ず無効化**。スクロールバウンスはWebアプリだとバレる最大原因
- **シークレット領域は `opacity: 0` + `background: transparent`** で完全不可視に保つこと
- **本番では `console.log` を残さない**（DevTools でも痕跡を見せないため）

## 設計ドキュメント

- 要件定義書: `requirements.yaml`
- 実装仕様書: `specification.yaml`

## ライセンス

私的利用・マジック実演用。再配布・商用利用は控えてください。
