import { Position } from "./position.js";

export class Rect extends Position {

    private _width: number = 0;
    private _height: number = 0;

    get width() { return this._width; }
    set width(v: number) {
        this._width = Math.floor(v);
    }
    get height() { return this._height; }
    set height(v: number) {
        this._height = Math.floor(v);
    }

}