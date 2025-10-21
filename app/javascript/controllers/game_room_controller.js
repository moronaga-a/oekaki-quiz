import { Controller } from "@hotwired/stimulus"
// WebSocket接続を使い回して無駄な接続生成を防止
import consumer from "channels/consumer"

// Connects to data-controller="game-room"
export default class extends Controller {
  static targets = ["playersList", "playersCount", "gameControls", "gameStatus", "canvasArea", "chatMessages", "messageInput"]
  static values = {
    roomId: String,
    currentPlayerId: String,
    currentPlayerName: String
  }

  connect() {
    if (this.hasRoomIdValue && this.roomIdValue) {
      this.connectToGameChannel()
    }
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }

  connectToGameChannel() {
    this.subscription = consumer.subscriptions.create(
      {
        channel: "GameChannel",
        room_id: this.roomIdValue,
        player_id: this.currentPlayerIdValue
      },
      {
        connected: () => {
          // WebSocket接続成功
        },

        disconnected: () => {
          // WebSocket切断
        },

        received: (data) => {
          switch(data.type) {
            case 'player_joined':
              this.handlePlayerJoined(data)
              break
            case 'player_left':
              this.handlePlayerLeft(data)
              break
            case 'game_state_updated':
              this.handleGameStateUpdated(data)
              break
            case 'draw':
              this.handleDraw(data)
              break
            case 'clear_canvas':
              this.handleClearCanvas(data)
              break
            case 'chat_message':
              this.handleChatMessage(data)
              break
          }
        }
      }
    )
  }

  handlePlayerJoined(data) {
    this.updatePlayersList(data.players, data.host_id)
    this.updateGameControls(data.players, data.host_id)
  }

  handlePlayerLeft(data) {
    this.updatePlayersList(data.players, data.host_id)
    this.updateGameControls(data.players, data.host_id)
  }

  handleGameStateUpdated(data) {
    this.updatePlayersList(data.players, data.host_id)
    this.updateGameControls(data.players, data.host_id)
    this.updateGameState(data.game_state, data.players, data.host_id)
  }

  handleDraw(data) {
    // 自分の描画は既にローカルで描画済みなのでスキップ
    if (data.player_id === this.currentPlayerIdValue) return

    const canvasController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="canvas"]'),
      'canvas'
    )

    if (canvasController) {
      canvasController.replayDrawing(data.draw_data)
    }
  }

  handleClearCanvas(data) {
    // 自分のクリアは既にローカルで実行済みなのでスキップ
    if (data.player_id === this.currentPlayerIdValue) return

    const canvasController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="canvas"]'),
      'canvas'
    )

    if (canvasController) {
      canvasController.clearCanvasReceived()
    }
  }

  updatePlayersList(players, hostId) {
    if (!this.hasPlayersListTarget) return

    const currentPlayerId = this.currentPlayerIdValue

    if (this.hasPlayersCountTarget) {
      this.playersCountTarget.textContent = players.length
    }

    if (players.length === 0) {
      this.playersListTarget.innerHTML = '<p class="text-amber-700 text-sm font-bold">プレイヤーがいません</p>'
      return
    }

    const playersHTML = players.map(player => {
      const isCurrentPlayer = player.id === currentPlayerId
      return `
        <div class="flex items-center justify-between p-2 bg-yellow-50 border-2 border-amber-900 rounded">
          <span class="text-sm font-black text-amber-900">
            ${this.escapeHtml(player.name)}
            ${isCurrentPlayer ? '<span class="text-xs text-amber-600">(あなた)</span>' : ''}
          </span>
          ${player.id === hostId ? '<span class="text-xs bg-amber-600 text-white px-2 py-1 border-2 border-amber-900 rounded font-black uppercase">HOST</span>' : ''}
        </div>
      `
    }).join('')

    this.playersListTarget.innerHTML = playersHTML
  }

  updateGameControls(players, hostId) {
    if (!this.hasGameControlsTarget) return

    const currentPlayerId = this.currentPlayerIdValue
    const isHost = hostId === currentPlayerId
    const playerCount = players.length

    // ゲーム開始ボタンの表示/非表示
    if (playerCount >= 2) {
      if (isHost) {
        this.gameControlsTarget.innerHTML = `
          <button data-action="click->game-room#startGame" class="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 px-4 border-4 border-green-900 rounded-lg shadow-[4px_4px_0px_0px_rgba(20,83,45,1)] hover:shadow-[2px_2px_0px_0px_rgba(20,83,45,1)] active:shadow-none transition-all uppercase">ゲーム開始</button>
        `
      } else {
        this.gameControlsTarget.innerHTML = '<p class="text-xs text-amber-600 font-bold">※ ホストのみ開始可能</p>'
      }
    } else {
      this.gameControlsTarget.innerHTML = '<p class="text-xs text-amber-600 font-bold">※ 2人以上必要です</p>'
    }
  }

  async startGame(event) {
    event.preventDefault()

    try {
      const response = await fetch(`/rooms/${this.roomIdValue}/start_game`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.getAuthenticityToken(),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('ゲーム開始に失敗しました')
      }
    } catch (error) {
      console.error('ゲーム開始エラー:', error)
    }
  }

  async nextRound(event) {
    event.preventDefault()

    try {
      const response = await fetch(`/rooms/${this.roomIdValue}/next_round`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.getAuthenticityToken(),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('次のラウンド開始に失敗しました')
      }
    } catch (error) {
      console.error('次のラウンド開始エラー:', error)
    }
  }

  getAuthenticityToken() {
    const token = document.querySelector('meta[name="csrf-token"]')
    return token ? token.content : ''
  }

  updateGameState(gameState, players, hostId) {
    if (!this.hasGameStatusTarget) return

    if (!gameState) {
      // ゲーム状態がない場合（待機中）
      this.renderWaitingState(players, hostId)
      this.updateCanvasArea(null, players)
      return
    }

    if (gameState.status === 'playing') {
      this.renderPlayingState(gameState, players, hostId)
      this.updateCanvasArea(gameState, players)
    } else if (gameState.status === 'finished') {
      this.renderFinishedState()
      this.updateCanvasArea(null, players)
    }
  }

  renderWaitingState(players, hostId) {
    // ゲーム制御ボタンは別途更新されるので、ここでは待機中メッセージのみ
    this.gameStatusTarget.innerHTML = `
      <p class="text-sm text-amber-700 font-bold mb-3">ゲーム未開始</p>
      <div data-game-room-target="gameControls">
        <p class="text-xs text-amber-600 font-bold">※ 2人以上必要です</p>
      </div>
    `
    // ゲーム制御ボタンを更新（プレイヤー数を考慮）
    this.updateGameControls(players, hostId)
  }

  renderPlayingState(gameState, players, hostId) {
    const currentPlayerId = this.currentPlayerIdValue
    const drawer = players.find(p => p.id === gameState.drawer_id)
    const drawerName = drawer ? this.escapeHtml(drawer.name) : '不明'
    const isHost = hostId === currentPlayerId

    const hostControls = isHost ? `
      <button data-action="click->game-room#nextRound" class="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-4 border-4 border-amber-900 rounded-lg shadow-[3px_3px_0px_0px_rgba(120,53,15,1)] hover:shadow-[1px_1px_0px_0px_rgba(120,53,15,1)] active:shadow-none transition-all uppercase text-sm">次のラウンド</button>
    ` : '<p class="text-xs text-amber-600 font-bold">※ ホストのみ操作可能</p>'

    this.gameStatusTarget.innerHTML = `
      <div class="space-y-3">
        <p class="text-sm font-bold text-amber-900">状態: <span class="font-black text-green-700">プレイ中</span></p>
        <p class="text-sm font-bold text-amber-900">お絵描きプレイヤー: <span class="font-black">${drawerName}</span></p>
        ${hostControls}
      </div>
    `
  }

  renderFinishedState() {
    this.gameStatusTarget.innerHTML = `
      <p class="text-sm font-bold text-amber-900">状態: <span class="font-black text-red-700">終了</span></p>
    `
  }

  updateCanvasArea(gameState, players) {
    // Canvas Controllerを直接操作
    const canvasController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="canvas"]'),
      'canvas'
    )

    if (!canvasController) return

    const currentPlayerId = this.currentPlayerIdValue

    if (!gameState || gameState.status !== 'playing') {
      // ゲーム開始前：待機メッセージを表示
      canvasController.showWaiting()
      return
    }

    // プレイ中：Canvasを表示
    const drawer = players.find(p => p.id === gameState.drawer_id)
    const drawerName = drawer ? drawer.name : '不明'
    const isDrawer = gameState.drawer_id === currentPlayerId

    canvasController.isDrawerValue = isDrawer

    canvasController.showCanvas()

    if (!isDrawer) {
      canvasController.updateDrawerName(drawerName)
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Cmd+Enter または Ctrl+Enter でメッセージ送信
  handleKeydown(event) {
    // Enterキー単押しは何もしない（誤送信防止）
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      return
    }

    // Cmd+Enter または Ctrl+Enter で送信
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.sendMessageAction()
    }
  }

  sendMessageClick(event) {
    event.preventDefault()
    this.sendMessageAction()
  }

  sendMessage(event) {
    event.preventDefault()
  }

  sendMessageAction() {
    if (!this.hasMessageInputTarget) return

    const message = this.messageInputTarget.value.trim()
    if (!message) return

    // WebSocket経由でメッセージ送信
    if (this.subscription) {
      this.subscription.perform('send_message', {
        message: message,
        player_name: this.currentPlayerNameValue
      })
    }

    // 入力欄をクリア
    this.messageInputTarget.value = ''
  }

  // チャットメッセージ受信
  handleChatMessage(data) {
    if (!this.hasChatMessagesTarget) return

    const isOwnMessage = data.player_id === this.currentPlayerIdValue

    // メッセージバブルを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = `p-2 rounded-lg ${isOwnMessage ? 'bg-amber-100 border-2 border-amber-600' : 'bg-white border-2 border-amber-900'}`

    const playerNameSpan = document.createElement('div')
    playerNameSpan.className = 'text-xs font-black text-amber-900 mb-1'
    playerNameSpan.textContent = `${this.escapeHtml(data.player_name)}${isOwnMessage ? ' (あなた)' : ''}`

    const messageText = document.createElement('div')
    messageText.className = 'text-sm font-bold text-amber-900'
    messageText.style.overflowWrap = 'anywhere'
    messageText.textContent = this.escapeHtml(data.message)

    messageDiv.appendChild(playerNameSpan)
    messageDiv.appendChild(messageText)

    // 最初のメッセージの場合は「メッセージがありません」を削除
    const emptyMessage = this.chatMessagesTarget.querySelector('p.text-center')
    if (emptyMessage) {
      emptyMessage.remove()
    }

    this.chatMessagesTarget.appendChild(messageDiv)

    // 最新メッセージまでスクロール
    this.chatMessagesTarget.scrollTop = this.chatMessagesTarget.scrollHeight
  }
}
