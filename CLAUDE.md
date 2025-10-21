# お絵描きクイズゲーム - 開発ガイド

## プロジェクト概要

リアルタイムで複数人が遊べるお絵描きクイズゲーム。1人がお題を絵に描き、他のプレイヤーが当てるゲームです。AI対戦モードも搭載。

## 技術スタック

- **フレームワーク**: Ruby on Rails 7.2+
- **リアルタイム通信**: Action Cable (WebSocket)
- **フロントエンド**: Hotwire (Turbo + Stimulus)
- **スタイリング**: Tailwind CSS
- **Canvas描画**: HTML5 Canvas API + Stimulus
- **AI機能**: Anthropic Claude API (画像認識)
- **データストア**: メモリベース（DB不要）
- **開発環境**: Docker + Docker Compose

## 実装方針

### ✅ やること（基本機能）
- ルーム作成・参加（6桁ID）
- お絵描き機能（ペン・消しゴム・リセット）
- リアルタイム描画同期（Action Cable）
- チャット機能と正誤判定
- AI対戦モード（Claude Vision API）
- シンプルなゲームフロー（1お題ずつ繰り返し）

### ❌ やらないこと（基本実装では省略）
- ラウンド数管理
- スコアシステム
- タイマー機能
- ルーム設定
- 観戦モード
- リプレイ機能
- WebSocket再接続時の状態復元
- ルームライフサイクル管理
- レスポンシブ対応

## コア機能

### 1. ルームシステム
- システムがランダムな6桁のルームID（例: ABC123）を発行
- ホストプレイヤーがルームを作成
- 他のプレイヤーはルームIDを入力して参加
- プレイヤー一覧のリアルタイム更新

### 2. ゲームフロー
1. ホストが「ゲーム開始」をクリック
2. お絵描きプレイヤーをランダムに選出
3. お絵描きプレイヤーにのみお題を表示
4. お絵描きプレイヤーが絵を描く（リアルタイム同期）
5. 回答プレイヤーがチャットで回答
6. 正解 → 次のラウンドへ
7. 不正解 → ゲーム継続

### 3. お絵描き機能
- **ペン**: 黒色のみ
- **消しゴム**: 部分的に消去可能
- **リセット**: キャンバス全体をクリア
- **リアルタイム同期**: 描画データをAction Cableで全プレイヤーに配信

### 4. チャット機能
- プレイヤー間でメッセージ送信
- 回答の自動判定（正誤判定ロジック）
- メッセージのリアルタイム表示

### 5. AI対戦モード
- AI（Claude Vision）が回答プレイヤーとして参加
- 5秒ごとにCanvas画像を解析
- AIが推測した答えをチャットに投稿
- 人間プレイヤーと同じルールで判定

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

# コンテナに入る
docker compose exec web bash
```

## 環境変数
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx
RAILS_ENV=development
```

## デプロイ

### Renderでのデプロイ

1. **事前準備**
   - GitHubにプロジェクトをプッシュ
   - Renderアカウント作成（https://render.com）

2. **Web Serviceの作成**
   - Render Dashboard > New > Web Service
   - GitHubリポジトリを接続
   - 以下の設定を入力：
     - **Name**: `oekaki-quiz`
     - **Environment**: `Docker`
     - **Plan**: Free（または有料プラン）
     - **Build Command**: 自動検出（Dockerfileを使用）
     - **Start Command**: 自動検出

3. **環境変数の設定**
   - Environment タブで以下を追加：
     ```
     ANTHROPIC_API_KEY=sk-ant-xxxxx
     RAILS_ENV=production
     RAILS_MASTER_KEY=<config/master.keyの内容>
     ```

4. **デプロイ実行**
   - "Create Web Service" をクリック
   - 自動的にビルド＆デプロイが開始
   - デプロイ完了後、RenderのURLでアクセス可能

5. **Action Cableの設定**
   - `config/cable.yml` と `config/environments/production.rb` でRenderのURLを設定
   - WebSocket接続が正しく動作するよう確認

## 実装タスク

### フェーズ1: モデル層実装

#### 基盤モデル作成
- [x] RoomStore（シングルトンパターン）
- [x] Room（ルームクラス）
- [x] Player（プレイヤークラス）
- [x] GameState（ゲーム状態管理）

### フェーズ2: ルーム機能実装

#### ルーム作成・表示
- [x] ルーティング設定
- [x] RoomsController 作成
- [x] View 作成
  - [x] トップページ
  - [x] ゲーム画面

#### ゲーム制御機能
- [x] サービス層実装
  - [x] お題データ作成
  - [x] お題選択ロジック
  - [x] ゲーム制御ロジック
    - [x] ゲーム開始処理（drawer選出、お題選択）
    - [x] 次ラウンド開始処理
    - [x] ゲーム終了処理

- [x] Controller 拡張
  - [x] ゲーム開始アクション
  - [x] 次ラウンドアクション

### フェーズ3: プレイヤー参加（WebSocket基盤）

#### プレイヤー参加処理
- [x] Controller 拡張
  - [x] プレイヤー参加処理
  - [x] プレイヤー名バリデーション（必須、1-10文字）
  - [x] セッション管理（player_id, room_id保存）

- [x] View 拡張
  - [x] プレイヤー一覧エリア追加
  - [x] プレイヤー名入力フォーム追加

#### WebSocket リアルタイム同期
- [x] GameChannel 作成
  - [x] チャンネル参加処理
  - [x] 退出処理
  - [x] メッセージ受信処理
  - [x] イベントハンドリング

- [x] Stimulus Controller 作成
  - [x] WebSocket接続処理
  - [x] プレイヤー一覧動的更新
  - [x] 接続・切断イベント処理

#### プレイヤー退出処理
- [x] 退出ロジック実装
  - [x] WebSocket切断時の自動退出
  - [x] ホスト変更ロジック（Room#remove_player内）
  - [x] 手動退出ボタン実装
  - [x] 退出時のブロードキャスト

### フェーズ4: お絵描き機能実装

#### Canvas 描画機能
- [x] Canvas Controller 作成
  - [x] Canvas初期化処理
  - [x] ペン描画機能（黒のみ、線幅調整）
  - [x] 消しゴム機能
  - [x] リセット機能（全体クリア）
  - [x] 描画イベント収集（座標データ）

- [x] View 拡張
  - [x] ゲーム画面にCanvas要素追加
  - [x] 描画ツールUI（ペン/消しゴム/リセットボタン）

#### 描画リアルタイム同期
- [x] GameChannel 拡張
  - [x] 描画データブロードキャスト
  - [x] リセットイベントハンドリング

- [x] Canvas Controller 拡張
  - [x] 描画データ送信処理
  - [x] 他プレイヤーの描画受信・再生
  - [x] リセットイベント送受信

### フェーズ5: チャット＋正誤判定実装

#### チャット基盤
- [ ] Chat Controller 作成
  - [ ] メッセージ送信フォーム処理
  - [ ] メッセージ表示エリア動的更新

- [ ] GameChannel 拡張
  - [ ] チャットイベントハンドリング
  - [ ] メッセージブロードキャスト

- [ ] View 拡張
  - [ ] ゲーム画面にチャットUI追加

#### 正誤判定ロジック
- [ ] TopicService に正誤判定機能追加（実装済み）
  - [ ] メッセージ正規化（ひらがな・カタカナ統一、スペース除去）
  - [ ] お題との完全一致判定（エイリアス含む）

- [ ] GameChannel 拡張
  - [ ] メッセージ受信時に正誤判定実行（TopicService 使用）
  - [ ] 正解イベントブロードキャスト
  - [ ] 正解時の処理（正解通知、次ラウンド開始）

### フェーズ6: AI対戦モード実装

#### AI対戦基盤
- [ ] `anthropic` Gem追加
- [ ] AI Opponent Service 作成
  - [ ] Canvas画像取得・Base64エンコード
  - [ ] Claude Vision API連携
  - [ ] 推測結果をチャットに投稿
  - [ ] 5秒間隔での実行ロジック

- [ ] Controller 拡張
  - [ ] AI参加ボタン実装
  - [ ] AIプレイヤー追加処理
  - [ ] バックグラウンドでAI実行

### フェーズ7: UI/UX改善

#### スタイリング
- [ ] Tailwind CSS実装
  - [ ] 全体レイアウト調整（グリッド、フレックス）
  - [ ] 描画ツールUIデザイン
  - [ ] チャット画面デザイン（メッセージバブル、色分け）
  - [ ] プレイヤー一覧・お題表示デザイン
  - [ ] ボタン・フォームのスタイリング

#### エラーハンドリング
- [ ] エラー処理強化
  - [ ] ルーム不存在・満室エラー表示
  - [ ] バリデーションエラー表示
  - [ ] WebSocket接続エラー処理
  - [ ] フラッシュメッセージ実装
