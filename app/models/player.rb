# frozen_string_literal: true

# Player - プレイヤーのデータモデル
# 責務: プレイヤーデータ保持のみ
# 接続状態は管理しない（WebSocket切断=退出として扱う）
class Player
  attr_reader :id, :name, :room_id
  attr_accessor :role

  def initialize(id:, name:, room_id:)
    @id = id
    @name = name
    @room_id = room_id
    @role = :guesser  # :drawer or :guesser
  end

  def drawer?
    @role == :drawer
  end

  def guesser?
    @role == :guesser
  end

  def to_h
    {
      id: @id,
      name: @name,
      role: @role
    }
  end
end
