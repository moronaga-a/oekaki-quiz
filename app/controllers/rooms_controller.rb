# frozen_string_literal: true

class RoomsController < ApplicationController
  before_action :set_room, only: [:show, :start_game, :next_round]

  # GET /
  # トップページ（ルーム作成・参加画面）
  def new
    # ルームID入力フォームから来た場合（既存ルームに参加）
    if params[:room_id].present?
      room_id = params[:room_id].upcase.strip
      player_name = params[:player_name]

      # ルーム検索
      room = RoomStore.instance.find_room(room_id)

      if room.nil?
        redirect_to root_path, alert: 'ルームが見つかりません' and return
      elsif room.full?
        redirect_to root_path, alert: 'ルームが満室です' and return
      end

      # プレイヤー作成してルームに追加
      begin
        player_id = SecureRandom.uuid
        player = Player.new(id: player_id, name: player_name)

        if room.add_player(player)
          # セッションに保存
          session[:player_id] = player_id
          session[:room_id] = room.id

          redirect_to room_path(room_id), notice: "#{player.name} として参加しました！"
        else
          redirect_to root_path, alert: 'ルームが満室です'
        end
      rescue ArgumentError => e
        redirect_to root_path, alert: e.message
      end
    end
  end

  # POST /rooms
  def create
    player_name = params[:player_name]

    # ルーム作成
    room = RoomStore.instance.create_room

    # プレイヤー作成してルームに追加（ホストとして）
    begin
      player_id = SecureRandom.uuid
      player = Player.new(id: player_id, name: player_name)

      if room.add_player(player)
        # セッションに保存
        session[:player_id] = player_id
        session[:room_id] = room.id

        redirect_to room_path(room.id), notice: "ルームを作成しました！"
      else
        redirect_to root_path, alert: 'プレイヤーの追加に失敗しました'
      end
    rescue ArgumentError => e
      redirect_to root_path, alert: e.message
    end
  rescue StandardError => e
    Rails.logger.error("ルーム作成エラー: #{e.message}")
    redirect_to root_path, alert: 'ルームの作成に失敗しました'
  end

  # GET /rooms/:id
  # ゲーム画面
  def show
    if @room.full?
      redirect_to root_path, alert: 'ルームが満室です'
    end

    # セッションにプレイヤーIDがない場合は参加していない
    @current_player_id = session[:player_id]
  end

  # POST /rooms/:id/start_game
  # ゲーム開始
  def start_game
    game_service = GameService.new(@room)
    if game_service.start_game
      redirect_to room_path(@room.id), notice: 'ゲームを開始しました！'
    else
      redirect_to room_path(@room.id), alert: 'ゲームを開始できませんでした'
    end
  end

  # POST /rooms/:id/next_round
  # 次のラウンド開始
  def next_round
    game_service = GameService.new(@room)
    if game_service.start_round
      redirect_to room_path(@room.id), notice: '次のラウンドを開始しました！'
    else
      redirect_to room_path(@room.id), alert: '次のラウンドを開始できませんでした'
    end
  end

  private

  def set_room
    @room = RoomStore.instance.find_room(params[:id])

    if @room.nil?
      redirect_to root_path, alert: 'ルームが見つかりません'
      return false # アクションを実行しない
    end
  end
end
