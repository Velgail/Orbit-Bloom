# Orbit Bloom 技術仕様・実装指示書 改定版 v2 (2026-07-03)

このドキュメントは、Orbit Bloom を HTML5 Canvas + 純粋な JavaScript (ES6) で実装するための仕様書です。
Claude Code 等のコード生成ツールに、「この仕様書に従って実装して」と指示することを前提としています。

> **v2 について**: v1 ドラフトを、現行実装（`src/` 配下の ES モジュール構成）の実態に合わせて全面改定しました。
> Wave 進行システム、パワースケーリング、9 種の敵タイプ、ポーズ、サウンド、ハイスコア永続化、
> モバイルタッチ操作など、v1 以降に実装された仕様をすべて反映しています。
> 本書と実装（特に `src/js/config.js`）が食い違う場合は、実装との差分を確認のうえ本書を更新してください。

---

## 0. 目標

- 初心者でも「動かす・避ける・当てる」がすぐ理解できる、やさしめ縦スクロール風サバイバルシューティング。
- グラフィックはすべて Canvas の図形描画のみで構成。画像アセット・外部ライブラリは一切使わない。
- サウンドも WebAudio のオシレータのみで生成し、音声ファイルを持たない。
- パラメータ表（`config.js`）をいじるだけで難易度調整ができるコード構造。
- 60 秒 1 Wave のループ構造 + パワーレベルによる無限スケーリングで、「あと 1 Wave だけ」を誘う設計。

---

## 1. 技術仕様

### 1.1 使用技術・制約

- HTML5 `<canvas>` 2D コンテキストのみ使用
- 純粋な JavaScript（ES6 モジュール、`import` / `export`）
- 外部ライブラリ・フレームワーク・ビルド工程は使用しない
- サウンドは WebAudio API（オシレータのみ、音声ファイルなし）
- 永続化は `localStorage` のみ（ハイスコア・ミュート設定）
- ホスティング想定: GitHub Pages（静的サイト）

### 1.2 ファイル構成

```
Orbit-Bloom/
├── index.html          # ルート: src/ へのメタリフレッシュによるリダイレクトのみ
├── src/
│   ├── index.html      # 実際のエントリポイント（canvas + HTML製HUD）
│   ├── style.css       # 全画面レイアウト・HUDスタイル
│   └── js/
│       ├── config.js   # 全パラメータ定数（名前付きエクスポート）
│       ├── main.js     # エントリポイント・キャンバス設定・ゲームループ
│       ├── classes/
│       │   ├── Player.js
│       │   ├── Enemy.js
│       │   ├── Bullet.js
│       │   ├── Particle.js
│       │   └── Star.js
│       └── game/
│           ├── state.js     # gameState と init/startGame/endGame/getCurrentPhase
│           ├── input.js     # キーボード・マウス・タッチのイベント配線
│           ├── touch.js     # バーチャルスティック + DASHボタン
│           ├── collision.js # 衝突判定
│           ├── spawn.js     # 敵スポーン
│           ├── power.js     # パワーレベルによるスケーリング計算と演出
│           ├── audio.js     # WebAudio SFX（依存なしの独立モジュール）
│           ├── ui.js        # HTML製HUDの更新
│           └── render.js    # 描画パイプラインとCanvasオーバーレイ
└── docs/
    └── spec-orbit-bloom.md  # このファイル
```

- ルートの `index.html` は `<meta http-equiv="refresh" content="0; url=src/">` によるリダイレクトページ。
  GitHub Pages でリポジトリ直下にアクセスされたとき `src/` へ誘導するためだけに存在する。
- `src/index.html` は `<script type="module" src="js/main.js">` で ES モジュールとして起動する。
  すべてのパスは相対パス（GitHub Pages 対応）。

### 1.3 ゲームループ

- `requestAnimationFrame` によるメインループ（`main.js` の `gameLoop`）
- `timestamp` から `deltaTime`（秒）を計算し、フレームレート差を吸収
- `updateGame(dt)` の先頭で `dt = Math.min(dt, 0.05)` にクランプ（タブ復帰時などの巨大ジャンプ防止）
- 更新は `state === 'playing'` のときのみ。ただし:
  - 背景の星は title / paused / gameover 中も更新し続ける（画面が死なないように）
  - 画面シェイクのタイマー（`shakeTimer`）は全状態で減衰させる（ゲームオーバー画面が揺れたまま止まらないように）
- 描画（`render`）は状態にかかわらず毎フレーム実行する

---

## 2. 画面・座標系・描画ルール

### 2.1 論理座標系

- ゲーム内論理座標: 幅 `GAME_WIDTH = 360`、高さ `GAME_HEIGHT = 640`
- ゲームロジック（プレイヤー・敵・弾・パーティクル・星）はすべてこの論理座標で動く

### 2.2 キャンバスのスケーリングと devicePixelRatio 対応

`main.js` の `resizeCanvas()` が以下を行う:

- `dpr = window.devicePixelRatio || 1` を取得し、
  バッキングストアを `window.innerWidth × dpr`, `window.innerHeight × dpr` で確保。
  `canvas.style.width/height` は CSS ピクセルで指定（高 DPI 画面でも滲まない）
- 描画時は `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` を起点とし、以降のコードはすべて CSS ピクセルで扱う
- ゲーム領域のフィット:
  - `scale = min(viewWidth / GAME_WIDTH, viewHeight / GAME_HEIGHT)`
  - 中央寄せのため `offsetX`, `offsetY` を計算し `translate + scale`
- `resize` と `orientationchange` の両イベントで再計算する。
  このときタッチ操作の有効判定（`initTouchControls()`）も毎回再評価する

### 2.3 モバイルビューポート対策（style.css / index.html）

- `<meta name="viewport" ... viewport-fit=cover, user-scalable=no>`
- `body { height: 100dvh; overflow: hidden; }`（モバイルブラウザの可視領域に追従）
- `html, body { overscroll-behavior: none; }`（引っ張り更新の防止）
- `#gameCanvas { touch-action: none; }`（スクロール・ズームをゲーム側で完全に掌握）
- `user-select: none`（長押し選択の防止）

### 2.4 カラー・ビジュアル

- 背景: Canvas 側で濃紺 `#000428` → 黒 `#000000` の縦グラデーション塗り + 下方向にスクロールする星
- 自機: シアン `#40E0FF`（ダッシュ中は `#80F0FF`）
- 敵: タイプごとの固定色（§5 の表を参照）
- 弾: 自機弾 シアン `#40E0FF` / 敵弾 赤 `#FF5A5A`（どちらも `shadowBlur` によるグロー付き）

### 2.5 描画ルール

- すべて Canvas 図形描画 API（`fillRect`, `arc`, `lineTo`, `quadraticCurveTo` 等）のみ。画像リソース禁止
- パーティクル表現:
  - 自機移動時のテール（移動中、毎フレーム 30% の確率でシアンの点を生成）
  - 敵被弾時の白いスパーク（非致死ヒット、3 個）+ 本体の白フラッシュ 0.08 秒
  - 敵撃破時の破片（敵色、15 個）
  - 被弾時の自機色破片（20 個）+ 画面シェイク 0.25 秒
  - パーティクルは毎フレーム速度を ×0.95 して減速し、寿命比でフェードアウト
- 背景の星: 100 個。明滅（フェード方向反転）+ 30〜80 px/s で下方向にスクロールし、画面外でラップして x を再抽選
- 画面シェイク: `shakeTimer > 0` の間、ゲーム座標変換の内側で `shakeTimer × 24` を振幅とするランダムオフセット

### 2.6 描画順序（render.js）

1. dpr 変換をセットし、グラデーション背景で全画面クリア
2. ゲーム座標変換（translate + scale）を適用、シェイク中はさらにランダムオフセット
3. 星 → パーティクル → 弾 → 敵 → プレイヤー の順に描画
4. 変換を復元し、以降は CSS ピクセルの画面座標で:
   - タッチ操作オーバーレイ（playing 中のみ）
   - POWER UP / WAVE 演出バナー（playing 中のみ）
   - タイトル / ゲームオーバー / ポーズの各オーバーレイ

---

## 3. ゲームフロー・状態遷移

### 3.1 状態

`gameState.state` は次の 4 値: `'title'` | `'playing'` | `'paused'` | `'gameover'`

```
title ──(任意キー / クリック / タップ)──▶ playing ◀──(P / Esc / クリック / タップ)──▶ paused
                                            │
                                            ▼ (ライフ 0)
                                        gameover ──(ロックアウト 0.8 秒経過後の入力)──▶ playing
```

### 3.2 ゲーム開始・リスタート（tryStart）

- タイトル / ゲームオーバー画面では「任意のキー」「クリック」「タップ」で開始
  - 例外: `M`（ミュート）と `P` / `Esc`（ポーズトグル）は開始をトリガーしない
- 開始時に必ず行うこと:
  1. `initAudio()` — 最初のユーザー操作を利用して AudioContext を生成（ブラウザの自動再生ポリシー対応）
  2. `resetTouchControls()` — 死亡した瞬間に握っていたジョイスティックが次のランに漏れないよう、タッチ状態を全消去
  3. `startGame()` — スコア・ライフ・Wave・パワーレベル・各配列・入力状態をすべて初期化

### 3.3 リスタートロックアウト

- ゲームオーバー時に `gameState.gameoverAt = performance.now()` を記録
- そこから `RESTART_LOCKOUT = 0.8` 秒間は開始入力を無視する
  （死亡直前の連打・押しっぱなしキーでスコア画面が飛ばされるのを防ぐ）
- ゲームオーバー画面の「Retry」の案内文も、ロックアウト経過後にのみ表示する
  （UI 表示と入力受付を必ず一致させること）

### 3.4 ポーズ

- `P` または `Esc` で playing ⇄ paused をトグル
- paused 中のクリック / タップでも再開する
- **ウィンドウの `blur`（フォーカス喪失）時**:
  - `gameState.keys` を全消去（フォーカス外で離されたキーの keyup は届かないため、勝手に滑走するのを防ぐ）
  - playing 中であれば自動的に paused へ遷移する
- paused 中も HTML 製 HUD は表示したままにする（§11 参照）

### 3.5 ゲームオーバー

- ライフが 0 になった時点で `endGame()`:
  - `state = 'gameover'`、`gameoverAt` 記録、`gameOver` SFX 再生
  - ハイスコア更新判定と `localStorage` への保存（§10 参照）

---

## 4. プレイヤー仕様

### 4.1 形状・当たり判定

- 中心円（描画半径 `10px`）+ 下側に翼三角形 1 つ
- 当たり判定は円: 判定半径 `hitRadius = 6px`（描画より小さい「見た目より優しい」判定）
- 初期位置: 画面中央 x、`GAME_HEIGHT - 80` の y

### 4.2 ライフ・無敵

- 初期ライフ: `3`
- 被弾時（無敵でないときのみ）:
  - ライフ `-1`
  - 無敵時間 `1.0` 秒
  - 画面シェイク 0.25 秒、`playerHit` SFX、自機色パーティクル 20 個
- 無敵中の表現: `Date.now()` ベースの 10Hz 点滅（透明度 0.3 ⇄ 1.0）

### 4.3 移動

- 慣性なし。入力に応じて即座に速度決定
- 入力: `WASD` または矢印キー。タッチスティック入力（`gameState.touchMove`）が
  デッドゾーン（|x| または |y| > 0.1）を超えていればキーボードより優先
- 斜め移動はベクトル正規化
- 基本移動速度 `moveSpeed = 200 px/s` × パワー倍率（§6.4、上限 1.5 倍）
- 画面外に出ないよう、描画半径ぶんを残して座標をクランプ

### 4.4 攻撃（自動連射）

- 真上への自動連射のみ。ショットボタンは存在しない（プレイヤーは「避け」と「位置取り」に集中）
- 弾速: 基本 `300 px/s` × パワー倍率
- 連射間隔: 基本 `0.2 秒` ÷ 連射パワー倍率
- 弾ダメージ: 基本 1、パワーレベル 3 ごとに +1（§6.4）
- 発射ごとに `shoot` SFX

### 4.5 ダッシュ

- 発動キー: `Shift` または `Space`（playing 中のみ）。モバイルでは DASH ボタン
- 発動条件: クールダウン完了 かつ 非ダッシュ中。`Player.dash()` は実際に発動したかを bool で返す
  （UI 層が本物のクールダウンを表示できるようにするため）
- 効果:
  - 移動速度 ×`2.5`、継続 `0.2` 秒
  - ダッシュ中は無敵（`invincibleTimer = dashDuration`）
  - クールダウン `1.5` 秒
- **方向**: 現在の移動入力ベクトル。入力が 0 のときは「最後に移動していた方向」
  （`lastMoveX/Y`、初期値は真上）へダッシュする。静止からでも必ず動く
- 見た目:
  - 本体色が `#80F0FF` に明るくなり、半径 ×1.2、グローが太く・大きくなる
  - `dash` SFX（上昇スイープ）
- **クールダウン表示**: 自機の周囲（半径 +8）に黄色い円弧が真上から時計回りに伸びていき、
  一周＝ダッシュ再使用可能。準備完了で消える。ダッシュ中は表示しない

---

## 5. 敵仕様

### 5.1 共通仕様

- スポーン位置: x は `0〜GAME_WIDTH` のランダム、y は画面外上部 `-20`
- HP はパワーレベルで増加: `hp = round(基本hp × (1 + 0.18 × level))`
- 速度倍率 = フェーズの `enemySpeedMultiplier` × パワー速度倍率 `(1 + 0.08 × level)`
- 非致死ヒット時: 本体が白 `#FFFFFF` に 0.08 秒フラッシュ + 白スパーク 3 個 + `enemyHit` SFX
- 撃破時: スコア加算 + 敵色パーティクル 15 個 + `explosion` SFX
- 画面外削除: `y > 640+50`、`y < -50`、または左右マージン 50px 超
  （spiral のみ左右マージンを `spiralSpeed + 60` に拡大 — 螺旋の最大振幅で消されないため）
- 全タイプにタイプ色 50% 透明のグローリング（半径 +2）を描画

### 5.2 敵タイプ一覧（9 種）

| type | 形状 | 色 | 動き | 弾 |
|---|---|---|---|---|
| `basic` | 円 | `#FFD95A` 黄 | 真下へ直進 | なし |
| `zigzag` | 菱形 | `#FF5AF2` マゼンタ | 落下しつつ `x = startX + sin(t×freq)×ampX` で左右振動 | なし |
| `wave` | 角丸菱形 | `#FFB3E6` ピンク | zigzag と同形の正弦波だが振幅大・周波数低のゆったり波 | なし |
| `spiral` | 五芒星 | `#B3E6FF` 水色 | 落下量に応じて振幅が育つ横揺れ: `x = startX + cos(t×freq) × min((y−startY)×0.2, spiralSpeed)` | なし |
| `homing` | 進行方向を向く三角形 | `#7CFF5A` 緑 | `turnInterval` 秒ごとにプレイヤー方向へ最大 `turnAngle` rad だけ角度補正する弱追尾。初期角は真下 | なし |
| `shooter` | 円 + 白い内円 | `#FFA05A` オレンジ | ゆっくり降下 | `shotInterval` ごとにプレイヤー狙い 1 発 |
| `shooter_spread` | 五角形 + 白い内円 | `#FF8AC9` ピンク | ゆっくり降下 | プレイヤー狙い 3-way（±0.3 rad ≒ ±17°） |
| `shooter_radial` | 六角形 + 回転する白三角 | `#8AFFEF` シアン | ゆっくり降下 | 6 方向全周弾。パターン全体が `t×0.5` rad でゆっくり回転。弾速は 0.8 倍 |
| `shooter_spiral` | 回転する四角形 + 逆回転の白い内四角 | `#FFEF8A` 黄 | ゆっくり降下 | `shotInterval`(0.3s) ごとに正反対 2 方向へ 1 発ずつ、発射角が毎回 π/8 (22.5°) 進む連続螺旋。弾速は 0.7 倍 |

### 5.3 敵パラメータ表（config.js `ENEMY_PARAMS` と一致させること）

| type | speedY / speed | radius | hp | score | color | 固有パラメータ |
|---|---|---|---|---|---|---|
| `basic` | 60 | 8 | 1 | 10 | `#FFD95A` | — |
| `zigzag` | 70 | 10 | 1 | 15 | `#FF5AF2` | `ampX: 30`, `freq: 2` |
| `wave` | 65 | 9 | 1 | 18 | `#FFB3E6` | `ampX: 50`, `freq: 1.5` |
| `spiral` | 55 | 10 | 2 | 22 | `#B3E6FF` | `spiralSpeed: 120`, `freq: 2` |
| `homing` | `speed: 80` | 9 | 2 | 25 | `#7CFF5A` | `turnInterval: 0.25`, `turnAngle: 0.3` |
| `shooter` | 50 | 12 | 2 | 30 | `#FFA05A` | `shotInterval: 2.0` |
| `shooter_spread` | 45 | 12 | 3 | 35 | `#FF8AC9` | `shotInterval: 2.5` |
| `shooter_radial` | 40 | 14 | 3 | 45 | `#8AFFEF` | `shotInterval: 3.5` |
| `shooter_spiral` | 40 | 14 | 4 | 80 | `#FFEF8A` | `shotInterval: 0.3` |

### 5.4 敵弾仕様

- 形状: 半径 3 の円、赤 `#FF5A5A`、グロー付き
- 速度: 現在フェーズの `bulletSpeed` を参照（フェーズ未取得時のフォールバック 150）
  - `shooter_radial` は ×0.8、`shooter_spiral` は ×0.7 に減速（美しく避けられる弾幕にするため）
- 生成時に方向ベクトルを確定し、以後直進。画面外 ±10px で削除

---

## 6. Wave・フェーズ・パワーシステム

### 6.1 Wave（ステージ）進行

- 形式: 時間制サバイバル。1 Wave = `duration: 60` 秒、各 Wave は 3 フェーズ（0–20 / 20–40 / 40–60 秒）
- `timeLeft = duration − elapsedTime` が 0 以下になったら Wave クリア:
  1. `triggerPowerUp()` を発動（§6.3）
  2. `elapsedTime = 0` にリセット
  3. `stageIndex` を進める。**最終 Wave（Wave 4 設定）に到達したらそこで固定し、無限に繰り返す。**
     以降の難度上昇はパワースケーリングが担う
- ゲームオーバー条件: ライフが 0（Wave クリアによる「ゲームクリア」は存在しない、エンドレス形式）

### 6.2 Wave 設定表（config.js `stageConfigs` と一致させること）

**Wave 1 — 入門**

| phase | 時間 | spawnRate | maxEnemies | allowedTypes | 速度倍率 | bulletSpeed |
|---|---|---|---|---|---|---|
| 1 | 0–20s | 0.3 | 5 | basic | 0.9 | 120 |
| 2 | 20–40s | 0.5 | 8 | basic, zigzag, wave | 1.0 | 130 |
| 3 | 40–60s | 0.7 | 12 | basic ×2, zigzag, wave, shooter | 1.0 | 140 |

**Wave 2 — 中級**

| phase | 時間 | spawnRate | maxEnemies | allowedTypes | 速度倍率 | bulletSpeed |
|---|---|---|---|---|---|---|
| 1 | 0–20s | 0.5 | 8 | basic, zigzag | 1.0 | 130 |
| 2 | 20–40s | 0.7 | 12 | basic, zigzag, wave, shooter | 1.1 | 150 |
| 3 | 40–60s | 0.9 | 15 | basic, zigzag, wave, shooter, shooter_radial, shooter_spread | 1.2 | 160 |

**Wave 3 — 上級**

| phase | 時間 | spawnRate | maxEnemies | allowedTypes | 速度倍率 | bulletSpeed |
|---|---|---|---|---|---|---|
| 1 | 0–20s | 0.7 | 12 | basic, zigzag, wave | 1.1 | 150 |
| 2 | 20–40s | 1.0 | 16 | basic, zigzag, wave, spiral, shooter, shooter_spread | 1.2 | 170 |
| 3 | 40–60s | 1.2 | 20 | zigzag, wave, spiral, shooter, shooter_radial, shooter_spread, shooter_spiral | 1.3 | 180 |

**Wave 4 以降 — 最高難度（この設定が無限に繰り返される）**

| phase | 時間 | spawnRate | maxEnemies | allowedTypes | 速度倍率 | bulletSpeed |
|---|---|---|---|---|---|---|
| 1 | 0–20s | 1.0 | 15 | basic, zigzag, wave, spiral | 1.2 | 170 |
| 2 | 20–40s | 1.3 | 20 | zigzag, wave, spiral, homing, shooter, shooter_spread | 1.3 | 190 |
| 3 | 40–60s | 1.5 | 25 | wave, spiral, homing, shooter, shooter_radial, shooter_spread, shooter_spiral | 1.4 | 200 |

- `allowedTypes` に同じタイプを重複して入れると、その分だけ抽選の重みが増える
  （例: Wave 1 phase 3 の `['basic', 'basic', 'zigzag', 'wave', 'shooter']` は shooter を少数派に抑える意図）
- `homing` は Wave 4 以降にのみ登場する

### 6.3 Wave クリア演出（triggerPowerUp）

Wave クリアの瞬間に以下をまとめて行う:

1. `powerLevel` を +1、`powerUp` SFX 再生、演出タイマー `powerUpTimer = 2.0` 秒をセット
2. **画面上の敵弾を全消去**（1 発ごとに白スパーク 3 個に変換）— 新しい Wave をクリーンな画面で始めるご褒美
3. 画面中央から 4 色（黄・シアン・マゼンタ・緑）50 個の放射バースト + 白 30 個のリング爆発
4. バナー表示（playing 中のみ描画、画面上部 28% の位置 = 回避ゾーンの外）:
   - 最初の 0.5 秒（`powerUpTimer > 1.5`）は「WAVE {次のWave番号}」、残り 1.5 秒は「POWER UP!」
   - その下に「LEVEL {powerLevel}」
   - 出現直後のみ全画面フラッシュ（アルファ上限 0.15 — 飛んでいる弾の視認性を潰さないこと）

### 6.4 パワースケーリング（config.js `POWER_PARAMS` と一致させること）

Wave をクリアするたびに `powerLevel` が 1 上がり、以下が同時に強くなる。

**プレイヤー側（`POWER_PARAMS.player`）**

| 項目 | パラメータ | 効果（level = L） |
|---|---|---|
| 移動速度 | `moveSpeedPerLevel: 0.1` / `moveSpeedCap: 1.5` | ×`min(1 + 0.1L, 1.5)` — 回避が簡単になりすぎないよう上限 1.5 倍 |
| 連射速度 | `fireRatePerLevel: 0.15` | 発射間隔 ÷ `(1 + 0.15L)` |
| 弾速 | `bulletSpeedPerLevel: 0.1` | ×`(1 + 0.1L)` |
| 弾ダメージ | `damageEveryLevels: 3` | `1 + floor(L / 3)` — **3 レベルごとに +1**（L3〜5 で 2、L6〜8 で 3 …） |

**敵側（`POWER_PARAMS.enemy`）**

| 項目 | パラメータ | 効果（level = L） |
|---|---|---|
| HP | `hpPerLevel: 0.18` | ×`(1 + 0.18L)` を四捨五入 |
| 速度 | `speedPerLevel: 0.08` | ×`(1 + 0.08L)`（フェーズ倍率と乗算） |
| スポーン率 | `spawnRatePerLevel: 0.05` | ×`(1 + 0.05L)` |
| 同時出現上限 | `maxEnemiesCap: 30` | フェーズの `maxEnemies` に **+1/レベル**、合計上限 30 |

### 6.5 敵スポーンロジック（spawn.js）

- `spawnAccumulator += spawnRate × スポーン率倍率 × dt`
- `spawnAccumulator >= 1` かつ 敵数 < 実効 `maxEnemies` の間、1 ずつ消費して敵を生成
- タイプは現在フェーズの `allowedTypes` から等確率抽選（重複エントリ＝重み付け）
- **ループ後に `spawnAccumulator = min(spawnAccumulator, 1)` にクランプする。**
  画面が上限で飽和している間にアキュムレータが溜まると、1 体倒すたびに同フレームでバースト補充されてしまうため

### 6.6 衝突判定（collision.js）

- すべて円と円の距離判定（`dist < r1 + r2`）
- 自機弾 × 敵: 弾を削除し `enemy.hit(弾ダメージ)`。ダメージはパワー計算（§6.4）を参照
- 敵弾 × 自機: 弾を削除し `player.hit()`。判定は `hitRadius`（6px）
- 敵本体 × 自機: 無敵中はスキップ。1 フレームに 1 ヒットまで（最初の 1 体で break）

---

## 7. 入力仕様詳細

### 7.1 PC キーボード

| キー | 動作 |
|---|---|
| `W/A/S/D`, 矢印キー | 移動（同時押しはベクトル合成 + 正規化） |
| `Shift` / `Space` | ダッシュ（playing 中のみ。`preventDefault` でスクロール防止） |
| `P` / `Esc` | ポーズのトグル（ゲーム開始はトリガーしない） |
| `M` | ミュートのトグル（**どの状態でも有効**、ゲーム開始はトリガーしない） |
| `M` / `P` / `Esc` 以外の任意キー（Shift / Space 含む） | title / gameover 画面ではゲーム開始（ロックアウト考慮） |

- `keydown` / `keyup` で `gameState.keys[小文字キー名]` を更新する方式
- ウィンドウ `blur` で `keys` を全消去 + 自動ポーズ（§3.4）

### 7.2 マウス

- クリック: title / gameover でゲーム開始、paused で再開。playing 中のマウスは未使用（照準なし・自動連射のため）

### 7.3 モバイルタッチ

**有効判定（能力ベース検出）**

- `'ontouchstart' in window || navigator.maxTouchPoints > 0` ならタッチ操作を有効化
- 画面サイズでは判定しない（タブレット・大画面スマホも対象）。キーボード入力は並行して常に有効
- 起動時とすべての resize / orientationchange で再評価

**バーチャルスティック（移動）**

- 受付領域: **画面左半分 かつ 画面下側 65%**（`y > 画面高さ × 0.35`。上側 35% は HUD と敵出現ゾーンのため除外）
- タッチした場所がそのままスティックの基準点になる（フローティング式）
- **単一タッチオーナー制**: 最初に領域を触った 1 本の指（`touchId`）だけがスティックを所有し、他の指は無視
- 変位を最大 40px にクランプし、`変位 / 40` を -1〜1 の移動入力として `gameState.touchMove` に毎フレーム反映
- デッドゾーン: 自機側で |x|, |y| ともに 0.1 以下なら無視
- 描画: 非操作時は左下 (80, h−80) に「↕」入りのヒント円。操作中は基準点に基底円（半径 60）+ スティック円（半径 20）

**DASH ボタン**

- 位置: 画面右下 `(幅 − 80, 高さ − 80)`、半径 40 の円。リサイズ・回転に追従
- タッチで `player.dash()` を呼ぶだけ。**クールダウン管理は Player 側の実物に一元化**（UI 側で二重管理しない）
- 描画: クールダウン中はボタンを減光（アルファ 0.4 → 0.2）し、外周に真上から時計回りのスイープ円弧で残り時間を表示。中央に「DASH」

**画面タップの状態別動作**

- title / gameover: ゲーム開始（ロックアウト考慮）
- paused: 再開
- playing: スティック / DASH ボタン処理
- `touchend` / `touchcancel` は**状態にかかわらず常に処理する**
  （死亡の瞬間に握っていたスティックのタッチ終了を取り逃すと、次のランに幻の入力が漏れるため）
- さらに保険として、ゲーム開始時に `resetTouchControls()` で全タッチ状態を消去する

---

## 8. サウンド仕様（audio.js）

### 8.1 方針

- WebAudio API のオシレータのみで全 SFX を生成。音声ファイル・外部アセットなし
- 各 SFX は「波形 + 開始周波数 → 終了周波数の指数スイープ + 指数減衰エンベロープ」の単発音
- AudioContext は**最初のユーザー操作（ゲーム開始入力）で遅延生成**する（ブラウザの自動再生ポリシー対応）。
  `initAudio()` は何度呼んでも安全（2 回目以降は suspended 状態の resume のみ）
- マスターゲイン: `0.15`
- BGM は未実装（意図的にスコープ外）

### 8.2 SFX 一覧（実装と一致させること）

| 名前 | 波形 | 周波数スイープ | 長さ | ゲイン | 再生タイミング |
|---|---|---|---|---|---|
| `shoot` | square | 880 → 660 Hz | 0.04s | 0.1 | 自機の発射ごと |
| `enemyHit` | triangle | 220 → 180 Hz | 0.05s | 0.25 | 敵への非致死ヒット |
| `explosion` | sawtooth | 220 → 40 Hz | 0.18s | 0.5 | 敵撃破 |
| `playerHit` | sawtooth | 160 → 40 Hz | 0.35s | 0.9 | 自機被弾 |
| `dash` | sine | 200 → 600 Hz | 0.12s | 0.35 | ダッシュ発動 |
| `powerUp` | sine | 440 → 880 Hz | 0.35s | 0.5 | Wave クリア |
| `gameOver` | sawtooth | 330 → 55 Hz | 0.7s | 0.7 | ゲームオーバー |

### 8.3 ミュート

- `M` キーでトグル（どの状態でも有効）
- 設定は `localStorage` キー `orbitBloomMuted`（`'1'` / `'0'`）に保存し、次回起動時に復元
- `localStorage` が使えない環境では例外を握りつぶし、そのセッション内でのみトグルが効く
- タイトル画面（キーボード環境）に現在の状態を「M: Sound ON/OFF」として表示

---

## 9. ハイスコア

- `localStorage` キー `orbitBloomHighScore` に数値文字列で保存
- 起動時に読み込み（読めない環境では 0 扱い。`try/catch` で保護）
- `endGame()` で `score > highScore` なら:
  - `highScore` を更新し `isNewRecord = true`
  - `localStorage` へ保存（失敗してもセッション内のハイスコアは維持）
- 表示:
  - タイトル画面: ハイスコアが 0 より大きければ「BEST: {highScore}」（黄 `#FFD95A`）
  - ゲームオーバー画面: 記録更新時は「NEW RECORD!」を明滅表示（sin による 0.6〜1.0 のアルファ振動）、
    非更新時は「BEST: {highScore}」を表示

---

## 10. UI・画面レイアウト

UI は「HTML 製 HUD」と「Canvas 製オーバーレイ」の 2 層で構成する。役割を混ぜないこと。

### 10.1 HTML 製 HUD（index.html の `#gameInfo` + ui.js）

- `position: fixed` の DOM オーバーレイ。`pointer-events: none`
- **playing と paused のときだけ表示**（title / gameover では非表示）
- 内容:
  - 左上 `SCORE`: 現在スコア
  - 上中央 `TIME`: `W{Wave番号} {残り秒}s` 形式（例: `W2 43s`）。残り秒は `ceil`、負値は 0 に丸め
  - 右上 `LIVES`: 残ライフ
- ラベルはシアン + グロー、値は白。600px 以下でフォント・余白を縮小

### 10.2 Canvas 製オーバーレイ(render.js)

すべて CSS ピクセルの画面座標で描画（ゲーム座標変換の外側）:

- **タイトル画面**: 黒 50% オーバーレイ + グロー付きタイトル「Orbit-Bloom」+ BEST 表示 +
  明滅するスタート案内（タッチ環境なら「Tap to Start」、それ以外は「Click or Press Any Key to Start」）+
  環境に応じた操作説明（キーボード環境のみ P / M の説明行を追加）
- **ポーズ画面**: 黒 60% オーバーレイ + 「PAUSED」+ 再開案内（環境別の文言）
- **ゲームオーバー画面**: 黒 70% オーバーレイ + 赤「Game Over」+ Score + NEW RECORD! / BEST +
  「Reached Wave {n}」+ ロックアウト経過後のみ Retry 案内
- **POWER UP / WAVE バナー**: §6.3 参照（playing 中のみ）
- **タッチ操作オーバーレイ**: §7.3 参照（タッチ有効 かつ playing 中のみ）

---

## 11. 調整用パラメータ（config.js 全定数）

難易度調整は原則としてこのファイルの書き換えのみで行う。以下は実装と一致していなければならない。

```js
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

export const PLAYER_PARAMS = {
  moveSpeed: 200,
  radius: 10,
  hitRadius: 6,
  shotInterval: 0.2,
  dashSpeedMultiplier: 2.5,
  dashDuration: 0.2,
  dashCooldown: 1.5,
  invincibleDurationOnHit: 1.0,
  initialLives: 3,
};

export const ENEMY_PARAMS = {
  basic:          { speedY: 60, radius: 8,  hp: 1, score: 10, color: '#FFD95A' },
  zigzag:         { speedY: 70, radius: 10, ampX: 30, freq: 2,   hp: 1, score: 15, color: '#FF5AF2' },
  wave:           { speedY: 65, radius: 9,  ampX: 50, freq: 1.5, hp: 1, score: 18, color: '#FFB3E6' },
  spiral:         { speedY: 55, radius: 10, spiralSpeed: 120, freq: 2, hp: 2, score: 22, color: '#B3E6FF' },
  homing:         { speed: 80,  radius: 9,  turnInterval: 0.25, turnAngle: 0.3, hp: 2, score: 25, color: '#7CFF5A' },
  shooter:        { speedY: 50, radius: 12, shotInterval: 2.0, hp: 2, score: 30, color: '#FFA05A' },
  shooter_spread: { speedY: 45, radius: 12, shotInterval: 2.5, hp: 3, score: 35, color: '#FF8AC9' },
  shooter_radial: { speedY: 40, radius: 14, shotInterval: 3.5, hp: 3, score: 45, color: '#8AFFEF' },
  shooter_spiral: { speedY: 40, radius: 14, shotInterval: 0.3, hp: 4, score: 80, color: '#FFEF8A' },
};

export const BULLET_PARAMS = {
  player: { speedY: -300, radius: 3, color: '#40E0FF' },
  enemy:  { radius: 3, color: '#FF5A5A' },
};

export const POWER_PARAMS = {
  player: {
    moveSpeedPerLevel: 0.1,   // 1レベルごとに移動速度 +10%
    moveSpeedCap: 1.5,        // 回避が簡単になりすぎないよう上限
    fireRatePerLevel: 0.15,   // 1レベルごとに連射 +15%
    bulletSpeedPerLevel: 0.1, // 1レベルごとに弾速 +10%
    damageEveryLevels: 3,     // Nレベルごとに弾ダメージ +1
  },
  enemy: {
    hpPerLevel: 0.18,         // 1レベルごとに HP +18%
    speedPerLevel: 0.08,      // 1レベルごとに速度 +8%
    spawnRatePerLevel: 0.05,  // 1レベルごとにスポーン率 +5%
    maxEnemiesCap: 30,        // maxEnemies は +1/レベルで増え、合計30が上限
  },
};

export const RESTART_LOCKOUT = 0.8; // ゲームオーバー後、リスタート入力を受け付けるまでの秒数

export const stageConfigs = [ /* §6.2 の Wave 1〜4 の表の通り */ ];
```

---

## 12. コード構成

### 12.1 モジュールマップ

| モジュール | 責務 |
|---|---|
| `config.js` | 全定数。**依存なし** |
| `classes/Player.js` | 移動・自動連射・ダッシュ・被弾・無敵・クールダウン円弧描画 |
| `classes/Enemy.js` | 9 タイプの移動・射撃・被弾フィードバック・撃破・タイプ別描画 |
| `classes/Bullet.js` | 自機弾/敵弾の共用クラス（`owner: 'player' | 'enemy'`） |
| `classes/Particle.js` | 減速 + フェードする汎用パーティクル |
| `classes/Star.js` | 明滅 + 下スクロールする背景星 |
| `game/state.js` | `gameState` オブジェクト、`init` / `startGame` / `endGame` / `getCurrentPhase`、ハイスコア読み書き |
| `game/input.js` | 全入力イベントの配線、`tryStart`（ロックアウト・音声初期化・タッチリセット込み）、ポーズ、blur 処理 |
| `game/touch.js` | バーチャルスティック + DASH ボタンの状態・イベント処理・描画 |
| `game/collision.js` | 3 種の円衝突判定 |
| `game/spawn.js` | アキュムレータ式スポーン + 飽和時のバックログ防止 |
| `game/power.js` | パワー倍率の計算（自機/敵）、実効 maxEnemies、Wave クリア演出 |
| `game/audio.js` | WebAudio SFX・ミュート永続化。**依存なし**（他モジュールから一方的に import される） |
| `game/ui.js` | HTML 製 HUD の更新と表示/非表示 |
| `game/render.js` | 描画パイプライン全体 + Canvas オーバーレイ（タイトル/ポーズ/ゲームオーバー/POWER UP） |
| `main.js` | キャンバス設定（dpr/リサイズ）、`updateGame`、Wave 進行、ゲームループ |

### 12.2 依存関係（正直な現状）

```
config.js ──▶ ほぼ全モジュールから import される（依存なし）
audio.js ──▶ 依存なし。Player / Enemy / state / input / power / render から import される

classes/ と game/ は一方向ではなく、以下の点で相互依存している:
  - classes/Player.js ──▶ game/power.js（パワー倍率）、game/state.js（endGame）、game/audio.js
  - classes/Enemy.js  ──▶ game/power.js、game/audio.js
  - game/state.js     ──▶ classes/Player.js、classes/Star.js   ← 循環（state ⇄ Player）
  - game/spawn.js     ──▶ classes/Enemy.js
  - game/power.js     ──▶ classes/Particle.js、game/state.js

main.js ──▶ config / state / input / touch / power / collision / spawn / ui / render
```

- `state.js ⇄ Player.js` の循環は、参照がすべて実行時（関数呼び出し時）に解決されるため
  ES モジュールとして問題なく動作している。ただし**新規コードでモジュールのトップレベルで
  相互の値を評価するような書き方をすると壊れる**ので注意すること
- 「classes は config だけに依存する」という理想の階層は現状維持されていない。
  依存を増やす変更をする場合は、この相互依存を悪化させないか確認すること

### 12.3 実装上の約束事

- 全エンティティは `update(dt)` と `draw(ctx)` を持つ
- 配列からの削除は必ず後ろ向きループ + `splice`
- 速度・タイマーは必ず `dt` を掛ける（60fps を仮定しない）
- 画面外エンティティは必ず削除する（メモリリーク防止）
- マジックナンバーは `config.js` へ。演出用の細かい数値（パーティクル数など）は各モジュール内でも可

---

## 13. Claude Code への指示例

このファイルを同じリポジトリに置いたうえで、Claude Code には以下のように指示することを想定:

> `docs/spec-orbit-bloom.md` の仕様に従って、`src/` 配下の実装を確認・修正してください。
> パラメータは `src/js/config.js` の定数を変更し、仕様書の表と一致させてください。
> 新しい敵タイプや機能を追加する場合は、この仕様書の該当セクション
> （§5 敵仕様、§6 Wave・パワーシステム、§11 パラメータ表）も同時に更新してください。

新機能追加の標準手順:

1. `config.js` にパラメータを追加
2. 該当クラス / モジュールに挙動を実装
3. 必要なら `stageConfigs` の `allowedTypes` へ登録
4. ブラウザで `src/index.html` を開いて動作確認（コンソールにモジュールエラーがないこと）
5. この仕様書を更新
