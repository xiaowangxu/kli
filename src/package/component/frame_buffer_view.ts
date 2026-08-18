import { Container } from '../node/container.js';
import { FrameBuffer } from '../render/buffer.js';
import { Renderer } from '../render/renderer.js';

/** Displays a FrameBuffer inside the regular Yoga scene graph. */
export class FrameBufferView extends Container {
    protected _source: FrameBuffer | undefined;
    public source_x = 0;
    public source_y = 0;

    public get source() { return this._source; }
    public set source(value: FrameBuffer | undefined) {
        if (value === this._source) return;
        this._source = value;
        this.get_scene()?.notify_change();
    }

    public draw(render: Renderer, force: boolean = false): void {
        super.draw(render, force);
        if (this.source === undefined) return;
        const content = this.get_content_rect();
        render.push_mask(content);
        render.push_opacity(this.opacity);
        render.draw_frame_buffer(
            content.x,
            content.y,
            this.source,
            this.source_x,
            this.source_y,
            Math.min(content.width, this.source.width - this.source_x),
            Math.min(content.height, this.source.height - this.source_y),
        );
        render.pop_opacity();
        render.pop_mask();
    }
}
