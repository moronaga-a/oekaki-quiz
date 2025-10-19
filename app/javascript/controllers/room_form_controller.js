import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="room-form"
export default class extends Controller {
  static targets = [
    "playerName",
    "roomId",
    "createButton",
    "joinButton",
    "createPlayerName",
    "joinPlayerName",
    "joinRoomId"
  ]

  connect() {
    this.updateButtons()
  }

  updateButtons() {
    const playerName = this.playerNameTarget.value.trim()
    const roomId = this.roomIdTarget.value.trim()

    // 名前が入力されているかチェック
    const hasPlayerName = playerName.length > 0

    // ルームIDが入力されているかチェック
    const hasRoomId = roomId.length > 0

    // ルーム作成ボタン: 名前があり、ルームIDが空の場合のみ有効
    this.createButtonTarget.disabled = !hasPlayerName || hasRoomId

    // ルーム参加ボタン: 名前とルームIDの両方がある場合のみ有効
    this.joinButtonTarget.disabled = !hasPlayerName || !hasRoomId

    // Hidden fieldsに値をコピー
    this.createPlayerNameTarget.value = playerName
    this.joinPlayerNameTarget.value = playerName
    this.joinRoomIdTarget.value = roomId
  }
}
