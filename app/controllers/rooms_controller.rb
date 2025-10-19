# frozen_string_literal: true

class RoomsController < ApplicationController
  # GET /
  # トップページ（ルーム作成・参加画面）
  def new
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
  def show
    @room = RoomStore.instance.find_room(params[:id])

    if @room.nil?
      redirect_to root_path, alert: 'ルームが見つかりません'
    elsif @room.full?
      redirect_to root_path, alert: 'ルームが満室です'
    end
  end
end
