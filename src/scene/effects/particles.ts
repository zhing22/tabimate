/**
 * A fixed pool of particles, positioned relative to their target so they
 * travel with a walking follower. Spawning past capacity reuses the oldest
 * slot; nothing is allocated after creation, so the frame loop stays clean.
 */
export interface Particles {
  spawn(x: number, y: number, vx: number, vy: number, lifeS: number, colour: number): void;
  update(dtS: number): void;
  /** Calls `draw` for each live particle; alpha fades out over its life. */
  forEach(draw: (x: number, y: number, alpha: number, colour: number) => void): void;
  readonly alive: number;
}

export function createParticles(capacity: number, gravity: number): Particles {
  const x = new Float32Array(capacity);
  const y = new Float32Array(capacity);
  const vx = new Float32Array(capacity);
  const vy = new Float32Array(capacity);
  const age = new Float32Array(capacity);
  const life = new Float32Array(capacity); // 0 = free slot
  const colour = new Uint8Array(capacity);
  let next = 0;
  let alive = 0;

  return {
    spawn(px, py, pvx, pvy, lifeS, c) {
      const i = next;
      next = (next + 1) % capacity;
      if (life[i] === 0) alive++;
      x[i] = px;
      y[i] = py;
      vx[i] = pvx;
      vy[i] = pvy;
      age[i] = 0;
      life[i] = lifeS;
      colour[i] = c;
    },
    update(dtS) {
      for (let i = 0; i < capacity; i++) {
        if (life[i] === 0) continue;
        age[i]! += dtS;
        if (age[i]! >= life[i]!) {
          life[i] = 0;
          alive--;
          continue;
        }
        vy[i]! += gravity * dtS;
        x[i]! += vx[i]! * dtS;
        y[i]! += vy[i]! * dtS;
      }
    },
    forEach(draw) {
      for (let i = 0; i < capacity; i++) {
        if (life[i] !== 0) draw(x[i]!, y[i]!, 1 - age[i]! / life[i]!, colour[i]!);
      }
    },
    get alive() {
      return alive;
    },
  };
}

/**
 * A small star that grows and shrinks (or, with reduced motion, fades in and
 * out) every so often: the idle "something rare is here" twinkle.
 */
export interface Twinkle {
  /** Starts one now at (x, y) relative to the target. */
  start(x: number, y: number): void;
  update(dtS: number): void;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  /** 0 -> 1 -> 0 over the twinkle. */
  readonly strength: number;
}

export function createTwinkle(durationS: number): Twinkle {
  let t = durationS;
  let px = 0;
  let py = 0;
  return {
    start(x, y) {
      t = 0;
      px = x;
      py = y;
    },
    update(dtS) {
      t = Math.min(durationS, t + dtS);
    },
    get active() {
      return t < durationS;
    },
    get x() {
      return px;
    },
    get y() {
      return py;
    },
    get strength() {
      return t < durationS ? Math.sin((Math.PI * t) / durationS) : 0;
    },
  };
}
