class GameChannel < ApplicationCable::Channel
  def subscribed
    room_id = params[:room_id]
    unless room_id
      Rails.logger.warn "GameChannel: room_id がありません"
      return reject
    end

    room = RoomStore.instance.find_room(room_id)
    unless room
      Rails.logger.warn "GameChannel: ルームが見つかりません room_id=#{room_id}"
      return reject
    end

    # ルーム専用のストリームに接続
    stream_from "game_channel_#{room_id}"
    Rails.logger.info "GameChannel: ルーム #{room_id} に接続しました"
  end
end
