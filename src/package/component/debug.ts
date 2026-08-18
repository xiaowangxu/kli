import { Layer } from './overlay.js';
import { Renderer } from '../render/renderer.js';
import { Color } from '../util/color.js';

export class DebugOverlay extends Layer {
    public show_event_path = true;
    public color = Color.of(255, 194, 92);
    constructor() {
        super();
        this.z_index = 3000;
        this.right = 1;
        this.bottom = 1;
        this.width = 52;
        this.height = 4;
        this.padding = 1;
        this.bg_color = Color.of(8, 11, 18, 220);
        this.pointer_events = false;
    }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        const scene = this.get_scene();
        render.draw_string(rect.x, rect.y, `frame ${render.frame_count}  ${render.last_frame_time.toFixed(2)}ms  ${render.last_frame_bytes}B  dirty ${render.last_dirty_cells}`, { color: this.color, bold: true });
        if (this.show_event_path && scene) {
            const path = scene.last_event_path.map((node) => node.role ?? node.constructor.name).join(' ← ');
            render.draw_string(rect.x, rect.y + 1, `${scene.last_event_type || 'idle'}  ${path}`, { color: Color.of(132, 148, 174) });
        }
    }
}
