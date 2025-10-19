# frozen_string_literal: true

# GameService - ゲーム制御ロジック
class GameService
  attr_reader :room

  def initialize(room)
    @room = room
  end

  def start_game
    return false if room.players.empty?

    room.game_state ||= GameState.new(room_id: room.id)
    room.game_state.start!

    start_round
  end

  def start_round
    return false unless room.game_state&.playing?

    # ランダムにdrawerを選出
    drawer = select_drawer
    return false if drawer.nil?

    # お題を選択
    topic = TopicService.random_topic

    # 状態を更新
    room.game_state.drawer_id = drawer.id
    room.game_state.current_topic = topic

    # プレイヤーの役割を設定
    room.players.each do |player|
      player.role = (player.id == drawer.id) ? :drawer : :guesser
    end

    true
  end

  def finish_game
    room.game_state&.finish!

    # 全プレイヤーの役割をリセット
    room.players.each do |player|
      player.role = :guesser
    end
  end

  # ゲームリセット（待機状態に戻す）
  def reset_game
    room.game_state&.reset!

    # 全プレイヤーの役割をリセット
    room.players.each do |player|
      player.role = :guesser
    end
  end

  # 回答チェック
  def check_answer(answer)
    return false unless room.game_state&.playing?
    return false if room.game_state.current_topic.blank?

    TopicService.correct?(answer, room.game_state.current_topic)
  end

  # 現在のお題を取得（drawerのみ）
  def current_topic_for(player_id)
    return nil unless room.game_state&.playing?
    return nil unless room.game_state.drawer_id == player_id

    topic = room.game_state.current_topic
    topic.is_a?(Hash) ? (topic[:main] || topic['main']) : topic
  end

  private

  def select_drawer
    return nil if room.players.empty?

    # 前回のdrawerを取得
    previous_drawer_id = room.game_state&.drawer_id

    # 前回のdrawer以外から選出
    candidates = if previous_drawer_id && room.players.size > 1
                   room.players.reject { |p| p.id == previous_drawer_id }
                 else
                   room.players
                 end

    candidates.sample
  end
end
