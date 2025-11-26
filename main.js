// main.js - Logic fixes; UI unchanged
const GAME_WIDTH = 1440;
const GAME_HEIGHT = 1024;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  backgroundColor: 0xfff0f6,
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image('bg', 'assets/Desktop_JustDivide_Game_2.png');
  this.load.image('cat', 'assets/Cat.png');
  this.load.image('placement', 'assets/Placement_Box.png');
  this.load.image('badge_img', encodeURI('assets/Levels and Score.png'));
  this.load.image('blue', 'assets/blue.png');
  this.load.image('pink', 'assets/pink.png');
  this.load.image('orange', 'assets/orange.png');
  this.load.image('red', 'assets/red.png');
  this.load.image('purpule', 'assets/purpule.png');
}

function create() {
  const scene = this;

  // state
  scene.state = {
    gridSize: 4,
    slotSize: 120,
    gap: 18,
    boardX: 220,
    boardY: 260,
    queueX: 980,
    queueY: 340,
    queue: [],
    keepVal: null,
    trashCount: 10,
    score: 0,
    level: 1,
    best: parseInt(localStorage.getItem('justdivide_best') || '0', 10),
    hintsOn: true,
    difficulty: 1,
    timerSec: 0,
    history: [],
    badgeHorizontalGap: 400,
    paused: false
  };

  // background
  if (this.textures.exists('bg')) this.add.image(GAME_WIDTH/2, GAME_HEIGHT/2, 'bg').setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  else this.cameras.main.setBackgroundColor(0xfff0f6);

  // top UI
  this.add.text(GAME_WIDTH/2, 22, 'JUST DIVIDE', { font: '48px "Arial Black"', color: '#222' }).setOrigin(0.5, 0);
  scene.timerText = this.add.text(GAME_WIDTH/2, 86, `⏳  ${formatTime(scene.state.timerSec)}`, { font: '22px Arial', color: '#222' }).setOrigin(0.5, 0);
  this.add.text(GAME_WIDTH/2, 122, 'DIVIDE WITH THE NUMBERS TO SOLVE THE ROWS AND COLUMNS.', { font: '20px Arial', color: '#c53a23', align: 'center' }).setOrigin(0.5, 0);

  // pause & help
  scene.pauseBtn = this.add.circle(48, 48, 32, 0x8e44ad).setInteractive({ useHandCursor: true });
  this.add.text(48, 48, '||', { font: '20px Arial', color: '#fff' }).setOrigin(0.5).setDepth(5);
  scene.pauseBtn.on('pointerdown', () => { scene.state.paused = !scene.state.paused; scene.pauseBtn.setFillStyle(scene.state.paused ? 0x555555 : 0x8e44ad); });

  scene.helpBtn = this.add.circle(GAME_WIDTH - 48, 48, 32, 0x2ecc71).setInteractive({ useHandCursor: true });
  this.add.text(GAME_WIDTH - 48, 48, '?', { font: '22px Arial', color: '#fff' }).setOrigin(0.5).setDepth(5);
  scene.helpBtn.on('pointerdown', () => showHelp(scene));

  // board frame
  const s = scene.state.slotSize, g = scene.state.gap, S = scene.state.gridSize;
  const boardW = S*s + (S-1)*g + 24;
  const boardH = S*s + (S-1)*g + 64;
  const boardX = scene.state.boardX - 12;
  const boardY = scene.state.boardY - 12;

  const boardG = this.add.graphics();
  boardG.fillStyle(0x0fa6a3, 1);
  boardG.fillRoundedRect(boardX, boardY, boardW, boardH, 20);
  boardG.lineStyle(6, 0xffffff, 1);
  boardG.strokeRoundedRect(boardX + 6, boardY + 6, boardW - 12, boardH - 12, 16);

  // cat peek
  if (this.textures.exists('cat')) {
    const catX = boardX + boardW/2;
    const catY = boardY - 100;
    scene.catSprite = this.add.image(catX, catY, 'cat').setOrigin(0.5, 0).setScale(0.66).setDepth(200);
  }

  // 4x4 slots (keeping +36 vertical offset as-is)
  scene.slots = [];
  for (let r = 0; r < S; r++) {
    scene.slots[r] = [];
    for (let c = 0; c < S; c++) {
      const cx = scene.state.boardX + c*(s+g) + s/2;
      const cy = scene.state.boardY + r*(s+g) + s/2 + 36;
      let slotSprite;
      if (this.textures.exists('placement')) slotSprite = this.add.image(cx, cy, 'placement').setDisplaySize(s - 6, s - 6).setDepth(30);
      else slotSprite = this.add.rectangle(cx, cy, s - 6, s - 6, 0x0e8a87).setStrokeStyle(4, 0xffffff).setDepth(30);
      scene.slots[r][c] = { x: cx, y: cy, tile: null, sprite: slotSprite, r, c };
    }
  }

  // badges
  const badgeCenterX = boardX + boardW/2;
  const badgeY = scene.state.boardY - 30;
  const halfGap = scene.state.badgeHorizontalGap / 2;
  function drawBadge(x,y){
    const gg = scene.add.graphics();
    gg.fillStyle(0xd94444, 1);
    gg.fillRoundedRect(x - 110, y, 220, 64, 12);
    gg.lineStyle(6, 0xffffff);
    gg.strokeRoundedRect(x - 110, y, 220, 64, 12);
    return gg;
  }
  drawBadge(badgeCenterX - halfGap, badgeY);
  drawBadge(badgeCenterX + halfGap, badgeY);
  scene.badgeLevelText = this.add.text(badgeCenterX - halfGap, badgeY + 18, `LEVEL ${scene.state.level}`, { font: '22px Arial', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0);
  scene.badgeScoreText = this.add.text(badgeCenterX + halfGap, badgeY + 18, `SCORE ${scene.state.score}`, { font: '22px Arial', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5, 0);

  // right panel (orange)
  const panelCX = scene.state.queueX;
  const panelTop = scene.state.boardY + 20;
  const panelW = 240, panelH = 520;
  const panelGfx = this.add.graphics();
  panelGfx.fillStyle(0xffb26b, 1);
  panelGfx.fillRoundedRect(panelCX - panelW/2, panelTop, panelW, panelH, 20);
  panelGfx.lineStyle(4, 0xe06e1a);
  panelGfx.strokeRoundedRect(panelCX - panelW/2 + 2, panelTop + 2, panelW - 4, panelH - 4, 18);

  // KEEP / UPCOMING / TRASH
  scene.keepBox = this.add.image(panelCX, panelTop + 64, 'placement').setDisplaySize(120,120).setDepth(40);
  this.add.text(panelCX, panelTop + 140, 'KEEP', { font: '20px Arial', color: '#0b5f4a', fontStyle: 'bold' }).setOrigin(0.5);
  this.add.text(panelCX, panelTop + 176, 'UPCOMING', { font: '18px Arial', color: '#4a2b00', fontStyle: 'bold' }).setOrigin(0.5);
  scene.upX = panelCX;
  scene.upY = panelTop + 210;

  const twoBoxY = panelTop + 262;
  const boxG = this.add.graphics();
  boxG.fillStyle(0xffffff, 1);
  boxG.fillRoundedRect(panelCX - 80, twoBoxY - 39, 160, 78, 10);
  boxG.lineStyle(4, 0xcccccc);
  boxG.strokeRoundedRect(panelCX - 80, twoBoxY - 39, 160, 78, 10);

  this.add.text(panelCX, panelTop + 340, 'TRASH', { font: '20px Arial', color: '#c92b2b', fontStyle: 'bold' }).setOrigin(0.5);
  scene.trashBox = this.add.image(panelCX, panelTop + 410, 'placement').setDisplaySize(110,110).setDepth(40);
  scene.trashCounterText = this.add.text(panelCX, panelTop + 476, `x${scene.state.trashCount}`, { font: '18px Arial', color: '#111' }).setOrigin(0.5);
  this.add.text(panelCX, panelTop + panelH - 22, 'Hints: ON (G)', { font: '14px Arial', color: '#0b5f4a' }).setOrigin(0.5);

  // tile group
  scene.tileGroup = this.add.group();

  // init queue (ensure length 3)
  for (let i=0;i<3;i++) scene.state.queue.push(makeRandomTile(scene.state.difficulty));
  scene.upcomingSprites = [];
  renderUpcoming.call(scene);
  spawnDraggableFromQueue.call(scene);
  renderKeep.call(scene);

  // input handlers (drag)
  scene.input.on('dragstart', (pointer, obj) => { obj.setDepth(1000); obj.dragging=true; });
  scene.input.on('drag', (pointer, obj, dragX, dragY) => {
    obj.x = dragX; obj.y = dragY;
    if (obj.valueText) { obj.valueText.x = dragX; obj.valueText.y = dragY; }
  });
  // dragend calls handleDrop; handleDrop routes to attemptPlace/KEEP/TRASH or returns to origin
  scene.input.on('dragend', (pointer, obj) => {
    obj.dragging=false;
    handleDrop.call(scene, obj, pointer.upX, pointer.upY);
  });

  scene.input.on('gameobjectdown', (pointer, obj) => {
    // Clicking the top upcoming tile -> consume it correctly
if (obj.getData('isUpcomingTop')) {

  // If draggable already exists, ignore
  if (scene.currentDraggable) return;

  // read value
  const value = obj.getData('value');

  // destroy the preview the user clicked
  destroyTileSprite.call(scene, obj);

  // remove the tile from QUEUE (critical fix)
  scene.state.queue.shift();

  // refill queue to length 3
  while (scene.state.queue.length < 3) {
    scene.state.queue.push(makeRandomTile(scene.state.difficulty));
  }

  // re-render previews
  renderUpcoming.call(scene);

  // now create draggable from THIS EXACT VALUE
  const spr = createTileSprite.call(scene, scene.upX, scene.upY, value);
  spr.setInteractive({ draggable: true });
  spr.setData('value', value);
  spr.startX = spr.x;
  spr.startY = spr.y;

  scene.currentDraggable = spr;
}

  });

  // keyboard
  scene.input.keyboard.on('keydown-Z', () => undoMove.call(scene));
  scene.input.keyboard.on('keydown-R', () => restartGame.call(scene));
  scene.input.keyboard.on('keydown-G', () => { scene.state.hintsOn = !scene.state.hintsOn; refreshHints.call(scene); });
  scene.input.keyboard.on('keydown-P', () => { scene.state.paused = !scene.state.paused; });

  // timer tick
  saveSnapshot.call(scene);
  scene.time.addEvent({ delay: 1000, loop: true, callback: () => {
    if (!scene.state.paused) {
      scene.state.timerSec++;
      scene.timerText.setText(`⏳  ${formatTime(scene.state.timerSec)}`);
    }
  }});

  refreshHints.call(scene);
}

// ------------------------- HELP & PAUSE (unchanged) -------------------------
function showHelp(scene) {
  if (scene.helpPopup) scene.helpPopup.destroy(true);
  const w = 520, h = 340;
  let popup = scene.add.container(720, 500);
  let bg = scene.add.rectangle(0, 0, w, h, 0xffffff, 1).setStrokeStyle(4, 0x222222).setOrigin(0.5);
  let text = scene.add.text(0, -20,
    "HOW TO PLAY:\n\n• Drag tiles into the board\n• Use KEEP box to store 1 tile\n• Use TRASH to discard\n• Solve rows & columns\n",
    { font: "22px Arial", color: "#000", align: "center", wordWrap: { width: 420 } }
  ).setOrigin(0.5);
  let closeBtn = scene.add.text(0, h/2 - 40, "CLOSE", {
    font: "26px Arial", color: "#c53a23", fontStyle: "bold"
  }).setOrigin(0.5).setInteractive().on("pointerdown", () => popup.destroy());
  popup.add([bg, text, closeBtn]);
  popup.setDepth(9999);
  scene.helpPopup = popup;
}

function togglePause(scene) {
  scene.isPaused = !scene.isPaused;
  if (scene.isPaused) {
    scene.pauseOverlay = scene.add.rectangle(720, 512, 1440, 1024, 0x000000, 0.35);
    scene.pauseText = scene.add.text(720, 512, "PAUSED", { font: "64px Arial", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
  } else {
    if (scene.pauseOverlay) scene.pauseOverlay.destroy();
    if (scene.pauseText) scene.pauseText.destroy();
  }
}

/* ---------- Helpers & fixes ---------- */

function formatTime(sec) {
  const mm = String(Math.floor(sec/60)).padStart(2,'0');
  const ss = String(sec%60).padStart(2,'0');
  return `${mm}:${ss}`;
}

function makeRandomTileValue(difficulty) {
  const pools = {1:[2,2,3,3,4,4,5,6,8,9], 2:[2,3,3,4,4,5,6,6,8,9,10,12], 3:[3,4,5,6,6,8,9,10,12,15,16,18]};
  const arr = pools[difficulty] || pools[1];
  return Phaser.Utils.Array.GetRandom(arr);
}

function pickColorKey(val) {
  if (val >= 15) return 'purpule';
  if (val >= 10) return 'red';
  if (val >= 6) return 'orange';
  if (val <= 3) return 'pink';
  return 'blue';
}

function makeRandomTile(difficulty) {
  const v = makeRandomTileValue(difficulty);
  return { value: v, key: pickColorKey(v) };
}

function createTileSprite(x, y, value) {
  const scene = this;
  const key = pickColorKey(value);
  const spr = scene.add.image(x, y, key)
    .setDisplaySize(scene.state.slotSize - 22, scene.state.slotSize - 22)
    .setDepth(120);

  spr.value = value;         // CURRENT VALUE
  spr.setData('value', value);

  const txt = scene.add.text(x, y, String(value), {
    font: '28px Arial',
    color: '#fff',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(121);

  spr.valueText = txt;
  scene.tileGroup.add(spr);

  spr.on('destroy', () => {
    if (txt && txt.destroy) txt.destroy();
  });

  return spr;
}


function renderUpcoming() {
  const scene = this;
  if (scene.upcomingSprites) scene.upcomingSprites.forEach(s => {
    if (s.destroy) s.destroy();
    if (s.valueText && s.valueText.destroy) s.valueText.destroy();
  });
  scene.upcomingSprites = [];

  const startX = scene.upX - 50;   // shift left for first tile
  const startY = scene.upY + 90;   // keep them between KEEP and TRASH
  const gapX = 100;                // horizontal spacing between tiles

  scene.state.queue.slice(0, 2).forEach((tile, i) => {
    const x = startX + i * gapX;   // ⬅️ horizontal offset
    const y = startY;
    const spr = scene.add.image(x, y, tile.key).setDisplaySize(80, 80).setDepth(150);
    const txt = scene.add.text(x, y, tile.value, {
      font: '24px Arial', color: '#fff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(151);
    spr.valueText = txt;
    spr.setData('value', tile.value);
    if (i === 0) spr.setData('isUpcomingTop', true);
    scene.upcomingSprites.push(spr);
  });
}


function spawnDraggableFromQueue() {
  const scene = this;

  // only one draggable at a time
  if (scene.currentDraggable) return;

  // ensure queue has at least 1
  if (!scene.state.queue.length) {
    scene.state.queue.push(makeRandomTile(scene.state.difficulty));
  }

  // take first tile from queue
  const nextTile = scene.state.queue.shift();

  // refill queue to 3
  while (scene.state.queue.length < 3) {
    scene.state.queue.push(makeRandomTile(scene.state.difficulty));
  }

  // create current draggable (always at upX, upY)
  const spr = createTileSprite.call(scene, scene.upX, scene.upY, nextTile.value);
  spr.setInteractive({ draggable: true });
  spr.setData('value', nextTile.value);
  spr.startX = spr.x;
  spr.startY = spr.y;
  scene.currentDraggable = spr;

  // render upcoming queue below the current tile
  renderUpcoming.call(scene);
}




function destroyTileSprite(s) {
  if (!s || s.destroyed) return;
  // clear tile references if it's in a slot
  try {
    // find if this sprite is used in a slot and clear it
    if (this.slots) {
      for (let r=0;r<this.slots.length;r++) {
        for (let c=0;c<this.slots[r].length;c++) {
          const t = this.slots[r][c].tile;
          if (t && t.sprite === s) {
            this.slots[r][c].tile = null;
          }
        }
      }
    }
  } catch (err) { /* ignore */ }

  if (s.valueText && s.valueText.destroy) s.valueText.destroy();
  if (s.destroy) s.destroy();
  s.destroyed = true;
  if (this.currentDraggable === s) this.currentDraggable = null;
}

function handleDrop(obj, dropX, dropY) {
  const scene = this;
  const val = obj.getData('value');
  if (val == null) {
    // safety: no value -> destroy
    destroyTileSprite.call(scene, obj);
    scene.currentDraggable = null;
    spawnDraggableFromQueue.call(scene);
    return;
  }

  const trashZone = scene.trashBox.getBounds();
  const keepZone = scene.keepBox.getBounds();

  // TRASH
  if (Phaser.Geom.Rectangle.Contains(trashZone, dropX, dropY)) {
    if (scene.state.trashCount <= 0) {
      // cannot trash, revert
      obj.x = obj.startX; obj.y = obj.startY;
      if (obj.valueText) { obj.valueText.x = obj.x; obj.valueText.y = obj.y; }
      return;
    }
    saveSnapshot.call(scene);
    scene.state.trashCount--;
    if (scene.trashCounterText) scene.trashCounterText.setText(`x${scene.state.trashCount}`);
    destroyTileSprite.call(scene, obj);
    scene.currentDraggable = null;
    spawnDraggableFromQueue.call(scene);
    afterMove.call(scene);
    return;
  }

  // KEEP
  if (Phaser.Geom.Rectangle.Contains(keepZone, dropX, dropY)) {
    saveSnapshot.call(scene);
    if (!scene.state.keepVal) {
      scene.state.keepVal = { value: val, key: pickColorKey(val) };
      renderKeep.call(scene);
      destroyTileSprite.call(scene, obj);
      scene.currentDraggable = null;
      spawnDraggableFromQueue.call(scene);
    } else {
      // swap: return old keep to front of queue
      const old = scene.state.keepVal;
      scene.state.keepVal = { value: val, key: pickColorKey(val) };
      renderKeep.call(scene);
      destroyTileSprite.call(scene, obj);
      // put old keep tile at front of queue so it's next
      scene.state.queue.unshift(old);
      // keep queue length consistent (we maintain length >=3 in spawn)
      scene.currentDraggable = null;
      spawnDraggableFromQueue.call(scene);
    }
    afterMove.call(scene);
    return;
  }

  // BOARD: find slot and attempt place
  for (let r = 0; r < scene.state.gridSize; r++) {
    for (let c = 0; c < scene.state.gridSize; c++) {
      const slot = scene.slots[r][c];
      const sb = slot.sprite.getBounds();
      if (Phaser.Geom.Rectangle.Contains(sb, dropX, dropY)) {
        attemptPlace.call(scene, obj, r, c);
        return;
      }
    }
  }

  // fallback: return to origin
  obj.x = obj.startX; obj.y = obj.startY;
  if (obj.valueText) { obj.valueText.x = obj.x; obj.valueText.y = obj.y; }
}

function attemptPlace(sprite, row, col) {
  const scene = this;
  saveSnapshot.call(scene);

  const srcVal = sprite.getData('value');
  const slot = scene.slots[row][col];
  const dest = slot.tile; // either null or {value, sprite}

  // empty slot -> place tile
  if (!dest) {
    const newTile = createTileSprite.call(scene, slot.x, slot.y, srcVal);
    newTile.setInteractive({ draggable: true });
    slot.tile = { value: srcVal, sprite: newTile };
    // destroy dragged sprite (and its text)
    destroyTileSprite.call(scene, sprite);
    scene.currentDraggable = null;
    // spawn next draggable from queue
    spawnDraggableFromQueue.call(scene);
    afterMove.call(scene);
    return;
  }

  // occupied slot -> merge/divide logic
  const destVal = dest.value;
  const a = Math.max(destVal, srcVal), b = Math.min(destVal, srcVal);

  // equal values -> double (remove both and award 2*value)
  if (destVal === srcVal) {
    scene.state.score += destVal * 2;
    // remove destination sprite
    destroyTileSprite.call(scene, dest.sprite);
    slot.tile = null;
    destroyTileSprite.call(scene, sprite);
  }
  // divisible -> replace with quotient (award 'a' points)
  else if (a % b === 0) {
    const q = a / b;
    scene.state.score += a;
    // remove destination sprite
    destroyTileSprite.call(scene, dest.sprite);
    slot.tile = null;
    if (q !== 1) {
      const newTile = createTileSprite.call(scene, slot.x, slot.y, q);
      newTile.setInteractive({ draggable: true });
      slot.tile = { value: q, sprite: newTile };
    }
    destroyTileSprite.call(scene, sprite);
  } else {
    // invalid move -> revert dragged sprite to origin (no state changes)
    sprite.x = sprite.startX; sprite.y = sprite.startY;
    if (sprite.valueText) { sprite.valueText.x = sprite.startX; sprite.valueText.y = sprite.startY; }
    return;
  }

  checkLevelUp.call(scene);
  updateScoreTexts.call(scene);
  scene.currentDraggable = null;
  spawnDraggableFromQueue.call(scene);
  afterMove.call(scene);
}

function placeIntoSlot(sprite, r, c, value) {
  const scene = this;
  const sl = scene.slots[r][c];
  destroyTileSprite.call(scene, sprite);
  const s = createTileSprite.call(scene, sl.x, sl.y, value);
  s.setInteractive && s.setInteractive({ draggable: true });
  sl.tile = { value, sprite: s };
}

function destroyTile(spr) {
  if (!spr) return;
  if (spr.valueText && spr.valueText.destroy) spr.valueText.destroy();
  if (spr.destroy) spr.destroy();
}

function consumeQueueTop() {
  // not used by core flow; spawnDraggableFromQueue manages queue
  const scene = this;
  scene.state.queue.shift();
  scene.state.queue.push(makeRandomTile(scene.state.difficulty));
  renderUpcoming.call(scene);
}

function renderKeep() {
  const scene = this;
  if (scene.keepSprite) { destroyTileSprite.call(scene, scene.keepSprite); scene.keepSprite = null; }
  if (scene.state.keepVal) {
    scene.keepSprite = createTileSprite.call(scene, scene.keepBox.x, scene.keepBox.y, scene.state.keepVal.value);
  }
}

function handleTrash(sprite) {
  const scene = this;
  if (scene.state.trashCount <= 0) {
    sprite.x = sprite.startX; sprite.y = sprite.startY;
    if (sprite.valueText) { sprite.valueText.x = sprite.x; sprite.valueText.y = sprite.y; }
    return;
  }
  saveSnapshot.call(scene);
  scene.state.trashCount--;
  if (scene.trashCounterText) scene.trashCounterText.setText(`x${scene.state.trashCount}`);
  destroyTileSprite.call(scene, sprite);
  scene.currentDraggable = null;
  spawnDraggableFromQueue.call(scene);
  afterMove.call(scene);
}

function updateScoreTexts() {
  if (this.badgeScoreText) this.badgeScoreText.setText(`SCORE ${this.state.score}`);
  if (this.badgeLevelText) this.badgeLevelText.setText(`LEVEL ${this.state.level}`);
}

function checkLevelUp() {
  const scene = this;
  const newL = Math.floor(scene.state.score / 10) + 1;
  if (newL > scene.state.level) {
    scene.state.level = newL;
    scene.state.trashCount += 2;
    if (scene.trashCounterText) scene.trashCounterText.setText(`x${scene.state.trashCount}`);
  }
  if (scene.state.score > scene.state.best) {
    scene.state.best = scene.state.score;
    localStorage.setItem('justdivide_best', String(scene.state.best));
  }
}

function saveSnapshot() {
  const scene = this;
  const gridVals = scene.slots.map(row => row.map(s => s.tile ? s.tile.value : null));
  const snap = {
    grid: gridVals,
    queue: JSON.parse(JSON.stringify(scene.state.queue)),
    keepVal: scene.state.keepVal,
    score: scene.state.score,
    level: scene.state.level,
    trash: scene.state.trashCount,
    timer: scene.state.timerSec
  };
  scene.state.history.push(JSON.parse(JSON.stringify(snap)));
  if (scene.state.history.length > 40) scene.state.history.shift();
}

function undoMove(recordHistory = true) {
  const scene = this;
  if (!scene.state.history || scene.state.history.length <= 1) return;
  if (recordHistory) saveSnapshot.call(scene);
  scene.state.history.pop();
  const snap = scene.state.history[scene.state.history.length - 1];

  // clear current tiles
  for (let r=0; r<scene.slots.length; r++) {
    for (let c=0; c<scene.slots[r].length; c++) {
      if (scene.slots[r][c].tile) {
        destroyTile(scene.slots[r][c].tile.sprite);
        scene.slots[r][c].tile = null;
      }
    }
  }

  // rebuild tiles from snapshot
  for (let r=0; r<snap.grid.length; r++) {
    for (let c=0; c<snap.grid[r].length; c++) {
      const v = snap.grid[r][c];
      if (v !== null && v !== undefined) {
        const s = createTileSprite.call(scene, scene.slots[r][c].x, scene.slots[r][c].y, v);
        s.setInteractive({ draggable: true });
        scene.slots[r][c].tile = { value: v, sprite: s };
      }
    }
  }

  // clear current draggable
  if (scene.currentDraggable) {
    destroyTileSprite.call(scene, scene.currentDraggable);
    scene.currentDraggable = null;
  }

  // restore state
  scene.state.queue = snap.queue.slice();
  scene.state.keepVal = snap.keepVal;
  scene.state.score = snap.score;
  scene.state.level = snap.level;
  scene.state.trashCount = snap.trash;
  scene.state.timerSec = snap.timer || 0;

  // refresh UI
  updateScoreTexts.call(scene);
  renderKeep.call(scene);
  renderUpcoming.call(scene);
  spawnDraggableFromQueue.call(scene);
  refreshHints.call(scene);
}

// Adjacent-only merges possible (for proper game over)
function anyMergesPossible() {
  const scene = this;
  const S = scene.state.gridSize;
  const at = (r,c) => scene.slots[r][c].tile ? scene.slots[r][c].tile.value : null;

  for (let r=0; r<S; r++) {
    for (let c=0; c<S; c++) {
      const v = at(r,c);
      if (v == null) continue;
      const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
      for (const [nr,nc] of neighbors) {
        if (nr<0 || nc<0 || nr>=S || nc>=S) continue;
        const w = at(nr,nc);
        if (w == null) continue;
        const a = Math.max(v,w), b = Math.min(v,w);
        if (v === w || a % b === 0) return true;
      }
    }
  }
  return false;
}

function isGridFull() {
  const scene = this;
  for (let r=0;r<scene.slots.length;r++) for (let c=0;c<scene.slots[r].length;c++) if (!scene.slots[r][c].tile) return false;
  return true;
}

function refreshHints() {
  const scene = this;
  if (scene.hintMarkers) scene.hintMarkers.forEach(h=>h.destroy());
  scene.hintMarkers = [];
  if (!scene.state.hintsOn) return;
  const top = scene.state.queue[0];
  if (!top) return;

  const S = scene.state.gridSize;
  const possible = [];
  // adjacency-based hints using upcoming top value
  for (let r=0;r<S;r++) for (let c=0;c<S;c++) {
    const s = scene.slots[r][c];
    if (!s.tile) continue;
    const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr,nc] of neighbors) {
      if (nr<0||nc<0||nr>=S||nc>=S) continue;
      const neigh = scene.slots[nr][nc];
      if (!neigh.tile) continue;
      const w = neigh.tile.value;
      const a=Math.max(w, top.value), b=Math.min(w, top.value);
      if (w === top.value) { possible.push({r:nr,c:nc,reason:'equal'}); }
      else if (a % b === 0) { possible.push({r:nr,c:nc,reason:'div'}); }
    }
  }

  possible.slice(0,6).forEach(p => {
    const cell = scene.slots[p.r][p.c];
    const col = p.reason === 'equal' ? 0x00ff00 : 0x00aaff;
    const m = scene.add.circle(cell.x, cell.y, scene.state.slotSize/4, col, 0.34).setDepth(900);
    scene.hintMarkers.push(m);
  });
}

function afterMove() {
  updateScoreTexts.call(this);
  refreshHints.call(this);
  if (isGridFull.call(this) && !anyMergesPossible.call(this)) {
    const scene = this;
    scene.add.rectangle(GAME_WIDTH/2, GAME_HEIGHT/2, 700, 320, 0x000000, 0.72).setDepth(3000);
    scene.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 - 40, 'GAME OVER', { font: '48px Arial', color:'#fff' }).setOrigin(0.5).setDepth(3001);
    scene.add.text(GAME_WIDTH/2, GAME_HEIGHT/2 + 10, `Score: ${scene.state.score}`, { font: '24px Arial', color:'#fff' }).setOrigin(0.5).setDepth(3001);
    if (scene.currentDraggable) { destroyTileSprite.call(scene, scene.currentDraggable); scene.currentDraggable = null; }
    if (scene.state.score > scene.state.best) { scene.state.best = scene.state.score; localStorage.setItem('justdivide_best', String(scene.state.best)); }
  }
}

// expose helper functions
Phaser.Scene.prototype.renderUpcoming = renderUpcoming;
Phaser.Scene.prototype.spawnDraggableFromQueue = spawnDraggableFromQueue;

function update() {
  // sync number text with sprites
  if (this.tileGroup) {
    this.tileGroup.getChildren().forEach(sp => {
      if (sp && sp.valueText) { sp.valueText.x = sp.x; sp.valueText.y = sp.y; }
    });
  }
}
