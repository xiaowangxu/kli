import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";
import { Signal } from "../util/signal.js";

export abstract class Node {

    parent: NodeWithChild<Node> | undefined;
    protected _focusable: boolean = false;

    protected readonly on_focused_event: Signal<() => void> = new Signal();
    protected readonly on_blured_event: Signal<() => void> = new Signal();

    public get focusable() {
        return this._focusable;
    }
    public set focusable(v: boolean) {
        if (this._focusable !== v) {
            this._focusable = v;
            if (!this._focusable) {
                this.get_scene()?.blur_node(this);
            }
        }
    }

    abstract draw(render: Renderer, force?: boolean): void;

    abstract dispose(recusive: boolean): void;

    get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public get_children(): Node[] | undefined {
        return undefined;
    }

    abstract traverse_on_enter_scene(scene: Scene): void;
    abstract traverse_on_exit_scene(scene: Scene): void;
    on_enter_scene(scene: Scene): void { }
    on_exit_scene(scene: Scene): void {
        scene.blur_node(this);
    }

    public focus(): void {
        this.get_scene()?.focus_node?.(this);
    }
    public blur(): void { 
        this.get_scene()?.blur_node?.(this);
    }

    public on_focused(fn: () => void) {
        this.on_focused_event.connect(fn);
    }
    public off_focused(fn: () => void) {
        this.on_focused_event.disconnect(fn);
    }
    public on_blured(fn: () => void) {
        this.on_blured_event.connect(fn);
    }
    public off_blured(fn: () => void) {
        this.on_blured_event.disconnect(fn);
    }

    trigger_focused(): void {
        this.on_focused_event.trigger();
    }
    trigger_blured(): void {
        this.on_blured_event.trigger();
    }

}

export interface NodeWithChild<Child extends Node> extends Node {
    remove_child(node: Child, will_exit_scene?: boolean): Child | undefined;
    get_next_sibling(node: Child): Child | undefined;
}

export abstract class NodeWithChildren<Children extends Node = Node> extends Node implements NodeWithChild<Children> {

    public readonly children: Children[] = [];

    get_children(): Children[] {
        return this.children;
    }

    public get_child_index(node: Children) {
        return this.children.indexOf(node);
    }

    public get_child(index: number) {
        return this.children[index];
    }

    public get_next_sibling(node: Children): Children | undefined {
        const index = this.get_child_index(node);
        if (index < 0) return undefined;
        return this.children[index + 1];
    }

    public add_child(node: Children): void {
        if (node as any === this) return;
        if (node.parent === this) return;
        const will_enter_scene = node.parent === undefined;
        if (node.parent !== undefined) node.parent.remove_child(node, false);
        node.parent = this;
        this.children.push(node);
        this.on_child_addeded(node);
        if (will_enter_scene) {
            const scene = this.get_scene();
            if (scene !== undefined) {
                this.traverse_on_enter_scene(scene);
            }
        }
    }

    protected abstract on_child_addeded(node: Children): void;

    public get_children_count() {
        return this.children.length;
    }

    public remove_child(node: Children, will_exit_scene: boolean = true): Children | undefined {
        if (node.parent !== undefined) return undefined;
        const index = this.children.indexOf(node);
        if (index < 0) return undefined;
        node.parent = undefined;
        this.children.splice(index, 1);
        this.on_child_removed(node);
        if (will_exit_scene) {
            const scene = this.get_scene();
            if (scene !== undefined) {
                node.traverse_on_enter_scene(scene);
            }
        }
        return node;
    }

    protected abstract on_child_removed(node: Children): void;

    public move_child(node: Children, to: number | Children): boolean {
        if (node.parent !== this) return false;
        const index = this.children.indexOf(node);
        if (index < 0) return false;
        if (typeof to === 'number') {
            if (to < 0) return false;
            this.children.splice(index, 1);
            this.children.splice(to, 0, node);
            this.on_child_moved(node, index, to);
            return true;
        }
        else {
            const toIndex = this.children.indexOf(to);
            if (toIndex < 0) return false;
            this.children.splice(index, 1);
            // 如果 node 原本在 to 前面,删除后 to 的索引会减1
            const newIndex = index < toIndex ? toIndex - 1 : toIndex;
            this.children.splice(newIndex, 0, node);
            this.on_child_moved(node, index, newIndex);
            return true;
        }
    }

    protected abstract on_child_moved(node: Children, from: number, to: number): void;

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    traverse_on_enter_scene(scene: Scene): void {
        this.on_enter_scene(scene);
        for (const child of this.children) {
            child.traverse_on_enter_scene(scene);
        }
    }

    traverse_on_exit_scene(scene: Scene): void {
        for (const child of this.children) {
            child.traverse_on_exit_scene(scene);
        }
        this.on_exit_scene(scene);
    }

    public abstract draw(render: Renderer): void;

    public abstract dispose(recusive: boolean): void;

}