export type RenderReady = Promise<void>;

export interface Renderer {
    get width(): number;
    get height(): number;
    on_resize(fn: (width: number, height: number) => void): number;
    cancel_resize(fn: number): void;
    begin_render(): void | RenderReady;
    end_render(): void | RenderReady;
    clear(): void | RenderReady;
    move_to(x: number, y: number): void | RenderReady;
    clear_rect(x: number, y: number, width: number, height: number): void | RenderReady;
    write(text: Uint8Array): void | RenderReady;
    write(text: string, encoding?: BufferEncoding): void | RenderReady;
}