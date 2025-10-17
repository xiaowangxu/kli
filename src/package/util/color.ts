export class Color {

    private color: number = 0x00000000;

    get r() { return (this.color & 0xff000000) >>> 24; }
    get g() { return (this.color & 0x00ff0000) >>> 16; }
    get b() { return (this.color & 0x0000ff00) >>> 8; }
    get a() { return (this.color & 0x000000ff); }

    set r(v: number) {
        v = Math.floor(Math.max(0, Math.min(255, v)));
        this.color = (this.color & 0x00ffffff) | ((v & 0xff) << 24);
    }
    set g(v: number) {
        v = Math.floor(Math.max(0, Math.min(255, v)));
        this.color = (this.color & 0xff00ffff) | ((v & 0xff) << 16);
    }
    set b(v: number) {
        v = Math.floor(Math.max(0, Math.min(255, v)));
        this.color = (this.color & 0xffff00ff) | ((v & 0xff) << 8);
    }
    set a(v: number) {
        v = Math.floor(Math.max(0, Math.min(255, v)));
        this.color = (this.color & 0xffffff00) | (v & 0xff);
    }

    get hex() {
        return `#${this.r.toString(16).padStart(2, '0')}${this.g.toString(16).padStart(2, '0')}${this.b.toString(16).padStart(2, '0')}${this.a.toString(16).padStart(2, '0')}`;
    }

    static of(r: number, g: number, b: number, a: number = 255) {
        const color = new Color();
        color.r = r;
        color.g = g;
        color.b = b;
        color.a = a;
        return color;
    }

}