import { Renderer } from "../render/renderer.js";
import { Scene } from "../scene/scene.js";

export interface Node {
    parent: NodeWithChild<Node> | undefined;
    draw(render: Renderer, force?: boolean): void;
    dispose(recusive: boolean): void;
    get_scene(): Scene | undefined;
}

export interface NodeWithChild<Child extends Node> extends Node {
    remove_child(node: Child): Child | undefined;
    get_next_sibling(node: Child): Child | undefined;
}

export abstract class NodeWithChildren<Children extends Node = Node> implements NodeWithChild<Children> {

    public parent: NodeWithChild<Node> | undefined;
    abstract readonly children: Children[];

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
        if (node.parent !== undefined) node.parent.remove_child(node);
        node.parent = this;
        this.children.push(node);
        this.on_child_addeded(node);
    }

    protected abstract on_child_addeded(node: Children): void;

    public get_children_count() {
        return this.children.length;
    }

    public remove_child(node: Children): Children | undefined {
        if (node.parent !== undefined) return undefined;
        const index = this.children.indexOf(node);
        if (index < 0) return undefined;
        node.parent = undefined;
        this.children.splice(index, 1);
        this.on_child_removed(node);
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

    public abstract draw(render: Renderer): void;

    public abstract dispose(recusive: boolean): void;

}