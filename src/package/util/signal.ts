export interface SignalBindOption {
    once?: boolean,
}

export type SignalListener<T extends Signal<any>> = T extends Signal<infer P> ? P : never;

export class Signal<T extends (...args: any[]) => void> {

    private has_callbacks: boolean = false;
    private readonly callbacks: Set<T> = new Set();
    private has_callbacks_once: boolean = false;
    private readonly callbacks_once: Set<T> = new Set();

    constructor() {}

    public connect(callback: T, option?: SignalBindOption) {
        const { once = false } = option ?? {};
        if (once) {
            this.callbacks_once.add(callback);
            this.has_callbacks_once = true;
        }
        else {
            this.callbacks.add(callback);
            this.has_callbacks = true;
        }
    }

    public disconnect(callback: T) {
        this.callbacks.delete(callback);
        this.callbacks_once.delete(callback);
        this.has_callbacks = this.callbacks.size > 0;
        this.has_callbacks_once = this.callbacks_once.size > 0;
    }

    public trigger(...args: Parameters<T>) {
        if (this.has_callbacks) {
            for (const callback of this.callbacks) {
                callback(...args);
            }
        }
        if (this.has_callbacks_once) {
            for (const callback of this.callbacks_once) {
                callback(...args);
            }
            this.callbacks_once.clear();
            this.has_callbacks_once = false;
        }
    }

    public clear() {
        this.callbacks.clear();
        this.callbacks_once.clear();
        this.has_callbacks = false;
        this.has_callbacks_once = false;
    }
}