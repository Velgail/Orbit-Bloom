# Orbit-Bloom（オービット・ブルーム）

シンプルな図形たちが夜空で踊る、やさしめサバイバルシューティング。

**▶ 遊ぶ: https://velgail.github.io/Orbit-Bloom/**

インストール不要・ブラウザだけで動きます（PC / スマホ / タブレット対応）。

## ゲーム内容

- 60秒ごとに Wave が進行し、敵の種類と密度が少しずつ増えていくエンドレスサバイバル
- Wave クリアごとに **POWER UP!** — 自機は連射・弾速・ダメージが強化され、敵も強くなる
- 弾は自動発射。プレイヤーがやることは「動く・避ける・ダッシュする」だけ
- 9種類の敵（まっすぐ落ちる者、ジグザグ、波打つ者、渦を巻く者、追尾する者、そして4種の弾幕シューター）
- ハイスコアはブラウザに自動保存されます

## 操作方法

| 操作 | PC | スマホ / タブレット |
| --- | --- | --- |
| 移動 | WASD / 矢印キー | 画面左下のバーチャルスティック |
| ダッシュ（短い無敵つき） | Shift / Space | 右下の DASH ボタン |
| ポーズ | P / Esc | ポーズ画面をタップで再開 |
| サウンド ON/OFF | M | — |
| スタート / リトライ | 任意のキー / クリック | タップ |

ダッシュのクールダウンは自機の周りの黄色いアーク（モバイルは DASH ボタンのアーク）で確認できます。

## ローカルで動かす

ES モジュールを使っているため、`file://` では動きません。HTTP サーバー経由で開いてください:

```bash
git clone https://github.com/Velgail/Orbit-Bloom.git
cd Orbit-Bloom
python3 -m http.server 8000 --directory src
# → http://localhost:8000 を開く
```

ビルド不要・依存ライブラリなし（Vanilla JS + HTML5 Canvas + WebAudio のみ）。

## ドキュメント

- 技術仕様: [docs/spec-orbit-bloom.md](docs/spec-orbit-bloom.md)
- AI アシスタント向け開発ガイド: [CLAUDE.md](CLAUDE.md)

## ライセンス

[Boost Software License 1.0](LICENSE)
