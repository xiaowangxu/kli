export class Position {

    protected _x: number = 0;
    protected _y: number = 0;

    get x() { return this._x; }
    set x(v: number) {
        this._x = Math.floor(v);
    }
    get y() { return this._y; }
    set y(v: number) {
        this._y = Math.floor(v);
    }

    public copy(pos: Position) {
        this._x = pos._x;
        this._y = pos._y;
        return this;
    }

    static of(x: number, y: number) {
        const position = new Position();
        position.x = x;
        position.y = y;
        return position;
    }

}