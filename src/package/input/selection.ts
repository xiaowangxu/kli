import { Position } from '../util/position.js';
import { Rect } from '../util/rect.js';

/** Screen-cell selection whose endpoints use row-major terminal reading order. */
export class TextSelection {
    public readonly anchor: Position;
    public readonly focus: Position;

    constructor(anchor: Position, focus: Position = anchor) {
        this.anchor = Position.of(anchor.x, anchor.y);
        this.focus = Position.of(focus.x, focus.y);
    }

    public setFocus(x: number, y: number) {
        this.focus.x = Math.floor(x);
        this.focus.y = Math.floor(y);
    }

    public get start() {
        return this.before(this.anchor, this.focus) ? this.anchor : this.focus;
    }
    public get end() {
        return this.before(this.anchor, this.focus) ? this.focus : this.anchor;
    }
    public get isCollapsed() { return this.anchor.x === this.focus.x && this.anchor.y === this.focus.y; }
    public get is_collapsed() { return this.isCollapsed; }
    public get bounds() {
        const start = this.start;
        const end = this.end;
        return Rect.of(
            Math.min(start.x, end.x),
            start.y,
            Math.abs(end.x - start.x) + 1,
            end.y - start.y + 1,
        );
    }

    protected before(a: Position, b: Position) {
        return a.y < b.y || (a.y === b.y && a.x <= b.x);
    }

    public intersectsCell(x: number, y: number, width: number = 1) {
        if (this.isCollapsed) return false;
        const start = this.start;
        const end = this.end;
        if (y < start.y || y > end.y) return false;
        const left = y === start.y ? start.x : Number.NEGATIVE_INFINITY;
        const right = y === end.y ? end.x : Number.POSITIVE_INFINITY;
        return x + Math.max(1, width) - 1 >= left && x <= right;
    }
}
