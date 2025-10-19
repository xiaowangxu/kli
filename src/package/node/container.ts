import Yoga, { MeasureMode as YogaMeasureMode, Node as YogaNode } from "yoga-layout";
import { LayoutContainer, LayoutLeaf } from "../layout/layout.js";
import { Node, NodeWithChild, NodeWithChildren } from "./node.js";
import { Text } from "./text.js";
import DefaultLayoutConfig from "../layout/config.js";

export class Container extends LayoutContainer<Container | TextContainer> {

    public readonly children: (Container | TextContainer)[] = [];

    public get_unstyled_text_content(): string {
        return this.children.map(c => c.get_unstyled_text_content()).join('\n');
    }

    protected on_child_addeded(node: Container | TextContainer): void {
        this.layout_node.insertChild(node.layout_node, this.layout_node.getChildCount());
    }
    protected on_child_removed(node: Container | TextContainer): void {
        this.layout_node.removeChild(node.layout_node);
    }
    protected on_child_moved(node: Container | TextContainer, from: number, to: number): void {
        this.layout_node.removeChild(node.layout_node);
        this.layout_node.insertChild(node.layout_node, to);
    }

    public dispose(recusive: boolean): void {
        super.dispose(recusive);
    }

}

export class TextContainer implements NodeWithChild<Text>, LayoutLeaf {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);

    parent: NodeWithChild<Node> | undefined;
    public text: Text | undefined;

    constructor() {
        this.layout_node.setMeasureFunc((width: number, width_mode: YogaMeasureMode, height: number, height_mode: YogaMeasureMode) => {
            
            const context = this.get_unstyled_text_content();

            let measured_width = 0;
            let measured_height = 0;

            // 根据宽度模式处理
            if (width_mode === Yoga.MEASURE_MODE_EXACTLY) {
                // 精确宽度：按此宽度换行
                measured_width = width;
                measured_height = 2;
            }
            else if (width_mode === Yoga.MEASURE_MODE_AT_MOST) {
                // 最大宽度：在此范围内自适应
                measured_width = 2;
                measured_height = 2;
            }
            else {
                // 无约束：单行显示
                measured_width = context.length;
                measured_height = 1;
            }

            // 根据高度模式处理
            if (height_mode === Yoga.MEASURE_MODE_EXACTLY) {
                measured_height = height;
            }
            else if (height_mode === Yoga.MEASURE_MODE_AT_MOST) {
                measured_height = Math.min(measured_height, height);
            }

            return {
                width: measured_width,
                height: measured_height
            };
        });
    }

    get_unstyled_text_content(): string {
        return this.text?.get_unstyled_text_content?.() ?? '';
    }

    public notifiy_text_change() {
        this.layout_node.markDirty();
    }

    public set_text(text: Text) {
        if (text.parent !== undefined) {
            if (text.parent === this) return;
            text.parent.remove_child(text);
        }
        text.parent = this;
        this.text = text;
    }

    public clear_text(): boolean {
        if (this.text === undefined) return false;
        return this.remove_child(this.text);
    }

    public remove_child(node: Text): boolean {
        if (node.parent === this && this.text === node) {
            this.text = undefined;
            node.parent = undefined;
            return true;
        }
        return false;
    }

    public dispose(recusive: boolean): void {
        if (recusive) {
            this.text?.dispose(true);
        }
        this.layout_node.unsetMeasureFunc();
        this.layout_node.free();
    }

}