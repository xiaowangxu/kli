import { get_text_layout, type TextLayout, type TextWrapMode } from '../text/text_layout.js';

export interface EditBufferSnapshot {
    value: string;
    caret: number;
    anchor: number;
}

export interface EditBufferReplacement extends EditBufferSnapshot {
    data: string;
    start: number;
    end: number;
}

function grapheme_class(value: string): 'space' | 'word' | 'punctuation' {
    if (/^\s+$/u.test(value)) return 'space';
    if (/^[\p{L}\p{N}\p{M}_]+$/u.test(value)) return 'word';
    return 'punctuation';
}

/** Grapheme-based editing state shared by single-line and multi-line controls. */
export class EditBuffer {
    protected _value = '';
    protected _text_layout: TextLayout = get_text_layout('');
    protected _caret = 0;
    protected _anchor = 0;
    protected readonly undo_stack: EditBufferSnapshot[] = [];
    protected readonly redo_stack: EditBufferSnapshot[] = [];
    public history_limit = 200;

    constructor(value: string = '') { this.setValue(value); }

    public get value() { return this._value; }
    public get caret() { return this._caret; }
    public set caret(value: number) { this._caret = this.clamp(value); }
    public get anchor() { return this._anchor; }
    public set anchor(value: number) { this._anchor = this.clamp(value); }
    public get length() { return this._text_layout.length; }
    public get textLayout() { return this._text_layout; }
    public get text_layout() { return this._text_layout; }
    public get selectionStart() { return Math.min(this.caret, this.anchor); }
    public get selectionEnd() { return Math.max(this.caret, this.anchor); }
    public get hasSelection() { return this.caret !== this.anchor; }
    public get selectedText() {
        return this._text_layout.slice(this.selectionStart, this.selectionEnd);
    }

    public graphemes(value: string = this.value) {
        const layout = value === this.value ? this._text_layout : get_text_layout(value);
        return layout.cells.map((cell) => cell.char);
    }
    public visualLayout(width: number, mode: TextWrapMode = 'word') { return this._text_layout.wrap(width, mode); }
    public visual_layout(width: number, mode: TextWrapMode = 'word') { return this.visualLayout(width, mode); }
    protected clamp(value: number) { return Math.max(0, Math.min(this.length, Math.floor(value))); }
    protected snapshot(): EditBufferSnapshot { return { value: this.value, caret: this.caret, anchor: this.anchor }; }

    public setValue(value: string, preserveSelection: boolean = false, resetHistory: boolean = true) {
        this._value = value;
        this._text_layout = get_text_layout(value);
        const end = this.length;
        if (preserveSelection) {
            this._caret = Math.min(this._caret, end);
            this._anchor = Math.min(this._anchor, end);
        }
        else this._caret = this._anchor = end;
        if (resetHistory) {
            this.undo_stack.length = 0;
            this.redo_stack.length = 0;
        }
    }

    public setSelectionRange(start: number, end: number = start) {
        this._anchor = this.clamp(start);
        this._caret = this.clamp(end);
    }

    public selectAll() { this.setSelectionRange(0, this.length); }
    public clearSelection() { this._anchor = this._caret; }

    public previewReplacement(data: string, maxLength?: number): EditBufferReplacement {
        const current = this._text_layout.cells;
        const incoming_layout = get_text_layout(data);
        const incoming = incoming_layout.cells;
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const allowed = maxLength === undefined
            ? incoming
            : incoming.slice(0, Math.max(0, maxLength - (current.length - (end - start))));
        return {
            value: this._text_layout.slice(0, start) +
                incoming_layout.slice(0, allowed.length) + this._text_layout.slice(end),
            caret: start + allowed.length,
            anchor: start + allowed.length,
            data: incoming_layout.slice(0, allowed.length),
            start,
            end,
        };
    }

    public applyReplacement(replacement: EditBufferReplacement, record: boolean = true) {
        if (record) this.pushUndo();
        this._value = replacement.value;
        this._text_layout = get_text_layout(replacement.value);
        this._caret = replacement.caret;
        this._anchor = replacement.anchor;
        if (record) this.redo_stack.length = 0;
    }

    public replaceSelection(data: string, maxLength?: number) {
        const replacement = this.previewReplacement(data, maxLength);
        this.applyReplacement(replacement);
        return replacement;
    }

    protected pushUndo() {
        const snapshot = this.snapshot();
        const previous = this.undo_stack[this.undo_stack.length - 1];
        if (previous?.value === snapshot.value && previous.caret === snapshot.caret && previous.anchor === snapshot.anchor) return;
        this.undo_stack.push(snapshot);
        if (this.undo_stack.length > this.history_limit) this.undo_stack.shift();
    }

    protected restore(snapshot: EditBufferSnapshot) {
        this._value = snapshot.value;
        this._text_layout = get_text_layout(snapshot.value);
        this._caret = snapshot.caret;
        this._anchor = snapshot.anchor;
    }

    public undo() {
        const snapshot = this.undo_stack.pop();
        if (snapshot === undefined) return false;
        this.redo_stack.push(this.snapshot());
        this.restore(snapshot);
        return true;
    }

    public redo() {
        const snapshot = this.redo_stack.pop();
        if (snapshot === undefined) return false;
        this.undo_stack.push(this.snapshot());
        this.restore(snapshot);
        return true;
    }

    public wordBoundaryBackward(from: number = this.caret) {
        const values = this._text_layout.cells;
        let index = Math.max(0, Math.min(values.length, from));
        while (index > 0 && grapheme_class(values[index - 1].char) === 'space') index--;
        if (index <= 0) return 0;
        const type = grapheme_class(values[index - 1].char);
        while (index > 0 && grapheme_class(values[index - 1].char) === type) index--;
        return index;
    }

    public wordBoundaryForward(from: number = this.caret) {
        const values = this._text_layout.cells;
        let index = Math.max(0, Math.min(values.length, from));
        while (index < values.length && grapheme_class(values[index].char) === 'space') index++;
        if (index >= values.length) return values.length;
        const type = grapheme_class(values[index].char);
        while (index < values.length && grapheme_class(values[index].char) === type) index++;
        return index;
    }

    public lineStart(from: number = this.caret) {
        const values = this._text_layout.cells;
        let index = Math.max(0, Math.min(values.length, from));
        while (index > 0 && values[index - 1].char !== '\n') index--;
        return index;
    }

    public lineEnd(from: number = this.caret) {
        const values = this._text_layout.cells;
        let index = Math.max(0, Math.min(values.length, from));
        while (index < values.length && values[index].char !== '\n') index++;
        return index;
    }
}
