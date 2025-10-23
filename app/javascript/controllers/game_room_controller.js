import { Controller } from "@hotwired/stimulus"
// WebSocket接続を使い回して無駄な接続生成を防止
import consumer from "channels/consumer"

// Connects to data-controller="game-room"
export default class extends Controller {
  static targets = ["playersList", "playersCount", "gameControls", "gameStatus", "canvasArea", "chatMessages", "messageInput", "answerButton"]
  static values = {
    roomId: String,
    currentPlayerId: String,
    currentPlayerName: String
  }

  connect() {
    if (this.hasRoomIdValue && this.roomIdValue) {
      // 既存の接続があれば先にクリーンアップ
      this.disconnectFromGameChannel()
      this.connectToGameChannel()
      this.setupUnloadWarning()
    }
  }

  disconnect() {
    // タイマーをクリーンアップ
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
      this.reconnectionTimer = null
    }

    this.disconnectFromGameChannel()
    this.removeUnloadWarning()
  }

  disconnectFromGameChannel() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
  }

  setupUnloadWarning() {
    this.handleBeforeUnload = (event) => {
      // ページを離れる前に警告を表示
      event.preventDefault()
      event.returnValue = '' // Chrome requires returnValue to be set
      return '' // 一部のブラウザで必要
    }
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  removeUnloadWarning() {
    if (this.handleBeforeUnload) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    }
  }

  connectToGameChannel() {
    // 同じパラメータで既存の接続がある場合はスキップ
    const identifier = JSON.stringify({
      channel: "GameChannel",
      room_id: this.roomIdValue,
      player_id: this.currentPlayerIdValue
    })

    const existing = consumer.subscriptions.findAll(identifier)
    if (existing.length > 0) {
      console.log('既存のWebSocket接続を再利用します')
      this.subscription = existing[0]
      return
    }

    this.subscription = consumer.subscriptions.create(
      {
        channel: "GameChannel",
        room_id: this.roomIdValue,
        player_id: this.currentPlayerIdValue
      },
      {
        connected: () => {
          console.log('✅ WebSocket接続成功', new Date().toLocaleTimeString())
          this.connectionStatus = 'connected'
          // 再接続時に最新の状態を取得
          this.requestStateUpdate()
        },

        disconnected: () => {
          console.log('❌ WebSocket切断 - 自動再接続を試みます', new Date().toLocaleTimeString())
          this.connectionStatus = 'disconnected'
          // 自動再接続（Action Cableが自動的に行うが、念のため状態をクリア）
          this.scheduleReconnection()
        },

        received: (data) => {
          console.log('📨 WebSocketメッセージ受信:', {
            type: data.type,
            time: new Date().toLocaleTimeString()
          })

          switch(data.type) {
            case 'player_joined':
              this.handlePlayerJoined(data)
              break
            case 'player_left':
              this.handlePlayerLeft(data)
              break
            case 'game_state_updated':
              console.log('🎮 ゲーム状態更新メッセージ受信')
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
            case 'correct_answer':
              this.handleCorrectAnswer(data)
              break
            case 'incorrect_answer':
              this.handleIncorrectAnswer(data)
              break
            default:
              console.warn('⚠️ 未知のメッセージタイプ:', data.type)
          }
        }
      }
    )
  }

  // 再接続スケジュール
  scheduleReconnection() {
    // 既存のタイマーをクリア
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer)
    }

    // 3秒後に状態更新をリクエスト
    this.reconnectionTimer = setTimeout(() => {
      if (this.subscription) {
        console.log('再接続後の状態更新をリクエスト')
        this.requestStateUpdate()
      }
    }, 3000)
  }

  // サーバーに最新状態を要求
  requestStateUpdate() {
    if (this.subscription) {
      this.subscription.perform('request_state_update')
    }
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
    try {
      console.log('🔄 handleGameStateUpdated開始', {
        hasPlayers: !!data.players,
        hasGameState: !!data.game_state,
        hostId: data.host_id
      })

      this.updatePlayersList(data.players, data.host_id)
      console.log('  ✓ updatePlayersList完了')

      this.updateGameControls(data.players, data.host_id)
      console.log('  ✓ updateGameControls完了')

      this.updateGameState(data.game_state, data.players, data.host_id)
      console.log('  ✓ updateGameState完了')

      // 新しいラウンド開始時にチャットとキャンバスをクリア
      if (data.game_state && data.game_state.status === 'playing') {
        this.clearChat()
        console.log('  ✓ clearChat完了')

        this.resetCanvas()
        console.log('  ✓ resetCanvas完了')
      }

      console.log('✅ handleGameStateUpdated完了')
    } catch (error) {
      console.error('❌ handleGameStateUpdatedでエラー:', error)
      console.error('エラースタック:', error.stack)
    }
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

    console.log('ゲーム開始ボタンがクリックされました', {
      roomId: this.roomIdValue,
      playerId: this.currentPlayerIdValue
    })

    try {
      const response = await fetch(`/rooms/${this.roomIdValue}/start_game`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.getAuthenticityToken(),
          'Content-Type': 'application/json'
        }
      })

      console.log('ゲーム開始API レスポンス:', {
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ゲーム開始に失敗しました', {
          status: response.status,
          error: errorText
        })
        alert('ゲーム開始に失敗しました。ページをリロードしてください。')
      } else {
        console.log('ゲーム開始成功')
      }
    } catch (error) {
      console.error('ゲーム開始エラー:', error)
      alert('ネットワークエラーが発生しました。')
    }
  }

  async nextRound(event) {
    event.preventDefault()

    console.log('🔵 次のラウンドボタンがクリックされました', {
      roomId: this.roomIdValue,
      playerId: this.currentPlayerIdValue,
      websocketStatus: this.connectionStatus || 'unknown',
      time: new Date().toLocaleTimeString()
    })

    // WebSocket接続状態をチェック
    if (this.connectionStatus === 'disconnected') {
      console.warn('⚠️ WebSocket切断中です。再接続を待ってからもう一度お試しください。')
      alert('接続が切断されています。少し待ってからもう一度お試しください。')
      return
    }

    try {
      const response = await fetch(`/rooms/${this.roomIdValue}/next_round`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': this.getAuthenticityToken(),
          'Content-Type': 'application/json'
        }
      })

      console.log('次のラウンドAPI レスポンス:', {
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('次のラウンド開始に失敗しました', {
          status: response.status,
          error: errorText
        })
        alert('次のラウンド開始に失敗しました。ページをリロードしてください。')
      } else {
        console.log('次のラウンド開始成功')
      }
    } catch (error) {
      console.error('次のラウンド開始エラー:', error)
      alert('ネットワークエラーが発生しました。')
    }
  }

  getAuthenticityToken() {
    const token = document.querySelector('meta[name="csrf-token"]')
    const tokenValue = token ? token.content : ''
    console.log('CSRF Token:', tokenValue ? '存在する' : '見つかりません')
    return tokenValue
  }

  updateGameState(gameState, players, hostId) {
    try {
      console.log('🎯 updateGameState開始', {
        hasGameStatusTarget: this.hasGameStatusTarget,
        gameStatus: gameState?.status,
        playerCount: players?.length
      })

      if (!this.hasGameStatusTarget) {
        console.warn('⚠️ gameStatusTarget が見つかりません')
        return
      }

      if (!gameState) {
        // ゲーム状態がない場合（待機中）
        console.log('  → 待機状態をレンダリング')
        this.renderWaitingState(players, hostId)
        this.updateCanvasArea(null, players)
        return
      }

      if (gameState.status === 'playing') {
        console.log('  → プレイ中状態をレンダリング')
        this.renderPlayingState(gameState, players, hostId)
        this.updateCanvasArea(gameState, players)
      } else if (gameState.status === 'finished') {
        console.log('  → 終了状態をレンダリング')
        this.renderFinishedState()
        this.updateCanvasArea(null, players)
      }

      console.log('✅ updateGameState完了')
    } catch (error) {
      console.error('❌ updateGameStateでエラー:', error)
      console.error('エラースタック:', error.stack)
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

    console.log('ゲーム状態レンダリング:', {
      currentPlayerId,
      hostId,
      isHost,
      playerCount: players.length
    })

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
    try {
      console.log('🖼️ updateCanvasArea開始')

      // Canvas Controllerを直接操作
      const canvasElement = document.querySelector('[data-controller="canvas"]')
      console.log('  Canvas要素:', canvasElement ? '見つかった' : '見つからない')

      const canvasController = this.application.getControllerForElementAndIdentifier(
        canvasElement,
        'canvas'
      )

      if (!canvasController) {
        console.warn('⚠️ canvasController が見つかりません')
        return
      }

      const currentPlayerId = this.currentPlayerIdValue

      if (!gameState || gameState.status !== 'playing') {
        // ゲーム開始前：待機メッセージを表示
        console.log('  → 待機メッセージを表示')
        canvasController.showWaiting()
        this.hideAnswerButton()
        return
      }

      // プレイ中：Canvasを表示
      const drawer = players.find(p => p.id === gameState.drawer_id)
      const drawerName = drawer ? drawer.name : '不明'
      const isDrawer = gameState.drawer_id === currentPlayerId

      console.log('  → Canvas表示', { isDrawer, drawerName })

      canvasController.isDrawerValue = isDrawer
      canvasController.showCanvas()

      if (isDrawer) {
        // お絵描きプレイヤー：お題を表示、回答ボタン非表示
        if (gameState.current_topic) {
          canvasController.updateTopic(gameState.current_topic)
        }
        this.hideAnswerButton()
      } else {
        // 観戦プレイヤー：描いている人の名前を表示、回答ボタン表示
        canvasController.updateDrawerName(drawerName)
        this.showAnswerButton()
      }

      console.log('✅ updateCanvasArea完了')
    } catch (error) {
      console.error('❌ updateCanvasAreaでエラー:', error)
      console.error('エラースタック:', error.stack)
    }
  }

  showAnswerButton() {
    if (this.hasAnswerButtonTarget) {
      this.answerButtonTarget.classList.remove('hidden')
    }
  }

  hideAnswerButton() {
    if (this.hasAnswerButtonTarget) {
      this.answerButtonTarget.classList.add('hidden')
    }
  }

  clearChat() {
    if (!this.hasChatMessagesTarget) return

    // チャットメッセージを全削除
    this.chatMessagesTarget.innerHTML = ''

    // 「新しいラウンド開始」メッセージを追加
    const messageDiv = document.createElement('div')
    messageDiv.className = 'p-2 rounded-lg bg-yellow-100 border-2 border-amber-600'

    const notificationText = document.createElement('div')
    notificationText.className = 'text-xs font-bold text-amber-900 text-center'
    notificationText.textContent = '🎮 新しいラウンドが始まりました'

    messageDiv.appendChild(notificationText)
    this.chatMessagesTarget.appendChild(messageDiv)
  }

  resetCanvas() {
    // Canvas Controllerを取得してリセット
    const canvasController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller="canvas"]'),
      'canvas'
    )

    if (canvasController) {
      canvasController.reset()
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Cmd+Enter または Ctrl+Enter でチャット送信
  handleKeydown(event) {
    // Enterキー単押しは何もしない（誤送信防止）
    if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      return
    }

    // Cmd+Enter または Ctrl+Enter でチャット送信
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.sendChatMessage(event)
    }
  }

  // チャット送信ボタンクリック
  sendChatMessage(event) {
    event.preventDefault()
    this.sendMessageToServer(false) // チャットとして送信（判定なし）
  }

  // 回答ボタンクリック
  submitAnswer(event) {
    event.preventDefault()
    this.sendMessageToServer(true) // 回答として送信（判定あり）
  }

  // フォーム送信（使用しない）
  sendMessage(event) {
    event.preventDefault()
  }

  // メッセージ送信処理（共通）
  sendMessageToServer(isAnswer = false) {
    if (!this.hasMessageInputTarget) return

    const message = this.messageInputTarget.value.trim()
    if (!message) return

    // WebSocket経由でメッセージ送信
    if (this.subscription) {
      this.subscription.perform('send_message', {
        message: message,
        player_name: this.currentPlayerNameValue,
        is_answer: isAnswer
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

  // 正解イベント受信
  handleCorrectAnswer(data) {
    if (!this.hasChatMessagesTarget) return

    // 正解通知メッセージを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = 'p-3 rounded-lg bg-green-100 border-4 border-green-600'

    const notificationText = document.createElement('div')
    notificationText.className = 'text-sm font-black text-green-900 text-center'
    notificationText.textContent = `${this.escapeHtml(data.player_name)}さんの回答「${this.escapeHtml(data.answer)}」あたり🎉`

    messageDiv.appendChild(notificationText)

    // 最初のメッセージの場合は「メッセージがありません」を削除
    const emptyMessage = this.chatMessagesTarget.querySelector('p.text-center')
    if (emptyMessage) {
      emptyMessage.remove()
    }

    // メッセージを追加
    this.chatMessagesTarget.appendChild(messageDiv)

    // 最新メッセージまでスクロール
    this.chatMessagesTarget.scrollTop = this.chatMessagesTarget.scrollHeight
  }

  // 不正解イベント受信
  handleIncorrectAnswer(data) {
    if (!this.hasChatMessagesTarget) return

    // 不正解通知メッセージを作成
    const messageDiv = document.createElement('div')
    messageDiv.className = 'p-3 rounded-lg bg-red-100 border-4 border-red-600'

    const notificationText = document.createElement('div')
    notificationText.className = 'text-sm font-black text-red-900 text-center'
    notificationText.textContent = `${this.escapeHtml(data.player_name)}さんの回答「${this.escapeHtml(data.answer)}」残念😇`

    messageDiv.appendChild(notificationText)

    // 最初のメッセージの場合は「メッセージがありません」を削除
    const emptyMessage = this.chatMessagesTarget.querySelector('p.text-center')
    if (emptyMessage) {
      emptyMessage.remove()
    }

    // メッセージを追加
    this.chatMessagesTarget.appendChild(messageDiv)

    // 最新メッセージまでスクロール
    this.chatMessagesTarget.scrollTop = this.chatMessagesTarget.scrollHeight
  }
}
