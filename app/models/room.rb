# frozen_string_literal: true

# Room - ルームのデータモデル
# 責務: プレイヤーリスト管理、状態判定（full?, empty?）
class Room
  MAX_PLAYERS = 30  # 最大プレイヤー数

  attr_reader :id, :players
  attr_accessor :host_id, :game_state

  def initialize(id)
    @id = id
    @players = []
    @host_id = nil
    @game_state = nil
  end

  def add_player(player)
    return false if full?

    @players << player
    @host_id ||= player.id  # 最初のプレイヤーをホストに設定
    true
  end

  def remove_player(player_id)
    removed_player = @players.find { |p| p.id == player_id }
    @players.reject! { |p| p.id == player_id }

    # ホストが退出した場合、次のプレイヤーをホストに
    if @host_id == player_id && @players.any?
      @host_id = @players.first.id
    end

    removed_player
  end

  def find_player(player_id)
    @players.find { |p| p.id == player_id }
  end

  def full?
    @players.size >= MAX_PLAYERS
  end

  def empty?
    @players.empty?
  end

  def host?(player_id)
    @host_id == player_id
  end

  def to_h
    {
      id: @id,
      players: @players.map(&:to_h),
      host_id: @host_id,
      max_players: MAX_PLAYERS,
      game_state: @game_state&.to_h
    }
  end
end
