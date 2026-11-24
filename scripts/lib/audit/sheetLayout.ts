// Where each screenshot goes on a contact sheet: upright windows on one row,
// wide ones on the next, every tile scaled to the row height, a label above.

export interface Shot {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

export interface SheetOptions {
  readonly rowHeight: number;
  readonly gap: number;
  readonly labelHeight: number;
}

export interface Placed {
  readonly index: number;
  readonly left: number;
  /** The label strip's top; the picture sits labelHeight below it. */
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function sheetLayout(shots: readonly Shot[], o: SheetOptions) {
  const rows = [
    shots.flatMap((s, i) => (s.height >= s.width ? [i] : [])),
    shots.flatMap((s, i) => (s.height < s.width ? [i] : [])),
  ].filter((row) => row.length > 0);
  const placed: Placed[] = [];
  let width = 0;
  rows.forEach((row, r) => {
    const top = o.gap + r * (o.rowHeight + o.labelHeight + o.gap);
    let left = o.gap;
    for (const index of row) {
      const shot = shots[index];
      if (!shot) continue;
      const w = Math.round((shot.width / shot.height) * o.rowHeight);
      placed.push({ index, left, top, width: w, height: o.rowHeight });
      left += w + o.gap;
    }
    width = Math.max(width, left);
  });
  const height = o.gap + rows.length * (o.rowHeight + o.labelHeight + o.gap);
  return { width, height, placed };
}
