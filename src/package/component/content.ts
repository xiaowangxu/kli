import { ValueInputEvent } from '../input/event.js';
import { VirtualList, Tree, TreeItem } from './virtual_list.js';
import { Container } from '../node/container.js';
import { Renderer } from '../render/renderer.js';
import { Color } from '../util/color.js';

export interface DescriptionItem { term: string; description: string; }

export class DescriptionList extends VirtualList<DescriptionItem> {
    public term_width = 18;
    constructor() {
        super();
        this.render_item = (item) => `${item.term.padEnd(this.term_width)} ${item.description}`;
    }
}

export class CodeView extends VirtualList<string> {
    public language = 'text';
    public line_numbers = true;
    public tab_size = 4;
    protected source = '';
    constructor() {
        super();
        this.scroll_x = true;
        this.render_item = (line, index) => `${this.line_numbers ? `${String(index + 1).padStart(String(this.items.length).length)} │ ` : ''}${line.replaceAll('\t', ' '.repeat(this.tab_size))}`;
    }
    public set code(value: string) {
        this.source = value ?? '';
        this.items = this.source.split(/\r?\n/);
        this.estimated_item_width = Math.max(0, ...this.items.map((line) => line.length + (this.line_numbers ? String(this.items.length).length + 3 : 0)));
    }
    public get code() { return this.source; }
}

export class LineNumber extends Container {
    public value = 1;
    public digits = 4;
    public separator = ' │';
    public color = Color.of(132, 148, 174);
    constructor() { super(); this.width = 7; this.height = 1; }
    public draw(render: Renderer, force = false) {
        super.draw(render, force);
        const rect = this.get_content_rect();
        render.draw_string(rect.x, rect.y, `${String(this.value).padStart(this.digits)}${this.separator}`, { color: this.color });
    }
}

export type DiffLineKind = 'equal' | 'insert' | 'delete';
export interface DiffLine { kind: DiffLineKind; old_line?: number; new_line?: number; text: string; }

export class DiffView extends VirtualList<DiffLine> {
    constructor() {
        super();
        this.scroll_x = true;
        this.render_item = (line) => `${line.kind === 'insert' ? '+' : line.kind === 'delete' ? '-' : ' '} ${String(line.old_line ?? '').padStart(4)} ${String(line.new_line ?? '').padStart(4)} │ ${line.text}`;
    }
    public set_diff(before: string, after: string) {
        const left = before.split(/\r?\n/);
        const right = after.split(/\r?\n/);
        // LCS keeps the output stable and readable for normal source-sized inputs.
        const rows = left.length + 1;
        const cols = right.length + 1;
        const table = Array.from({ length: rows }, () => new Uint32Array(cols));
        for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) {
            table[i][j] = left[i] === right[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
        }
        const output: DiffLine[] = [];
        let i = 0, j = 0;
        while (i < left.length || j < right.length) {
            if (i < left.length && j < right.length && left[i] === right[j]) output.push({ kind: 'equal', old_line: ++i, new_line: ++j, text: left[i - 1] });
            else if (j < right.length && (i >= left.length || table[i][j + 1] >= table[i + 1][j])) output.push({ kind: 'insert', new_line: ++j, text: right[j - 1] });
            else output.push({ kind: 'delete', old_line: ++i, text: left[i - 1] });
        }
        this.items = output;
        this.estimated_item_width = Math.max(0, ...output.map((line) => line.text.length + 14));
    }
    public setDiff(before: string, after: string) { this.set_diff(before, after); }
}

export class MarkdownView extends VirtualList<string> {
    protected source = '';
    public set markdown(value: string) {
        this.source = value ?? '';
        this.items = this.source.split(/\r?\n/).map((line) => {
            const heading = /^(#{1,6})\s+(.*)$/.exec(line);
            if (heading) return `${'█'.repeat(Math.max(1, 7 - heading[1].length))} ${heading[2]}`;
            const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
            if (bullet) return `  • ${bullet[1]}`;
            const quote = /^>\s?(.*)$/.exec(line);
            if (quote) return `│ ${quote[1]}`;
            return line.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '‹$1›');
        });
    }
    public get markdown() { return this.source; }
}

export class TreeSelect<T = unknown> extends Tree<T> {
    public get selected_value() { return this.items[this.selected_index]?.item.value; }
    public commit() { this.dispatchEvent(new ValueInputEvent('change', { value: this.selected_value })); }
}
