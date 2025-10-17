import Yoga, { YogaNode, YogaAlign, YogaDisplay } from "yoga-layout-prebuilt";
import { Node, NodeWithChildren } from "../node/node.js";
import DefaultLayoutConfig from "./config.js";

export interface LayoutLeaf {
    readonly layout_node: YogaNode;
}

export interface LayoutNode extends LayoutLeaf {
    get align_content(): YogaAlign;
    get align_items(): YogaAlign;
    get aspect_ratio(): number;
    get display(): YogaDisplay;
}

export abstract class LayoutContainer<Children extends Node & (LayoutLeaf | LayoutNode)> extends NodeWithChildren<Children> implements LayoutNode {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);

    get align_content() { return this.layout_node.getAlignContent(); }
    get align_items() { return this.layout_node.getAlignItems(); }
    get justify_content() { return this.layout_node.getJustifyContent(); }
    get aspect_ratio() { return this.layout_node.getAspectRatio(); }
    get display() { return this.layout_node.getDisplay(); }
    get flex_direction() { return this.layout_node.getFlexDirection(); }
    get flex_basis() { return this.layout_node.getFlexBasis(); }
    get flex_grow() { return this.layout_node.getFlexGrow(); }
    get flex_shrink() { return this.layout_node.getFlexShrink(); }
    get flex_wrap() { return this.layout_node.getFlexWrap(); }
    get top() { return this.layout_node.getPosition(Yoga.EDGE_TOP); }
    get left() { return this.layout_node.getPosition(Yoga.EDGE_LEFT); }
    get bottom() { return this.layout_node.getPosition(Yoga.EDGE_BOTTOM); }
    get right() { return this.layout_node.getPosition(Yoga.EDGE_RIGHT); }
    get width() { return this.layout_node.getWidth(); }
    get min_width() { return this.layout_node.getMinWidth(); }
    get max_width() { return this.layout_node.getMaxWidth(); }
    get height() { return this.layout_node.getHeight(); }
    get min_height() { return this.layout_node.getMinHeight(); }
    get max_height() { return this.layout_node.getMaxHeight(); }
    get margin() { return this.layout_node.getMargin(Yoga.EDGE_ALL); }
    get margin_top() { return this.layout_node.getMargin(Yoga.EDGE_TOP); }
    get margin_right() { return this.layout_node.getMargin(Yoga.EDGE_RIGHT); }
    get margin_bottom() { return this.layout_node.getMargin(Yoga.EDGE_BOTTOM); }
    get margin_left() { return this.layout_node.getMargin(Yoga.EDGE_LEFT); }
    get padding() { return this.layout_node.getPadding(Yoga.EDGE_ALL); }
    get padding_top() { return this.layout_node.getPadding(Yoga.EDGE_TOP); }
    get padding_right() { return this.layout_node.getPadding(Yoga.EDGE_RIGHT); }
    get padding_bottom() { return this.layout_node.getPadding(Yoga.EDGE_BOTTOM); }
    get padding_left() { return this.layout_node.getPadding(Yoga.EDGE_LEFT); }
    get position() { return this.layout_node.getPositionType(); }

    public dispose(recusive: boolean): void {
        if (recusive) {
            for (const c of this.children) {
                c.dispose(true);
            }
        }
        this.layout_node.free();
    }

}