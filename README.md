# お絵描きクイズゲーム

リアルタイムで複数人が遊べるお絵描きクイズゲーム。1人がお題を絵に描き、他のプレイヤーが当てるゲームです。

## 技術スタック

- **フレームワーク**: Ruby on Rails 7.2+
- **リアルタイム通信**: Action Cable (WebSocket)
- **フロントエンド**: Hotwire (Turbo + Stimulus)
- **スタイリング**: Tailwind CSS
- **Canvas描画**: HTML5 Canvas API + Stimulus
- **データストア**: メモリベース（DB不要）
- **開発環境**: Docker + Docker Compose

## 開発コマンド

```bash
# Docker環境起動
docker compose up

# コンソール
docker compose run --rm web rails console

# ルーティング確認
docker compose run --rm web rails routes

# Gemインストール
docker compose run --rm web bundle install
docker compose build
```

## 環境変数

```bash
# .env
RAILS_ENV=development
```

---

## 📚 ドキュメント

- **[モデル構造図.md](./docs/モデル構造図.md)** - RoomStore, Room, Player, GameStateの構造と関係性
- **[Canvas動作シーケンス図.md](./docs/Canvas動作シーケンス図.md)** - Canvas描画のリアルタイム同期
- **[チャット機能シーケンス図.md](./docs/チャット機能シーケンス図.md)** - チャット機能と正誤判定
- **[リアルタイム通信シーケンス図.md](./docs/リアルタイム通信.md)** - Action Cableの通信の仕組み

---

## 🎮 ゲームの遊び方

1. **ルーム作成**: システムがランダムな6桁のルームID（例: ABC123）を発行
2. **ルーム参加**: 他のプレイヤーはルームIDを入力して参加
3. **ゲーム開始**: ホストがゲーム開始ボタンをクリック
4. **お絵描き**: お絵描きプレイヤーにお題が表示され、絵を描く
5. **回答**: 回答プレイヤーがチャットで回答
6. **正誤判定**: 正解なら次のラウンドへ、不正解ならゲーム継続

## 🔧 主な機能

### ✅ 実装済み

- ルーム作成・参加（6桁ID）
- お絵描き機能（ペン・消しゴム・リセット）
- リアルタイム描画同期（Action Cable）
- チャット機能と正誤判定
- プレイヤー一覧のリアルタイム更新
- ゲーム状態管理（ステートマシンパターン）
- ホスト変更機能（退出時）
- リロード警告

### 🚧 未実装（今後の拡張）

- AI対戦モード（Claude Vision API）
- スコアシステム
- タイマー機能
- ルーム設定
- レスポンシブ対応

---

## 🚀 デプロイ（Render）

### Web Service の作成

1. Render Dashboard > New > Web Service
2. GitHubリポジトリを接続
3. 環境変数を設定:
   ```
   RAILS_ENV=production
   RAILS_MASTER_KEY=<config/master.keyの内容>
   ```
4. デプロイ実行

### Action Cable の設定

```ruby
# config/cable.yml
production:
  adapter: redis
  url: <%= ENV.fetch("REDIS_URL") %>

# config/environments/production.rb
config.action_cable.url = "wss://your-app.onrender.com/cable"
```


