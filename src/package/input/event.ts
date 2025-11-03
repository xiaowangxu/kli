export abstract class InputEvent {

    protected prevent_default_called = false;
    protected propagation_stopped = false;

    public is_propagation_stopped() {
        return this.propagation_stopped;
    }

    public stop_propagation() {
        this.propagation_stopped = true;
    }

    public is_default_prevented() {
        return this.prevent_default_called;
    }

    public prevent_default() {
        this.prevent_default_called = true;
    }

    public abstract match(event: InputEvent, with_pressed: boolean): boolean;

}

export class ComposeInputEvent extends InputEvent {

    public ctrl: boolean = false;
    public shift: boolean = false;
    public alt: boolean = false;
    public meta: boolean = false;

    public set_Compose(ctrl: boolean = false, shift: boolean = false, alt: boolean = false, meta: boolean = false) {
        this.ctrl = ctrl;
        this.shift = shift;
        this.alt = alt;
        this.meta = meta;
        return this;
    }

    public match(event: InputEvent, with_pressed: boolean): boolean {
        return event instanceof ComposeInputEvent && (
            event.ctrl === this.ctrl &&
            event.shift === this.shift &&
            event.alt === this.alt &&
            event.meta === this.meta
        );
    }
}

export class KeyInputEvent extends ComposeInputEvent {

    static readonly #empty_key = '';

    public key: string = KeyInputEvent.#empty_key;
    public keycode: string = KeyInputEvent.#empty_key;
    public pressed: boolean = false;
    public echo: boolean = false;

    public set_Key(key: string, keycode: string, pressed: boolean, echo: boolean) {
        this.key = key;
        this.keycode = keycode;
        this.pressed = pressed;
        this.echo = echo;
        return this;
    }

    public match(event: InputEvent, with_pressed: boolean): boolean {
        return event instanceof KeyInputEvent && (
            event.key === this.key &&
            (with_pressed ? event.pressed === this.pressed : true) &&
            (this.echo === false ? event.echo === false : true)
        ) && (
                event.ctrl === this.ctrl &&
                event.shift === this.shift &&
                event.alt === this.alt &&
                event.meta === this.meta
            );
    }
}

export enum MouseWheel {
    WheelUp, WheelDown
}

export class MouseWheelInputEvent extends ComposeInputEvent {

    public button: MouseWheel = MouseWheel.WheelUp;

    public set_Button(button: MouseWheel) {
        this.button = button;
        return this;
    }

    public match(event: InputEvent, with_pressed: boolean): boolean {
        return event instanceof MouseWheelInputEvent && (
            event.button === this.button
        ) && (
                event.ctrl === this.ctrl &&
                event.shift === this.shift &&
                event.alt === this.alt &&
                event.meta === this.meta
            );
    }
}