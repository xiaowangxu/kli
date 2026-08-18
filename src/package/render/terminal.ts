export interface TerminalCapabilities {
    colorDepth: 1 | 4 | 8 | 24;
    unicode: boolean;
    hyperlinks: boolean;
    clipboardOsc52: boolean;
    focusReporting: boolean;
    synchronizedOutput: boolean;
    kittyKeyboard: boolean;
    kittyGraphics: boolean;
    sixel: boolean;
    remote: boolean;
}

export function detect_terminal_capabilities(env: NodeJS.ProcessEnv = process.env): TerminalCapabilities {
    const term = (env.TERM ?? '').toLocaleLowerCase();
    const program = (env.TERM_PROGRAM ?? '').toLocaleLowerCase();
    const remote = Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY);
    const truecolor = /truecolor|24bit/i.test(env.COLORTERM ?? '') || /kitty|wezterm|alacritty|ghostty/.test(`${term} ${program}`);
    const color256 = /256color/.test(term);
    const dumb = term === 'dumb';
    return {
        colorDepth: truecolor ? 24 : color256 ? 8 : dumb ? 1 : 4,
        unicode: !dumb,
        hyperlinks: !dumb && !/linux/.test(term),
        clipboardOsc52: !dumb,
        focusReporting: !dumb,
        synchronizedOutput: /kitty|wezterm|foot|ghostty/.test(`${term} ${program}`),
        kittyKeyboard: /kitty|wezterm|ghostty/.test(`${term} ${program}`),
        kittyGraphics: Boolean(env.KITTY_WINDOW_ID) || /kitty|wezterm/.test(`${term} ${program}`),
        sixel: /sixel|mlterm|yaft|foot/.test(`${term} ${program}`),
        remote,
    };
}

export const detectTerminalCapabilities = detect_terminal_capabilities;
