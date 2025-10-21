class GameChannel < ApplicationCable::Channel
  def subscribed
    room_id = params[:room_id]
    player_id = params[:player_id]

    unless room_id
      Rails.logger.warn "GameChannel: room_id がありません"
      return reject
    end

    unless player_id
      Rails.logger.warn "GameChannel: player_id がありません"
      return reject
    end

    room = RoomStore.instance.find_room(room_id)
    unless room
      Rails.logger.warn "GameChannel: ルームが見つかりません room_id=#{room_id}"
      return reject
    end

    # セッション情報を保存（切断時に使用）
    @room_id = room_id
    @player_id = player_id

    # ルーム専用のストリームに接続
    stream_from "game_channel_#{room_id}"
    Rails.logger.info "GameChannel: ルーム #{room_id} に接続しました (player_id=#{player_id})"
  end

  def unsubscribed
    # WebSocket切断時の処理
    return unless @room_id && @player_id

    room = RoomStore.instance.find_room(@room_id)
    return unless room

    player = room.find_player(@player_id)
    return unless player

    # プレイヤーをルームから削除
    removed_player = room.remove_player(@player_id)
    Rails.logger.info "GameChannel: プレイヤー #{@player_id} が退出しました (room_id=#{@room_id})"

    # 退出をブロードキャスト
    ActionCable.server.broadcast(
      "game_channel_#{@room_id}",
      {
        type: 'player_left',
        player: removed_player&.to_h,
        players: room.players.map(&:to_h),
        host_id: room.host_id
      }
    )
  end

  # 描画データを受信してブロードキャスト
  def draw(data)
    stroke = data['stroke']
    ActionCable.server.broadcast(
      "game_channel_#{@room_id}",
      {
        type: 'draw',
        player_id: @player_id,
        draw_data: stroke
      }
    )
  end

  # キャンバスクリアを受信してブロードキャスト
  def clear_canvas
    ActionCable.server.broadcast(
      "game_channel_#{@room_id}",
      {
        type: 'clear_canvas',
        player_id: @player_id
      }
    )
  end
end
