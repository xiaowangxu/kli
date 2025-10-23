import Yoga, { Wrap as YogaWrap, PositionType as YogaPositionType, Node as YogaNode, Align as YogaAlign, Justify as YogaJustify, FlexDirection as YogaFlexDirection, Display as YogaDisplay, BoxSizing as YogaBoxSizing, Overflow as YogaOverflow } from "yoga-layout";
import { Node, NodeWithChildren } from "../node/node.js";
import DefaultLayoutConfig from "./config.js";
import { Rect } from "../util/rect.js";
import { Position } from "../util/position.js";

export interface LayoutLeaf {
    readonly layout_node: YogaNode;
    get_rect(): Rect;
    get_content_rect(): Rect;
    get_inner_offset(): Position;
}

export type YogaValue = number | `${number}%` | undefined;
export type YogaValueAuto = number | 'auto' | `${number}%` | undefined;

export interface LayoutNode extends LayoutLeaf {
    set align_content(v: YogaAlign);
    set align_items(v: YogaAlign);
    set justify_content(v: YogaJustify);
    set aspect_ratio(v: number);
    set display(v: YogaDisplay);
    set gap(v: YogaValue);
    set gap_column(v: YogaValue);
    set gap_row(v: YogaValue);
    set flex_direction(v: YogaFlexDirection);
    set flex_basis(v: YogaValueAuto);
    set flex_grow(v: number);
    set flex_shrink(v: number);
    set flex_wrap(v: YogaWrap);
    set top(v: YogaValueAuto);
    set left(v: YogaValueAuto);
    set bottom(v: YogaValueAuto);
    set right(v: YogaValueAuto);
    set width(v: YogaValueAuto);
    set min_width(v: YogaValue);
    set max_width(v: YogaValue);
    set height(v: YogaValueAuto);
    set min_height(v: YogaValue);
    set max_height(v: YogaValue);
    set margin(v: YogaValueAuto);
    set margin_top(v: YogaValueAuto);
    set margin_right(v: YogaValueAuto);
    set margin_bottom(v: YogaValueAuto);
    set margin_left(v: YogaValueAuto);
    set margin_start(v: YogaValueAuto);
    set margin_end(v: YogaValueAuto);
    set margin_horizontal(v: YogaValueAuto);
    set margin_vertical(v: YogaValueAuto);
    set padding(v: YogaValue);
    set padding_top(v: YogaValue);
    set padding_right(v: YogaValue);
    set padding_bottom(v: YogaValue);
    set padding_left(v: YogaValue);
    set padding_start(v: YogaValue);
    set padding_end(v: YogaValue);
    set padding_horizontal(v: YogaValue);
    set padding_vertical(v: YogaValue);
    set position(v: YogaPositionType);
    set border(v: number | undefined);
    set border_top(v: number | undefined);
    set border_right(v: number | undefined);
    set border_bottom(v: number | undefined);
    set border_left(v: number | undefined);
    set border_start(v: number | undefined);
    set border_end(v: number | undefined);
    set border_horizontal(v: number | undefined);
    set border_vertical(v: number | undefined);
    set box_sizing(v: YogaBoxSizing);
    set overflow(v: YogaOverflow);
}

export abstract class LayoutContainer<Children extends Node & (LayoutLeaf | LayoutNode) = Node & (LayoutLeaf | LayoutNode)> extends NodeWithChildren<Children> implements LayoutNode {

    public readonly layout_node: YogaNode = Yoga.Node.createWithConfig(DefaultLayoutConfig);

    set align_content(v: YogaAlign) { this.layout_node.setAlignContent(v); }
    set align_items(v: YogaAlign) { this.layout_node.setAlignItems(v); }
    set justify_content(v: YogaJustify) { this.layout_node.setJustifyContent(v); }
    set aspect_ratio(v: number) { this.layout_node.setAspectRatio(v); }
    set display(v: YogaDisplay) { this.layout_node.setDisplay(v); }
    set gap(v: YogaValue) { this.layout_node.setGap(Yoga.GUTTER_ALL, v); }
    set gap_column(v: YogaValue) { this.layout_node.setGap(Yoga.GUTTER_COLUMN, v); }
    set gap_row(v: YogaValue) { this.layout_node.setGap(Yoga.GUTTER_ROW, v); }
    set flex_direction(v: YogaFlexDirection) { this.layout_node.setFlexDirection(v); }
    set flex_basis(v: YogaValueAuto) { this.layout_node.setFlexBasis(v); }
    set flex_grow(v: number) { this.layout_node.setFlexGrow(v); }
    set flex_shrink(v: number) { this.layout_node.setFlexShrink(v); }
    set flex_wrap(v: YogaWrap) { this.layout_node.setFlexWrap(v); }
    set top(v: YogaValueAuto) { v === 'auto' ? this.layout_node.setPositionAuto(Yoga.EDGE_TOP) : this.layout_node.setPosition(Yoga.EDGE_TOP, v); }
    set left(v: YogaValueAuto) { v === 'auto' ? this.layout_node.setPositionAuto(Yoga.EDGE_LEFT) : this.layout_node.setPosition(Yoga.EDGE_LEFT, v); }
    set bottom(v: YogaValueAuto) { v === 'auto' ? this.layout_node.setPositionAuto(Yoga.EDGE_BOTTOM) : this.layout_node.setPosition(Yoga.EDGE_BOTTOM, v); }
    set right(v: YogaValueAuto) { v === 'auto' ? this.layout_node.setPositionAuto(Yoga.EDGE_RIGHT) : this.layout_node.setPosition(Yoga.EDGE_RIGHT, v); }
    set width(v: YogaValueAuto) { this.layout_node.setWidth(v); }
    set min_width(v: YogaValue) { this.layout_node.setMinWidth(v); }
    set max_width(v: YogaValue) { this.layout_node.setMaxWidth(v); }
    set height(v: YogaValueAuto) { this.layout_node.setHeight(v); }
    set min_height(v: YogaValue) { this.layout_node.setMinHeight(v); }
    set max_height(v: YogaValue) { this.layout_node.setMaxHeight(v); }
    set margin(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_ALL, v); }
    set margin_top(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_TOP, v); }
    set margin_left(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_LEFT, v); }
    set margin_bottom(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_BOTTOM, v); }
    set margin_right(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_RIGHT, v); }
    set margin_start(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_START, v); }
    set margin_end(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_END, v); }
    set margin_horizontal(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_HORIZONTAL, v); }
    set margin_vertical(v: YogaValueAuto) { this.layout_node.setMargin(Yoga.EDGE_VERTICAL, v); }
    set padding(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_ALL, v); }
    set padding_top(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_TOP, v); }
    set padding_left(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_LEFT, v); }
    set padding_bottom(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_BOTTOM, v); }
    set padding_right(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_RIGHT, v); }
    set padding_start(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_START, v); }
    set padding_end(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_END, v); }
    set padding_horizontal(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_HORIZONTAL, v); }
    set padding_vertical(v: YogaValue) { this.layout_node.setPadding(Yoga.EDGE_VERTICAL, v); }
    set position(v: YogaPositionType) { this.layout_node.setPositionType(v); }
    set border(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_ALL, v); }
    set border_top(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_TOP, v); }
    set border_left(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_LEFT, v); }
    set border_bottom(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_BOTTOM, v); }
    set border_right(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_RIGHT, v); }
    set border_start(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_START, v); }
    set border_end(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_END, v); }
    set border_horizontal(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_HORIZONTAL, v); }
    set border_vertical(v: number | undefined) { this.layout_node.setBorder(Yoga.EDGE_VERTICAL, v); }
    set box_sizing(v: YogaBoxSizing) { this.layout_node.setBoxSizing(v); }
    set overflow(v: YogaOverflow) { this.layout_node.setOverflow(v); }

    protected on_child_addeded(node: Node & (LayoutLeaf | LayoutNode)): void {
        this.layout_node.insertChild(node.layout_node, this.layout_node.getChildCount());
    }
    protected on_child_removed(node: Node & (LayoutLeaf | LayoutNode)): void {
        this.layout_node.removeChild(node.layout_node);
    }
    protected on_child_moved(node: Node & (LayoutLeaf | LayoutNode), from: number, to: number): void {
        this.layout_node.removeChild(node.layout_node);
        this.layout_node.insertChild(node.layout_node, to);
    }

    public get_rect(): Rect {
        if (this.parent === undefined || !(this.parent instanceof LayoutContainer)) {
            return Rect.of(
                this.layout_node.getComputedLeft(),
                this.layout_node.getComputedTop(),
                this.layout_node.getComputedWidth(),
                this.layout_node.getComputedHeight(),
            );
        }
        else {
            const { x, y } = this.parent.get_rect();
            const { x: offset_x, y: offset_y } = this.parent.get_inner_offset();
            return Rect.of(
                x + this.layout_node.getComputedLeft() + offset_x,
                y + this.layout_node.getComputedTop() + offset_y,
                this.layout_node.getComputedWidth(),
                this.layout_node.getComputedHeight(),
            );
        }
    }

    public get_content_rect(): Rect {
        const left = this.layout_node.getComputedBorder(Yoga.EDGE_LEFT) + this.layout_node.getComputedPadding(Yoga.EDGE_LEFT);
        const top = this.layout_node.getComputedBorder(Yoga.EDGE_TOP) + this.layout_node.getComputedPadding(Yoga.EDGE_TOP);
        const right = this.layout_node.getComputedBorder(Yoga.EDGE_RIGHT) + this.layout_node.getComputedPadding(Yoga.EDGE_RIGHT);
        const bottom = this.layout_node.getComputedBorder(Yoga.EDGE_BOTTOM) + this.layout_node.getComputedPadding(Yoga.EDGE_BOTTOM);
        if (this.parent === undefined || !(this.parent instanceof LayoutContainer)) {
            return Rect.of(
                this.layout_node.getComputedLeft() + left,
                this.layout_node.getComputedTop() + top,
                this.layout_node.getComputedWidth() - left - right,
                this.layout_node.getComputedHeight() - top - bottom,
            );
        }
        else {
            const { x, y } = this.parent.get_rect();
            const { x: offset_x, y: offset_y } = this.parent.get_inner_offset();
            return Rect.of(
                x + this.layout_node.getComputedLeft() + left + offset_x,
                y + this.layout_node.getComputedTop() + top + offset_y,
                this.layout_node.getComputedWidth() - left - right,
                this.layout_node.getComputedHeight() - top - bottom,
            );
        }
    }

    public get_inner_offset(): Position {
        return Position.of(0, 0);
    }

    public dispose(recusive: boolean): void {
        if (recusive) {
            for (const c of this.children) {
                c.dispose(true);
            }
        }
        this.layout_node.free();
    }

}