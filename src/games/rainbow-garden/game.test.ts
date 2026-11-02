import { describe, expect, it } from 'vitest';
import {
  FEWEST_FLOWERS_PER_RAINBOW,
  FLOWERS_PER_LEVEL,
  FLOWER_COUNT,
  MAX_FLOWER_COUNT,
  MOST_FLOWERS_PER_RAINBOW,
  FLOWER_POINTS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  RAINBOW_POINTS,
  RAINBOW_TIME,
  createState,
  flowerCount,
  rollRainbowAt,
  spawnRainbow,
  step,
  touchesFlower,
  type Flower,
} from './game';

const still = { x: 0, y: 0 };

/** A flower right under the player. */
const underfoot = (state: ReturnType<typeof createState>): Flower => ({
  x: state.player.x,
  y: state.player.y,
  kind: 'daisy',
});

describe('rainbow garden', () => {
  it('starts with a full garden, no rainbow and no score', () => {
    const state = createState();
    expect(state.flowers).toHaveLength(FLOWER_COUNT);
    expect(state.flowers.some((f) => touchesFlower(state.player, f))).toBe(false);
    expect(state.rainbow).toBeNull();
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('walks the player at a steady speed, even diagonally', () => {
    const state = createState();
    state.flowers = [];
    const start = { ...state.player };
    step(state, { x: 1, y: 1 }, 0.1);
    const moved = Math.hypot(state.player.x - start.x, state.player.y - start.y);
    expect(moved).toBeCloseTo(PLAYER_SPEED * 0.1);
  });

  it('keeps the player inside the garden', () => {
    const state = createState();
    state.flowers = [];
    step(state, { x: -1, y: -1 }, 10);
    expect(state.player.x).toBe(PLAYER_RADIUS);
    expect(state.player.y).toBe(PLAYER_RADIUS);
  });

  it('picks a flower the player walks into and plants a new one', () => {
    const state = createState();
    state.flowers = [underfoot(state)];
    step(state, still, 0);
    expect(state.score).toBe(FLOWER_POINTS);
    expect(state.picked).toBe(1);
    expect(state.flowers).toHaveLength(FLOWER_COUNT);
    expect(state.flowers.some((f) => touchesFlower(state.player, f))).toBe(false);
  });

  it('makes a rainbow appear once the secret number of flowers is picked', () => {
    const state = createState();
    state.rainbowAt = 4;
    state.picked = 3;
    state.flowers = [underfoot(state)];
    step(state, still, 0);
    expect(state.picked).toBe(0);
    expect(state.rainbow).not.toBeNull();
    expect(state.rainbow!.timeLeft).toBe(RAINBOW_TIME);
  });

  it('holds the rainbow back until enough flowers are picked', () => {
    const state = createState();
    state.rainbowAt = 6;
    state.picked = 4;
    state.flowers = [underfoot(state)];
    step(state, still, 0);
    expect(state.picked).toBe(5);
    expect(state.rainbow).toBeNull();
  });

  it('rolls a new number of flowers for each rainbow', () => {
    const state = createState();
    state.rainbowAt = 1;
    state.flowers = [underfoot(state)];
    step(state, still, 0, () => 0.999);
    expect(state.rainbowAt).toBe(MOST_FLOWERS_PER_RAINBOW);
  });

  it('picks the number of flowers per rainbow at random, within range', () => {
    expect(rollRainbowAt(() => 0)).toBe(FEWEST_FLOWERS_PER_RAINBOW);
    expect(rollRainbowAt(() => 0.999)).toBe(MOST_FLOWERS_PER_RAINBOW);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rollRainbowAt());
    expect(Math.min(...seen)).toBe(FEWEST_FLOWERS_PER_RAINBOW);
    expect(Math.max(...seen)).toBe(MOST_FLOWERS_PER_RAINBOW);
    expect(seen.size).toBe(MOST_FLOWERS_PER_RAINBOW - FEWEST_FLOWERS_PER_RAINBOW + 1);
  });

  it('grows more flowers for every rainbow caught, up to a limit', () => {
    expect(flowerCount(0)).toBe(FLOWER_COUNT);
    expect(flowerCount(2)).toBe(FLOWER_COUNT + 2 * FLOWERS_PER_LEVEL);
    expect(flowerCount(100)).toBe(MAX_FLOWER_COUNT);
  });

  it('keeps the bigger garden full while picking', () => {
    const state = createState();
    state.rainbowsCaught = 2;
    state.flowers = [underfoot(state)];
    step(state, still, 0);
    expect(state.flowers).toHaveLength(flowerCount(2));
  });

  it('puts the rainbow somewhere new, away from the player', () => {
    const state = createState();
    spawnRainbow(state);
    const { rainbow, player } = state;
    expect(Math.hypot(rainbow!.x - player.x, rainbow!.y - player.y)).toBeGreaterThan(50);
  });

  it('scores a rainbow the player reaches in time and grows a fuller garden', () => {
    const state = createState();
    state.flowers = [];
    state.rainbow = { x: state.player.x + 10, y: state.player.y, timeLeft: 1 };
    step(state, still, 0.1);
    expect(state.score).toBe(RAINBOW_POINTS);
    expect(state.rainbowsCaught).toBe(1);
    expect(state.rainbow).toBeNull();
    expect(state.flowers).toHaveLength(FLOWER_COUNT + FLOWERS_PER_LEVEL);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the rainbow fades before the player reaches it', () => {
    const state = createState();
    state.flowers = [];
    state.player = { x: 100, y: 100 };
    state.rainbow = { x: 600, y: 300, timeLeft: RAINBOW_TIME };
    for (let i = 0; i < 101; i++) step(state, still, 0.05);
    expect(state.phase).toBe('over');
    expect(state.endReason).toBe('time');
  });

  it('ends the round when the player touches a flower while running for the rainbow', () => {
    const state = createState();
    state.rainbow = { x: 700, y: 50, timeLeft: RAINBOW_TIME };
    state.flowers = [underfoot(state)];
    step(state, still, 0);
    expect(state.phase).toBe('over');
    expect(state.endReason).toBe('flower');
    expect(state.score).toBe(0);
  });

  it('stops changing once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    const before = { ...state.player };
    step(state, { x: 1, y: 0 }, 1);
    expect(state.player).toEqual(before);
  });
});
