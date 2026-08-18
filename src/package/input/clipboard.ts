import { spawn } from 'node:child_process';

export type ClipboardDestination = 'host-only' | 'terminal-only' | 'best-available' | 'all-available';
export type ClipboardOperationStatus = 'written' | 'read' | 'cleared' | 'empty' | 'unsupported' | 'failed' | 'not-attempted';

export interface ClipboardOperationResult {
    status: ClipboardOperationStatus;
    error?: Error;
}

export interface ClipboardWriteResult {
    host: ClipboardOperationResult;
    terminal: ClipboardOperationResult;
}

export interface ClipboardBackend {
    readText?(): Promise<string | undefined>;
    writeText?(text: string): Promise<boolean>;
    clear?(): Promise<boolean>;
}

export interface ClipboardOptions {
    host?: ClipboardBackend;
    terminal?: ClipboardBackend;
    remote?: boolean;
}

export interface ClipboardWriteOptions {
    destination?: ClipboardDestination;
    allowRemoteHost?: boolean;
}

function not_attempted(): ClipboardOperationResult { return { status: 'not-attempted' }; }

async function write_backend(backend: ClipboardBackend | undefined, text: string): Promise<ClipboardOperationResult> {
    if (backend?.writeText === undefined) return { status: 'unsupported' };
    try {
        return await backend.writeText(text) ? { status: 'written' } : { status: 'unsupported' };
    }
    catch (cause) {
        return { status: 'failed', error: cause instanceof Error ? cause : new Error(String(cause)) };
    }
}

/** Composes local-host and OSC 52 clipboard paths with SSH-safe destination policies. */
export class Clipboard {
    public readonly host: ClipboardBackend | undefined;
    public readonly terminal: ClipboardBackend | undefined;
    public readonly remote: boolean;

    constructor(options: ClipboardOptions = {}) {
        this.host = options.host;
        this.terminal = options.terminal;
        this.remote = options.remote ?? is_remote_session();
    }

    public async writeText(text: string, options: ClipboardWriteOptions = {}): Promise<ClipboardWriteResult> {
        if (text.includes('\0')) throw new TypeError('Clipboard text cannot contain NUL characters');
        const destination = options.destination ?? 'best-available';
        const can_use_host = !this.remote || options.allowRemoteHost === true;
        let host = not_attempted();
        let terminal = not_attempted();

        if (destination === 'host-only') {
            host = can_use_host ? await write_backend(this.host, text) : { status: 'not-attempted' };
        }
        else if (destination === 'terminal-only') {
            terminal = await write_backend(this.terminal, text);
        }
        else if (destination === 'all-available') {
            [host, terminal] = await Promise.all([
                can_use_host ? write_backend(this.host, text) : Promise.resolve(not_attempted()),
                write_backend(this.terminal, text),
            ]);
        }
        else if (can_use_host) {
            host = await write_backend(this.host, text);
            if (host.status !== 'written') terminal = await write_backend(this.terminal, text);
        }
        else {
            terminal = await write_backend(this.terminal, text);
        }
        return { host, terminal };
    }

    public async readText(): Promise<string | undefined> {
        if (this.host?.readText === undefined) return undefined;
        return this.host.readText();
    }

    public async clear(options: ClipboardWriteOptions = {}): Promise<ClipboardWriteResult> {
        const clear_backend = async (backend: ClipboardBackend | undefined): Promise<ClipboardOperationResult> => {
            if (backend?.clear === undefined) return { status: 'unsupported' };
            try {
                return await backend.clear() ? { status: 'cleared' } : { status: 'unsupported' };
            }
            catch (cause) {
                return { status: 'failed', error: cause instanceof Error ? cause : new Error(String(cause)) };
            }
        };
        const destination = options.destination ?? 'best-available';
        const can_use_host = !this.remote || options.allowRemoteHost === true;
        let host = not_attempted();
        let terminal = not_attempted();
        if (destination === 'host-only') host = can_use_host ? await clear_backend(this.host) : not_attempted();
        else if (destination === 'terminal-only') terminal = await clear_backend(this.terminal);
        else if (destination === 'all-available') {
            [host, terminal] = await Promise.all([
                can_use_host ? clear_backend(this.host) : Promise.resolve(not_attempted()),
                clear_backend(this.terminal),
            ]);
        }
        else if (can_use_host) {
            host = await clear_backend(this.host);
            if (host.status !== 'cleared') terminal = await clear_backend(this.terminal);
        }
        else terminal = await clear_backend(this.terminal);
        return { host, terminal };
    }
}

export class MemoryClipboardBackend implements ClipboardBackend {
    public text: string | undefined;
    public async readText() { return this.text; }
    public async writeText(text: string) { this.text = text; return true; }
    public async clear() { this.text = undefined; return true; }
}

export class Osc52ClipboardBackend implements ClipboardBackend {
    constructor(protected readonly write: (text: string) => boolean) { }
    public async writeText(text: string) { return this.write(text); }
    public async clear() { return this.write(''); }
}

function run_clipboard_command(command: string, args: string[], input?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
        child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) resolve(Buffer.concat(stdout).toString('utf8'));
            else reject(new Error(Buffer.concat(stderr).toString('utf8') || `${command} exited with ${code}`));
        });
        child.stdin.end(input);
    });
}

/** Native host clipboard backend for Windows, macOS, Wayland, and X11. */
export class HostClipboardBackend implements ClipboardBackend {
    protected commands(mode: 'read' | 'write' | 'clear'): Array<[string, string[]]> {
        if (process.platform === 'win32') {
            const utf8 = '$utf8 = New-Object System.Text.UTF8Encoding($false); ' +
                '[Console]::InputEncoding = $utf8; [Console]::OutputEncoding = $utf8; $OutputEncoding = $utf8; ';
            const operation = mode === 'read'
                ? 'Get-Clipboard -Raw'
                : mode === 'clear' ? 'Set-Clipboard -Value $null' : '[Console]::In.ReadToEnd() | Set-Clipboard';
            return [['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', utf8 + operation]]];
        }
        if (process.platform === 'darwin') {
            return mode === 'read' ? [['pbpaste', []]] : [['pbcopy', []]];
        }
        if (mode === 'read') {
            return [
                ['wl-paste', ['--no-newline']],
                ['xclip', ['-selection', 'clipboard', '-o']],
                ['xsel', ['--clipboard', '--output']],
            ];
        }
        return [
            ['wl-copy', mode === 'clear' ? ['--clear'] : []],
            ['xclip', ['-selection', 'clipboard']],
            ['xsel', ['--clipboard', '--input']],
        ];
    }

    protected async run(mode: 'read' | 'write' | 'clear', input?: string) {
        let last_error: unknown;
        for (const [command, args] of this.commands(mode)) {
            try { return await run_clipboard_command(command, args, input); }
            catch (error) { last_error = error; }
        }
        throw last_error instanceof Error ? last_error : new Error('No host clipboard backend is available');
    }

    public async readText() { return this.run('read'); }
    public async writeText(text: string) { await this.run('write', text); return true; }
    public async clear() { await this.run('clear', ''); return true; }
}

export function is_remote_session(env: NodeJS.ProcessEnv = process.env) {
    return Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY);
}
