import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="canvas"
export default class extends Controller {
  static targets = ["canvas", "toolbar", "spectatorMessage", "spectatorText", "waitingMessage", "canvasContainer"]
  static values = {
    isDrawer: Boolean
  }

  connect() {
    this.canvas = this.canvasTarget
    this.ctx = this.canvas.getContext('2d')

    // Canvas サイズ設定
    this.resizeCanvas()
    window.addEventListener('resize', () => this.resizeCanvas())

    // 描画状態
    this.isDrawing = false
    this.currentTool = 'pen' // 'pen' or 'eraser'
    this.lineWidth = 3

    // イベントリスナー設定
    this.setupEventListeners()

    // 初期表示を更新
    this.updateVisibility()
  }

  disconnect() {
    window.removeEventListener('resize', () => this.resizeCanvas())
  }

  isDrawerValueChanged() {
    this.updateVisibility()
  }

  updateVisibility() {
    // デフォルトは待機中（Canvasエリア非表示、待機メッセージ表示）
    // ゲーム状態はupdateGameState()から制御される
  }

  showWaiting() {
    // 待機中の表示
    if (this.hasCanvasContainerTarget) {
      this.canvasContainerTarget.classList.add('hidden')
    }
    if (this.hasWaitingMessageTarget) {
      this.waitingMessageTarget.classList.remove('hidden')
    }
  }

  showCanvas() {
    // Canvas表示（ゲーム開始後）
    if (this.hasWaitingMessageTarget) {
      this.waitingMessageTarget.classList.add('hidden')
    }
    if (this.hasCanvasContainerTarget) {
      this.canvasContainerTarget.classList.remove('hidden')
    }

    // お絵描きプレイヤーかどうかでツールバー/観戦メッセージを切り替え
    if (this.isDrawerValue) {
      // お絵描きプレイヤー：ツールバーを表示
      if (this.hasToolbarTarget) {
        this.toolbarTarget.classList.remove('hidden')
      }
      if (this.hasSpectatorMessageTarget) {
        this.spectatorMessageTarget.classList.add('hidden')
      }
    } else {
      // 観戦プレイヤー：観戦メッセージを表示
      if (this.hasToolbarTarget) {
        this.toolbarTarget.classList.add('hidden')
      }
      if (this.hasSpectatorMessageTarget) {
        this.spectatorMessageTarget.classList.remove('hidden')
      }
    }
  }

  updateDrawerName(name) {
    if (this.hasSpectatorTextTarget) {
      this.spectatorTextTarget.textContent = `※ ${name} が描いています`
    }
  }

  resizeCanvas() {
    // Canvasの親要素のサイズに合わせる
    const rect = this.canvas.parentElement.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height

    this.ctx.fillStyle = '#FFFFFF' // 背景を白に
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  setupEventListeners() {
    // マウスイベント
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e))
    this.canvas.addEventListener('mousemove', (e) => this.draw(e))
    this.canvas.addEventListener('mouseup', () => this.stopDrawing())
    this.canvas.addEventListener('mouseout', () => this.stopDrawing())

    // タッチイベント（モバイル対応）
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      this.startDrawing(touch)
    })
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      this.draw(touch)
    })
    this.canvas.addEventListener('touchend', () => this.stopDrawing())
  }

  startDrawing(e) {
    // お絵描きプレイヤーのみ描画可能
    if (!this.isDrawerValue) return

    this.isDrawing = true

    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    this.ctx.beginPath()
    this.ctx.moveTo(x, y)

    // 描画設定
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    if (this.currentTool === 'pen') {
      this.ctx.strokeStyle = '#000000' // 黒
      this.ctx.lineWidth = this.lineWidth
      this.ctx.globalCompositeOperation = 'source-over'
    } else if (this.currentTool === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out'
      this.ctx.lineWidth = 20
    }
  }

  draw(e) {
    if (!this.isDrawing || !this.isDrawerValue) return

    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    this.ctx.lineTo(x, y)
    this.ctx.stroke()
  }

  stopDrawing() {
    if (!this.isDrawing) return
    this.isDrawing = false
    this.ctx.closePath()
  }

  // ツール切り替え
  selectPen() {
    this.currentTool = 'pen'
    this.canvas.style.cursor = 'crosshair'
    this.updateToolButtons()
  }

  selectEraser() {
    this.currentTool = 'eraser'
    // 消しゴム用のカーソル（丸）を設定
    // SVGで20pxの円形カーソルを作成
    const cursorSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><circle cx='10' cy='10' r='9' fill='none' stroke='black' stroke-width='2'/></svg>`
    this.canvas.style.cursor = `url("${cursorSvg}") 10 10, auto`
    this.updateToolButtons()
  }

  // キャンバスをクリア
  clearCanvas() {
    if (!this.isDrawerValue) return

    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  updateToolButtons() {
    // ツールボタンのアクティブ状態を更新（後で実装）
  }
}
