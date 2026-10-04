// boardView.js - DEV 3
// Vẽ 2 lưới 10x10, kéo thả xếp tàu, xoay tàu, nút FIRE, click lưới địch.
// KHÔNG xử lý logic trúng/trượt: mọi kết quả do Java trả về, View chỉ vẽ.
import { animateShot, clearAllShots, shakeCell } from './animationView.js';

export const GRID_SIZE = 10;
const shipImg = (n) => new URL(`../../assets/images/ships/${n}.png`, import.meta.url).href;
// ratio = rộng / cao của ảnh tàu (đã cắt sát viền), dùng để xoay tàu dọc cho khớp ô
export const SHIP_DEFS = [
  { id: 'carrier',    name: 'Carrier',    size: 5, ratio: 4.135, img: shipImg('carrier') },
  { id: 'battleship', name: 'Battleship', size: 4, ratio: 3.474, img: shipImg('battleship') },
  { id: 'cruiser',    name: 'Cruiser',    size: 3, ratio: 2.82,  img: shipImg('cruiser') },
  { id: 'destroyer',  name: 'Destroyer',  size: 2, ratio: 2.521, img: shipImg('destroyer') },
];
Object.values(SHIP_DEFS).forEach((d) => { new Image().src = d.img; }); // nạp trước

const key = (x, y) => `${x},${y}`;

export class BoardView {
  /**
   * @param {Object} o
   * @param {HTMLElement} o.playerGridEl  div chứa lưới người chơi
   * @param {HTMLElement} o.enemyGridEl   div chứa lưới địch
   * @param {HTMLElement} o.enemyPanelEl  khung bao lưới địch (ẩn lúc xếp tàu)
   * @param {HTMLElement} o.dockEl        kho tàu
   * @param {HTMLButtonElement} o.fireBtnEl nút FIRE
   * @param {Object} o.handlers  { onFire(placement), onAttack(x, y) }
   */
  constructor({ playerGridEl, enemyGridEl, enemyPanelEl, dockEl, fireBtnEl, handlers = {} }) {
    this.playerGridEl = playerGridEl;
    this.enemyGridEl = enemyGridEl;
    this.enemyPanelEl = enemyPanelEl;
    this.dockEl = dockEl;
    this.fireBtnEl = fireBtnEl;
    this.handlers = handlers;

    this.cells = { player: new Map(), enemy: new Map() };
    this.ships = [];
    this.selectedId = null;
    this.draggingId = null;
    this.placementLocked = false;
    this.shotCells = new Set(); // ô địch đã bắn (chặn click lại)

    this.buildGrid(playerGridEl, 'player');
    this.buildGrid(enemyGridEl, 'enemy');
    this.enemyGridEl.classList.add('enemy');
    this.bindPlayerGrid();
    this.bindEnemyGrid();
    this.bindKeyboard();
    this.fireBtnEl.addEventListener('click', () => this.handleFireClick());
    this.reset();
  }

  /* ---------------- Vẽ lưới ---------------- */
  // Quy ước nhóm: gốc (0,0) ở GÓC DƯỚI TRÁI, y tăng lên trên.
  // Nên hàng hiển thị đầu tiên (trên cùng) có y = 9.
  buildGrid(gridEl, boardId) {
    gridEl.innerHTML = '';
    gridEl.classList.add('grid');
    for (let row = 0; row < GRID_SIZE; row++) {
      const y = GRID_SIZE - 1 - row;
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x;
        cell.dataset.y = y;
        gridEl.appendChild(cell);
        this.cells[boardId].set(key(x, y), cell);
      }
    }
  }

  cellFromEvent(e) {
    const el = e.target.closest('.cell');
    return el ? { el, x: Number(el.dataset.x), y: Number(el.dataset.y) } : null;
  }

  /* ---------------- Kho tàu ---------------- */
  renderDock() {
    this.dockEl.innerHTML = '';
    this.ships.forEach((ship) => {
      const div = document.createElement('div');
      div.className = 'dock-ship';
      div.dataset.id = ship.id;
      div.title = `${ship.name} (${ship.size}) - R hoặc chuột phải để xoay`;
      div.draggable = !this.placementLocked;
      div.style.setProperty('--n', ship.size);
      div.style.setProperty('--ratio', ship.ratio);
      const thumb = document.createElement('img');
      thumb.className = 'ship-thumb';
      thumb.src = ship.img;
      thumb.alt = ship.name;
      thumb.draggable = false;
      div.appendChild(thumb);
      div.classList.toggle('vertical', !ship.horizontal);
      div.classList.toggle('placed', ship.placed);
      div.classList.toggle('selected', ship.id === this.selectedId);

      div.addEventListener('click', () => this.select(ship.id));
      div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.select(ship.id);
        this.rotateSelected();
      });
      div.addEventListener('dragstart', (e) => {
        if (this.placementLocked) return e.preventDefault();
        this.draggingId = ship.id;
        this.select(ship.id);
        e.dataTransfer.setData('text/plain', ship.id); // Firefox yêu cầu có data
        e.dataTransfer.effectAllowed = 'move';
      });
      div.addEventListener('dragend', () => {
        this.draggingId = null;
        this.clearPreview();
      });
      this.dockEl.appendChild(div);
    });
  }

  select(id) {
    this.selectedId = id;
    this.dockEl.querySelectorAll('.dock-ship').forEach((el) =>
      el.classList.toggle('selected', el.dataset.id === id)
    );
  }

  getShip(id) { return this.ships.find((s) => s.id === id); }

  /* ---------------- Tính ô của tàu ---------------- */
  // Điểm neo (x,y): ngang = ô TRÁI NHẤT; dọc = ô TRÊN CÙNG.
  // Trục y hướng lên nên tàu dọc chiếm (x,y), (x,y-1), ... (x,y-size+1).
  shipCells(ship, x, y, horizontal = ship.horizontal) {
    const out = [];
    for (let i = 0; i < ship.size; i++) {
      out.push(horizontal ? { x: x + i, y } : { x, y: y - i });
    }
    return out;
  }

  // Chỉ để tô màu xem trước (xanh/đỏ). Bản kiểm tra chính thức nằm ở Java (Dev 1).
  canPlace(ship, x, y, horizontal = ship.horizontal) {
    const taken = new Set();
    this.ships.forEach((s) => {
      if (s.placed && s.id !== ship.id) {
        this.shipCells(s, s.x, s.y).forEach((c) => taken.add(key(c.x, c.y)));
      }
    });
    return this.shipCells(ship, x, y, horizontal).every(
      (c) => c.x >= 0 && c.x < GRID_SIZE && c.y >= 0 && c.y < GRID_SIZE && !taken.has(key(c.x, c.y))
    );
  }

  /* ---------------- Sự kiện lưới người chơi ---------------- */
  bindPlayerGrid() {
    const g = this.playerGridEl;

    g.addEventListener('dragover', (e) => {
      if (!this.draggingId) return;
      e.preventDefault(); // bắt buộc để cho phép drop
      const c = this.cellFromEvent(e);
      if (c) this.showPreview(this.getShip(this.draggingId), c.x, c.y);
    });
    g.addEventListener('dragleave', (e) => {
      if (!g.contains(e.relatedTarget)) this.clearPreview();
    });
    g.addEventListener('drop', (e) => {
      e.preventDefault();
      const c = this.cellFromEvent(e);
      const ship = this.getShip(this.draggingId);
      this.clearPreview();
      if (c && ship && this.canPlace(ship, c.x, c.y)) this.placeShip(ship, c.x, c.y);
      else if (c) shakeCell(c.el);
    });

    // Click vào tàu đã đặt -> nhấc về kho
    g.addEventListener('click', (e) => {
      if (this.placementLocked) return;
      const c = this.cellFromEvent(e);
      const ship = c && this.shipAt(c.x, c.y);
      if (ship) this.unplaceShip(ship);
    });
    // Chuột phải vào tàu đã đặt -> xoay tại chỗ
    g.addEventListener('contextmenu', (e) => {
      if (this.placementLocked) return;
      const c = this.cellFromEvent(e);
      const ship = c && this.shipAt(c.x, c.y);
      if (ship) {
        e.preventDefault();
        this.select(ship.id);
        this.rotateSelected();
      }
    });
  }

  shipAt(x, y) {
    return this.ships.find(
      (s) => s.placed && this.shipCells(s, s.x, s.y).some((c) => c.x === x && c.y === y)
    );
  }

  showPreview(ship, x, y) {
    this.clearPreview();
    const ok = this.canPlace(ship, x, y);
    this.shipCells(ship, x, y).forEach((c) => {
      this.cells.player.get(key(c.x, c.y))?.classList.add(ok ? 'preview-ok' : 'preview-bad');
    });
  }

  clearPreview() {
    this.playerGridEl
      .querySelectorAll('.preview-ok, .preview-bad')
      .forEach((el) => el.classList.remove('preview-ok', 'preview-bad'));
  }

  placeShip(ship, x, y) {
    ship.placed = true;
    ship.x = x;
    ship.y = y;
    this.renderPlacedShips();
    this.renderDock();
    this.updateFireButton();
  }

  unplaceShip(ship) {
    ship.placed = false;
    ship.x = ship.y = null;
    this.renderPlacedShips();
    this.renderDock();
    this.updateFireButton();
  }

  renderPlacedShips() {
    this.cells.player.forEach((el) => el.classList.remove('ship'));
    this.playerGridEl.querySelectorAll('.ship-img').forEach((el) => el.remove());
    this.ships.forEach((s) => {
      if (!s.placed) return;
      this.shipCells(s, s.x, s.y).forEach((c) =>
        this.cells.player.get(key(c.x, c.y))?.classList.add('ship')
      );
      // Ảnh tàu: neo tại ô (x,y); hàng hiển thị = GRID_SIZE-1-y
      const img = document.createElement('img');
      img.className = 'ship-img' + (s.horizontal ? '' : ' vertical');
      img.src = s.img;
      img.alt = s.name;
      img.draggable = false;
      img.style.setProperty('--n', s.size);
      img.style.setProperty('--ratio', s.ratio);
      img.style.setProperty('--col', s.x);
      img.style.setProperty('--row', GRID_SIZE - 1 - s.y);
      this.playerGridEl.appendChild(img);
    });
  }

  /* ---------------- Xoay tàu (phím R / Space / chuột phải) ---------------- */
  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'r' || e.key === 'R' || e.code === 'Space') {
        if (this.placementLocked || !this.playerGridEl.offsetParent) return;
        e.preventDefault();
        this.rotateSelected();
      }
    });
  }

  rotateSelected() {
    if (this.placementLocked) return;
    const ship = this.getShip(this.selectedId);
    if (!ship) return;
    const next = !ship.horizontal;
    if (ship.placed && !this.canPlace(ship, ship.x, ship.y, next)) {
      // Không đủ chỗ để xoay -> rung nhẹ ô neo
      shakeCell(this.cells.player.get(key(ship.x, ship.y)));
      return;
    }
    ship.horizontal = next;
    if (ship.placed) this.renderPlacedShips();
    this.renderDock();
  }

  /* ---------------- Nút FIRE ---------------- */
  allPlaced() { return this.ships.every((s) => s.placed); }

  updateFireButton() {
    this.fireBtnEl.disabled = !this.allPlaced() || this.placementLocked;
  }

  // Dữ liệu gửi sang Java. x,y = ô neo theo đúng quy ước nhóm.
  getPlacement() {
    return this.ships.map((s) => ({
      name: s.name, size: s.size, x: s.x, y: s.y, horizontal: s.horizontal,
    }));
  }

  handleFireClick() {
    if (!this.allPlaced() || this.placementLocked) return;
    this.fireBtnEl.disabled = true; // chặn bấm liên tục trong lúc chờ Java trả lời
    this.handlers.onFire?.(this.getPlacement());
  }

  // Presenter gọi khi Java báo OK (đã random tàu địch)
  enterBattle() {
    this.placementLocked = true;
    this.playerGridEl.classList.add('locked');
    this.fireBtnEl.classList.add('hidden');
    this.enemyPanelEl.classList.remove('hidden');
    this.renderDock();
    this.setTurn('NONE');
  }

  // Presenter gọi nếu Java báo lỗi (ví dụ đặt tàu không hợp lệ)
  cancelFire() { this.updateFireButton(); }

  /* ---------------- Lưới địch & lượt chơi ---------------- */
  bindEnemyGrid() {
    this.enemyGridEl.addEventListener('click', (e) => {
      const c = this.cellFromEvent(e);
      if (!c || this.enemyGridEl.classList.contains('disabled')) return;
      if (this.shotCells.has(key(c.x, c.y))) return shakeCell(c.el);
      this.setTurn('NONE'); // khóa ngay, chờ Java trả kết quả
      this.handlers.onAttack?.(c.x, c.y);
    });
  }

  // 'PLAYER' mở lưới địch; 'ENEMY' / 'NONE' khóa
  setTurn(turn) {
    this.enemyGridEl.classList.toggle('disabled', turn !== 'PLAYER');
  }

  // boardId: 'enemy' (kết quả người chơi bắn) | 'player' (kết quả bot bắn)
  // Trả về Promise: xong khi animation kết thúc (Presenter có thể await trước khi đổi lượt)
  showResult(boardId, x, y, status) {
    if (status === 'INVALID') return Promise.resolve();
    if (boardId === 'enemy') this.shotCells.add(key(x, y));
    const from = boardId === 'enemy' ? this.playerGridEl : this.enemyGridEl; // đạn bay từ lưới đối diện
    return animateShot(this.cells[boardId].get(key(x, y)), status, from);
  }

  /* ---------------- Reset (Play Again) ---------------- */
  reset() {
    this.ships = SHIP_DEFS.map((d) => ({ ...d, horizontal: true, placed: false, x: null, y: null }));
    this.selectedId = this.ships[0].id;
    this.draggingId = null;
    this.placementLocked = false;
    this.shotCells.clear();
    clearAllShots(this.playerGridEl);
    clearAllShots(this.enemyGridEl);
    this.playerGridEl.classList.remove('locked');
    this.enemyPanelEl.classList.add('hidden');
    this.fireBtnEl.classList.remove('hidden');
    this.setTurn('NONE');
    this.renderPlacedShips();
    this.renderDock();
    this.updateFireButton();
  }
}
