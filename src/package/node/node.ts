import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";

export interface Node {
    parent: NodeWithChild<Node> | undefined;
    get_unstyled_text_content(): string;
    draw(render: Renderer, force?: boolean): void;
    dispose(recusive: boolean): void;
    get_scene(): Scene | undefined;
}

export interface NodeWithChild<Child extends Node> extends Node {
    remove_child(node: Child): boolean;
}

export abstract class NodeWithChildren<Children extends Node> implements NodeWithChild<Children> {

    public parent: NodeWithChild<Node> | undefined;
    abstract readonly children: Children[];

    public abstract get_unstyled_text_content(): string;

    public add_child(node: Children): void {
        if (node.parent !== undefined) node.parent.remove_child(node);
        node.parent = this;
        this.children.push(node);
        this.on_child_addeded(node);
    }

    protected abstract on_child_addeded(node: Children): void;

    public remove_child(node: Children): boolean {
        if (node.parent !== undefined) return false;
        const index = this.children.indexOf(node);
        if (index < 0) return false;
        node.parent = undefined;
        this.children.splice(index, 1);
        this.on_child_removed(node);
        return true;
    }

    protected abstract on_child_removed(node: Children): void;

    public move_child(node: Children, to: number): boolean {
        if (node.parent !== this) return false;
        if (to < 0) return false;
        const index = this.children.indexOf(node);
        if (index < 0) return false;
        this.children.splice(index, 1);
        this.children.splice(to, 0, node);
        this.on_child_moved(node, index, to);
        return true;
    }

    protected abstract on_child_moved(node: Children, from: number, to: number): void;

    public get_scene(): Scene | undefined {
        return this.parent?.get_scene();
    }

    public abstract draw(render: Renderer): void;

    public abstract dispose(recusive: boolean): void;

}