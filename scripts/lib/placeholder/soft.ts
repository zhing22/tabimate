// No legs or fins: snakes winding along, jellyfish pulsing, octopuses
// curling their arms, snails gliding on a foot.
import { PLACEHOLDER_ART } from '../../../src/config/placeholderArt.ts';
import { ellipse, line, rect, set, swing, type Grid, type Pose } from './grid.ts';

export interface SerpentSpec {
  readonly plan: 'serpent';
  readonly thick?: number;
}

export interface BlobSpec {
  readonly plan: 'blob';
  readonly kind: 'jelly' | 'octopus' | 'snail';
}

const WAVE = { from: 2, to: 16, amplitude: 1.5, length: 2.5 };

export function drawSerpent(g: Grid, pose: Pose, spec: SerpentSpec): void {
  const ground = PLACEHOLDER_ART.groundY;
  const thick = spec.thick ?? 2;
  const yAt = (x: number) =>
    ground - thick - 1 - Math.round(WAVE.amplitude * Math.sin((x + pose.phase * 2) / WAVE.length));
  for (let x = WAVE.from; x <= WAVE.to; x++) rect(g, x, yAt(x), x, yAt(x) + thick - 1, 'b');
  const hy = ground - thick - 2;
  rect(g, WAVE.to, hy, WAVE.to, yAt(WAVE.to), 'b');
  ellipse(g, WAVE.to + 2, hy, 2, 1.5, 'b');
  if (pose.phase % 2 === 0) set(g, WAVE.to + 4, hy + 1, 'a');
  set(g, WAVE.to + 2, hy - 1, 'e');
}

export function drawBlob(g: Grid, pose: Pose, spec: BlobSpec): void {
  if (spec.kind === 'jelly') jelly(g, pose.phase);
  else if (spec.kind === 'octopus') octopus(g, pose.phase);
  else snail(g, pose.phase);
}

function jelly(g: Grid, phase: number): void {
  const squeeze = phase % 2;
  ellipse(g, 11, 9, 5 - squeeze, 3.5 + squeeze, 'b');
  rect(g, 5, 10 + squeeze, 17, 13, '.');
  for (let i = 0; i < 5; i++) {
    const x = 7 + 2 * i;
    line(g, x, 10 + squeeze, x + swing(phase + i), 17, 'a');
  }
  set(g, 13, 8, 'e');
}

function octopus(g: Grid, phase: number): void {
  const ground = PLACEHOLDER_ART.groundY;
  for (let i = 0; i < 4; i++) {
    const x = 7 + 3 * i;
    const curl = swing(phase + i);
    line(g, x + 1, 14, x + curl, ground - 1, 'b');
    set(g, x + curl + (i < 2 ? -1 : 1), ground, 'b');
  }
  ellipse(g, 11, 10, 4, 4.5, 'b');
  set(g, 13, 11, 'e');
}

function snail(g: Grid, phase: number): void {
  const ground = PLACEHOLDER_ART.groundY;
  const stretch = phase % 2;
  rect(g, 5, ground - 1, 17 + stretch, ground, 'b');
  line(g, 16 + stretch, ground - 1, 18 + stretch, ground - 5, 'b');
  ellipse(g, 10, ground - 5, 4, 4, 'a');
  rect(g, 10, ground - 6, 11, ground - 5, 'b');
  set(g, 18 + stretch, ground - 6, 'e');
}
