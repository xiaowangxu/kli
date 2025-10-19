export class Rect {

    protected _x: number = 0;
    protected _y: number = 0;
    protected _width: number = 0;
    protected _height: number = 0;

    get x() { return this._x; }
    set x(v: number) {
        this._x = Math.floor(v);
    }
    get y() { return this._y; }
    set y(v: number) {
        this._y = Math.floor(v);
    }
    get width() { return this._width; }
    set width(v: number) {
        this._width = Math.max(0, Math.floor(v));
    }
    get height() { return this._height; }
    set height(v: number) {
        this._height = Math.max(0, Math.floor(v));
    }

    public copy(rect: Rect) {
        this._x = rect._x;
        this._y = rect._y;
        this._width = rect._width;
        this._height = rect._height;
        return this;
    }

    public intersect(rect: Rect): Rect | undefined {
        const a_left = this._x;
        const a_right = this._x + this._width;
        const a_top = this._y;
        const a_bottom = this._y + this._height;

        const b_left = rect._x;
        const b_right = rect._x + rect._width;
        const b_top = rect._y;
        const b_bottom = rect._y + rect._height;

        const left = Math.max(a_left, b_left);
        const right = Math.min(a_right, b_right);
        const top = Math.max(a_top, b_top);
        const bottom = Math.min(a_bottom, b_bottom);

        if (right <= left || bottom <= top) {
            return undefined;
        }
        return Rect.of(left, top, right - left, bottom - top);
    }

    static of(x: number, y: number, width: number, height: number) {
        const rect = new Rect();
        rect.x = x;
        rect.y = y;
        rect.width = width;
        rect.height = height;
        return rect;
    }

}