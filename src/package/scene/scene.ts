import { LayoutContainer, LayoutLeaf, LayoutNode } from "../layout/layout.js";
import { Node } from "../node/node.js";
import { Renderer } from "../render/renderer.js";
import { Position } from "../util/position.js";
import { Signal } from "../util/signal.js";

export class Scene extends LayoutContainer {

    children: (Node & (LayoutLeaf | LayoutNode))[] = [];

    public readonly on_changed: Signal<() => void> = new Signal();

    protected readonly screen_size: Position = Position.of(0, 0);

    public calculate_layout(width: number, height: number) {
        this.screen_size.x = width;
        this.screen_size.y = height;
        this.layout_node.calculateLayout(width, height);
    }

    public get_screen_size() {
        return Position.of(this.screen_size.x, this.screen_size.y);
    }

    public get_unstyled_text_content(): string {
        throw new Error("Method not implemented.");
    }

    public get_scene(): Scene {
        return this;
    }

    public draw(render: Renderer): void {
        for (const child of this.children) {
            child.draw(render, true);
        }
    }

    public notify_change() {
        this.on_changed.trigger();
    }

    public dispose(recusive: boolean) {
        super.dispose(recusive);
    }

}