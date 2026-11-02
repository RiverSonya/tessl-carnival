import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Flowers in the garden at the start of a round. */
export const FLOWER_COUNT = 14;
/** Extra flowers the garden grows for every rainbow caught. */
export const FLOWERS_PER_LEVEL = 3;
/** The garden never grows past this many flowers. */
export const MAX_FLOWER_COUNT = 32;
export const FLOWER_RADIUS = 14;
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 220;
export const RAINBOW_RADIUS = 30;
export const RAINBOW_TIME = 5;
/** A rainbow appears after a random number of picks, from the fewest to the most. */
export const FEWEST_FLOWERS_PER_RAINBOW = 3;
export const MOST_FLOWERS_PER_RAINBOW = 7;
export const FLOWER_POINTS = 10;
export const RAINBOW_POINTS = 50;
/** Keeps flowers and rainbows clear of the score line at the bottom. */
const MARGIN = 40;
const FIELD_BOTTOM = HEIGHT - 50;
/** How close to the player a new flower or rainbow may appear. */
const SPAWN_CLEARANCE = 80;
/** A run starts with this much room between the player and every flower. */
const SAFE_GAP = 4;

export type FlowerKind = 'tulip' | 'daisy' | 'bluebell' | 'sunflower';
export const FLOWER_KINDS: readonly FlowerKind[] = ['tulip', 'daisy', 'bluebell', 'sunflower'];

export interface Flower {
  x: number;
  y: number;
  kind: FlowerKind;
}

export interface Rainbow {
  x: number;
  y: number;
  /** Seconds left before it disappears. */
  timeLeft: number;
}

export interface RainbowGardenState {
  player: { x: number; y: number };
  flowers: Flower[];
  rainbow: Rainbow | null;
  /** Flowers picked since the last rainbow. */
  picked: number;
  /** Picks needed for the next rainbow, kept secret from the player. */
  rainbowAt: number;
  score: number;
  rainbowsCaught: number;
  phase: 'playing' | 'over';
  /** Why the round ended, for the game over screen. */
  endReason: 'time' | 'flower' | null;
}

/** Direction the player is walking, each part -1, 0 or 1. */
export interface Direction {
  x: number;
  y: number;
}

export type Random = () => number;

function randomSpot(random: Random) {
  return {
    x: MARGIN + random() * (WIDTH - 2 * MARGIN),
    y: MARGIN + random() * (FIELD_BOTTOM - 2 * MARGIN),
  };
}

function touching(a: { x: number; y: number }, b: { x: number; y: number }, distance: number) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= distance;
}

/** Finds a spot at least `clearance` from every point given. Gives up after a while. */
function openSpot(random: Random, avoid: { x: number; y: number }[], clearance: number) {
  let spot = randomSpot(random);
  for (let tries = 0; tries < 50; tries++) {
    if (avoid.every((p) => !touching(spot, p, clearance))) break;
    spot = randomSpot(random);
  }
  return spot;
}

function plantFlower(state: RainbowGardenState, random: Random): Flower {
  const avoid = [state.player, ...state.flowers, ...(state.rainbow ? [state.rainbow] : [])];
  const spot = openSpot(random, avoid, SPAWN_CLEARANCE);
  return { ...spot, kind: FLOWER_KINDS[Math.floor(random() * FLOWER_KINDS.length)] };
}

/** How many flowers the garden holds once `rainbowsCaught` rainbows are caught. */
export function flowerCount(rainbowsCaught: number): number {
  return Math.min(FLOWER_COUNT + rainbowsCaught * FLOWERS_PER_LEVEL, MAX_FLOWER_COUNT);
}

/** Picks a random number of flowers, from the fewest to the most, before the next rainbow. */
export function rollRainbowAt(random: Random = Math.random): number {
  const spread = MOST_FLOWERS_PER_RAINBOW - FEWEST_FLOWERS_PER_RAINBOW + 1;
  return FEWEST_FLOWERS_PER_RAINBOW + Math.min(Math.floor(random() * spread), spread - 1);
}

function refill(state: RainbowGardenState, random: Random) {
  const count = flowerCount(state.rainbowsCaught);
  while (state.flowers.length < count) state.flowers.push(plantFlower(state, random));
}

export function createState(random: Random = Math.random): RainbowGardenState {
  const state: RainbowGardenState = {
    player: { x: WIDTH / 2, y: FIELD_BOTTOM / 2 },
    flowers: [],
    rainbow: null,
    picked: 0,
    rainbowAt: rollRainbowAt(random),
    score: 0,
    rainbowsCaught: 0,
    phase: 'playing',
    endReason: null,
  };
  refill(state, random);
  return state;
}

export function touchesFlower(player: { x: number; y: number }, flower: Flower): boolean {
  return touching(player, flower, PLAYER_RADIUS + FLOWER_RADIUS);
}

/** Puts a rainbow somewhere away from the player and the flowers, and starts its clock. */
export function spawnRainbow(state: RainbowGardenState, random: Random = Math.random): void {
  const spot = openSpot(
    random,
    [state.player, ...state.flowers],
    Math.max(SPAWN_CLEARANCE, RAINBOW_RADIUS + FLOWER_RADIUS + PLAYER_RADIUS * 2),
  );
  state.rainbow = { ...spot, timeLeft: RAINBOW_TIME };
  // Flowers right next to the player would end the run before it starts.
  state.flowers = state.flowers.filter(
    (f) => !touching(state.player, f, PLAYER_RADIUS + FLOWER_RADIUS + SAFE_GAP),
  );
}

function endRound(state: RainbowGardenState, reason: 'time' | 'flower') {
  state.phase = 'over';
  state.endReason = reason;
}

/** Advances the game by `dt` seconds with the player walking in `direction`. */
export function step(
  state: RainbowGardenState,
  direction: Direction,
  dt: number,
  random: Random = Math.random,
): void {
  if (state.phase !== 'playing') return;

  const length = Math.hypot(direction.x, direction.y);
  if (length > 0) {
    state.player.x += (direction.x / length) * PLAYER_SPEED * dt;
    state.player.y += (direction.y / length) * PLAYER_SPEED * dt;
  }
  state.player.x = Math.min(Math.max(state.player.x, PLAYER_RADIUS), WIDTH - PLAYER_RADIUS);
  state.player.y = Math.min(Math.max(state.player.y, PLAYER_RADIUS), FIELD_BOTTOM - PLAYER_RADIUS);

  if (state.rainbow) {
    // Running for the rainbow: flowers are now things to avoid.
    if (state.flowers.some((f) => touchesFlower(state.player, f))) {
      endRound(state, 'flower');
      return;
    }
    if (touching(state.player, state.rainbow, PLAYER_RADIUS + RAINBOW_RADIUS)) {
      state.score += RAINBOW_POINTS;
      state.rainbowsCaught += 1;
      state.rainbow = null;
      // Each rainbow caught grows a fuller garden to pick through and dodge.
      refill(state, random);
      return;
    }
    state.rainbow.timeLeft = Math.max(state.rainbow.timeLeft - dt, 0);
    if (state.rainbow.timeLeft === 0) endRound(state, 'time');
    return;
  }

  const remaining: Flower[] = [];
  for (const flower of state.flowers) {
    if (touchesFlower(state.player, flower)) {
      state.score += FLOWER_POINTS;
      state.picked += 1;
    } else {
      remaining.push(flower);
    }
  }
  state.flowers = remaining;

  if (state.picked >= state.rainbowAt) {
    state.picked = 0;
    state.rainbowAt = rollRainbowAt(random);
    spawnRainbow(state, random);
  } else {
    refill(state, random);
  }
}

const KEYS: Record<string, keyof typeof DIRECTIONS> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

function drawFlower(ctx: CanvasRenderingContext2D, flower: Flower) {
  const { colors } = theme;
  const petals = {
    tulip: colors.stripeA,
    daisy: colors.stripeB,
    bluebell: colors.water,
    sunflower: colors.accent,
  }[flower.kind];
  const centre = flower.kind === 'sunflower' ? colors.wood : colors.accent;

  ctx.fillStyle = petals;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      flower.x + Math.cos(angle) * FLOWER_RADIUS * 0.55,
      flower.y + Math.sin(angle) * FLOWER_RADIUS * 0.55,
      FLOWER_RADIUS * 0.45,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = centre;
  ctx.beginPath();
  ctx.arc(flower.x, flower.y, FLOWER_RADIUS * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawRainbow(ctx: CanvasRenderingContext2D, rainbow: Rainbow) {
  const { colors } = theme;
  const bands = [colors.stripeA, colors.danger, colors.accent, colors.water, colors.muted];
  ctx.lineWidth = 5;
  bands.forEach((band, i) => {
    ctx.strokeStyle = band;
    ctx.beginPath();
    ctx.arc(rainbow.x, rainbow.y + RAINBOW_RADIUS / 2, RAINBOW_RADIUS - i * 5, Math.PI, 0);
    ctx.stroke();
  });

  // A ring that shrinks as the clock runs down.
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    rainbow.x,
    rainbow.y,
    RAINBOW_RADIUS + 8,
    -Math.PI / 2,
    -Math.PI / 2 + (rainbow.timeLeft / RAINBOW_TIME) * Math.PI * 2,
  );
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RainbowGardenState) {
  const { colors } = theme;

  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, FIELD_BOTTOM, WIDTH, HEIGHT - FIELD_BOTTOM);

  for (const flower of state.flowers) drawFlower(ctx, flower);
  if (state.rainbow) drawRainbow(ctx, state.rainbow);

  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(state.player.x - 5, state.player.y - 3, 2, 0, Math.PI * 2);
  ctx.arc(state.player.x + 5, state.player.y - 3, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'center';
  if (state.rainbow) {
    ctx.fillStyle = colors.accent;
    ctx.fillText(
      `Run to the rainbow! ${state.rainbow.timeLeft.toFixed(1)}s, avoid the flowers`,
      WIDTH / 2,
      HEIGHT - 20,
    );
  } else {
    ctx.fillText(`Flowers ${state.picked}`, WIDTH / 2, HEIGHT - 20);
  }
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'right';
  ctx.fillText(`Rainbows ${state.rainbowsCaught}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    const why = state.endReason === 'flower' ? 'You trod on a flower!' : 'The rainbow faded!';
    ctx.fillText(`${why} You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click or press Space to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const rainbowGarden: CarnivalGame = {
  id: 'rainbow-garden',
  name: 'Rainbow Garden',
  description:
    'Pick flowers until a rainbow pops up, then reach it in 5 seconds without touching a flower.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const held = new Set<keyof typeof DIRECTIONS>();

    const restart = () => {
      state = createState();
      scoreRecorded = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = KEYS[event.code];
      if (key) {
        held.add(key);
        event.preventDefault();
      } else if (event.code === 'Space' && state.phase === 'over') {
        restart();
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = KEYS[event.code];
      if (key) held.delete(key);
    };
    const onBlur = () => held.clear();
    const onDown = () => {
      if (state.phase === 'over') restart();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      const direction = { x: 0, y: 0 };
      for (const key of held) {
        direction.x += DIRECTIONS[key].x;
        direction.y += DIRECTIONS[key].y;
      }
      step(state, direction, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(rainbowGarden.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default rainbowGarden;
