import { WriteStream } from "node:tty";
import { Renderer, RenderReady } from "./renderer.js";

export class TTyRenderer implements Renderer {

    private readonly stream: WriteStream;

    get width(): number {
        return this.stream.columns;
    }
    get height(): number {
        return this.stream.rows;
    }
    on_resize(fn: (width: number, height: number) => void): number {
        throw new Error("Method not implemented.");
    }
    cancel_resize(fn: number): void {
        throw new Error("Method not implemented.");
    }

    constructor(stream: WriteStream) {
        this.stream = stream;
    }

    begin_render(): void | RenderReady {
        return this.write('\x1B[?25l');
    }
    end_render(): void | RenderReady {
        return this.write('\x1B[?25h');
    }
    clear(): void | RenderReady {
        return new Promise<void>((resolve, reject) => {
            if (this.stream.cursorTo(0, 0, resolve)) {
                resolve();
            }
        }).then(() => {
            return new Promise<void>((resolve, reject) => {
                if (this.stream.clearScreenDown(resolve)) {
                    resolve();
                }
            })
        });
    }
    move_to(x: number, y: number): void | RenderReady {
        throw new Error("Method not implemented.");
    }
    clear_rect(x: number, y: number, width: number, height: number): void | RenderReady {
        throw new Error("Method not implemented.");
    }
    write(text: Uint8Array): void | RenderReady;
    write(text: string, encoding?: BufferEncoding): void | RenderReady;
    write(text: string | Uint8Array, encoding?: BufferEncoding): void | RenderReady {
        return new Promise<void>((resolve, reject) => {
            if (this.stream.write(text, encoding, resolve as any)) {
                resolve();
            }
        })
    }

}