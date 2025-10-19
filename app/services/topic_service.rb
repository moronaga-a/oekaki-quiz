# frozen_string_literal: true

# TopicService - お題選択ロジック
class TopicService
  class << self
    # ランダムにお題を選択
    # @return [Hash] { main: 'お題', aliases: ['別名1', '別名2'] }
    def random_topic
      topics.sample
    end

    # 回答が正解かチェック
    def correct?(answer, topic)
      return false if answer.blank? || topic.blank?

      normalized_answer = normalize(answer)

      # メインの答えをチェック
      return true if normalize(topic[:main]) == normalized_answer
      return true if normalize(topic['main']) == normalized_answer

      # エイリアスをチェック
      aliases = topic[:aliases] || topic['aliases'] || []
      aliases.any? { |alias_name| normalize(alias_name) == normalized_answer }
    end

    private

    # YAMLファイルからお題を読み込み
    # @return [Array<Hash>] お題の配列
    def topics
      @topics ||= begin
        file_path = Rails.root.join('config', 'quiz_topics.yml')
        data = YAML.load_file(file_path)
        data['topics'].map(&:deep_symbolize_keys)
      end
    end

    # 文字列を正規化（ひらがな・カタカナ統一、スペース削除）
    def normalize(str)
      return '' if str.nil?

      # ひらがなに変換
      normalized = str.tr('ァ-ン', 'ぁ-ん')

      # 全角英数字を半角に
      normalized = normalized.tr('０-９ａ-ｚＡ-Ｚ', '0-9a-za-z')

      # スペース、記号を削除
      normalized.gsub(/[\s　、。！？!?]/, '')
    end
  end
end
