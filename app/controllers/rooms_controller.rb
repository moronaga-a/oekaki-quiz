# frozen_string_literal: true

class RoomsController < ApplicationController
  before_action :set_room, only: [:show, :start_game, :next_round]

  # GET /
  # トップページ（ルーム作成・参加画面）
  def new
    # ルームID入力フォームから来た場合
    if params[:room_id].present?
      room_id = params[:room_id].upcase.strip
      room = RoomStore.instance.find_room(room_id)

      if room.nil?
        redirect_to root_path, alert: 'ルームが見つかりません'
      elsif room.full?
        redirect_to root_path, alert: 'ルームが満室です'
      else
        redirect_to room_path(room_id)
      end
    end
  end

  # POST /rooms
  def create
    room = RoomStore.instance.create_room
    redirect_to room_path(room.id)
  rescue StandardError => e
    Rails.logger.error("ルーム作成エラー: #{e.message}")
    redirect_to root_path, alert: 'ルームの作成に失敗しました'
  end

  # GET /rooms/:id
  # ゲーム画面
  def show
    return unless @room

    if @room.full?
      redirect_to root_path, alert: 'ルームが満室です'
    end
  end

  # POST /rooms/:id/start_game
  # ゲーム開始
  def start_game
    return unless @room

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
    return unless @room

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
    end
  end
end
