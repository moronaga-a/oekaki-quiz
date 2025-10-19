# frozen_string_literal: true

# GameState - ゲーム状態のデータモデル
# 責務: ゲーム進行状態のデータ保持（ルーム操作、プレイヤー操作はしない）
class GameState
  attr_reader :room_id
  attr_accessor :status, :current_topic, :drawer_id

  # ゲーム状態の定数
  STATUS_WAITING = :waiting  # 待機中
  STATUS_PLAYING = :playing  # ゲーム中
  STATUS_FINISHED = :finished # ゲーム終了

  def initialize(room_id:)
    @room_id = room_id
    @status = STATUS_WAITING
    @current_topic = nil
    @drawer_id = nil
  end

  def playing?
    @status == STATUS_PLAYING
  end

  def waiting?
    @status == STATUS_WAITING
  end

  def finished?
    @status == STATUS_FINISHED
  end

  def start!
    @status = STATUS_PLAYING
  end

  def finish!
    @status = STATUS_FINISHED
  end

  def reset!
    @status = STATUS_WAITING
    @current_topic = nil
    @drawer_id = nil
  end

  def to_h
    {
      status: @status,
      current_topic: @current_topic,
      drawer_id: @drawer_id
    }
  end
end
