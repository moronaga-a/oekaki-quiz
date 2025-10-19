# frozen_string_literal: true

# Player - プレイヤーのデータモデル
# 責務: プレイヤーデータ保持のみ
# 接続状態は管理しない（WebSocket切断=退出として扱う）
class Player
  MAX_NAME_LENGTH = 20

  attr_reader :id, :name
  attr_accessor :role

  def initialize(id:, name:)
    @id = id
    @name = name.to_s.strip
    @role = :guesser  # :drawer or :guesser
    validate!
  end

  def valid?
    errors.empty?
  end

  def errors
    @errors ||= []
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

  private

  def validate!
    @errors = []

    if @name.blank?
      @errors << 'プレイヤー名を入力してください'
    elsif @name.length > MAX_NAME_LENGTH
      @errors << "プレイヤー名は#{MAX_NAME_LENGTH}文字以内で入力してください"
    end

    raise ArgumentError, @errors.first unless @errors.empty?
  end
end
