export class Position {

    private _x: number = 0;
    private _y: number = 0;

    get x() { return this._x; }
    set x(v: number) {
        this._x = Math.floor(v);
    }
    get y() { return this._y; }
    set y(v: number) {
        this._y = Math.floor(v);
    }

}