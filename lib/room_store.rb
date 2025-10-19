# frozen_string_literal: true

require 'singleton'

# RoomStore - ルーム管理のシングルトンクラス
# 責務: ルームのCRUD操作のみ（ビジネスロジックなし）
class RoomStore
  include Singleton

  def initialize
    @rooms = {}
    @mutex = Mutex.new
  end

  def create_room(room_id = nil)
    @mutex.synchronize do
      room_id ||= generate_room_id
      @rooms[room_id] = Room.new(room_id)
      @rooms[room_id]
    end
  end

  def find_room(room_id)
    @rooms[room_id]
  end

  # rails console用(ルーム削除は要件に無い)
  def delete_room(room_id)
    @mutex.synchronize do
      @rooms.delete(room_id)
    end
  end

  private

  # 6桁のランダムなルームIDを生成
  def generate_room_id
    loop do
      id = 6.times.map { [*'A'..'Z', *'0'..'9'].sample }.join
      break id unless @rooms.key?(id)
    end
  end
end
