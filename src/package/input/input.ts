import { ReadStream } from "node:tty";
import { log } from "../util/logger.js";
import { Signal } from "../util/signal.js";
import { InputEvent } from "./event.js";

export class Input {

    public readonly stream: ReadStream;
    public readonly on_input = new Signal<(event: InputEvent) => void>();

    constructor(stream: ReadStream) {
        this.stream = stream;
        this.stream.on('data', this._handle_input);
    }

    init() {
        this.stream.setRawMode(true);
        this.stream.resume();
        this.stream.setEncoding('utf8');
    }

    dispose() {
        this.stream.setRawMode(false);
        this.stream.off('data', this._handle_input);
        this.on_input.clear();
    }

    private _handle_input = (data: Buffer<ArrayBufferLike>) => this.handle_input(data);
    protected handle_input(data: Buffer<ArrayBufferLike>) {
        const sequence = data.toString('utf8');
        if (sequence === '\u0003') {
            process.exit(0);
        }
        const visual = sequence.replaceAll('\x1b', '\\x1b');
        log(visual);
    }

}