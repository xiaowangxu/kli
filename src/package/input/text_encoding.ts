import { spawnSync } from 'node:child_process';

const utf8_fatal = new TextDecoder('utf-8', { fatal: true });
const utf8 = new TextDecoder('utf-8');
let detected_windows_encoding: string | undefined;

const code_page_encodings: Record<string, string> = {
    '65001': 'utf-8',
    '936': 'gb18030',
    '54936': 'gb18030',
    '950': 'big5',
    '932': 'shift_jis',
    '949': 'euc-kr',
    '874': 'windows-874',
    '1250': 'windows-1250',
    '1251': 'windows-1251',
    '1252': 'windows-1252',
    '1253': 'windows-1253',
    '1254': 'windows-1254',
    '1255': 'windows-1255',
    '1256': 'windows-1256',
    '1257': 'windows-1257',
    '1258': 'windows-1258',
};

function windows_encoding() {
    if (detected_windows_encoding !== undefined) return detected_windows_encoding;
    const override = process.env.KLI_PASTE_ENCODING;
    if (override) return detected_windows_encoding = override;
    try {
        const shell = process.env.ComSpec || 'cmd.exe';
        const result = spawnSync(shell, ['/d', '/s', '/c', 'chcp'], {
            encoding: 'ascii', windowsHide: true, timeout: 1000,
        });
        const code_page = /([0-9]{3,5})/.exec(result.stdout ?? '')?.[1];
        if (code_page !== undefined && code_page_encodings[code_page] !== undefined) {
            return detected_windows_encoding = code_page_encodings[code_page];
        }
    }
    catch { /* Locale fallback below. */ }
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (locale.startsWith('zh-tw') || locale.startsWith('zh-hk')) return detected_windows_encoding = 'big5';
    if (locale.startsWith('zh')) return detected_windows_encoding = 'gb18030';
    if (locale.startsWith('ja')) return detected_windows_encoding = 'shift_jis';
    if (locale.startsWith('ko')) return detected_windows_encoding = 'euc-kr';
    return detected_windows_encoding = 'windows-1252';
}

export interface DecodedTerminalText {
    text: string;
    encoding: string;
}

/** Decode bracketed paste without discarding its original bytes. */
export function decode_terminal_text(bytes: Uint8Array, preferredEncoding: string | 'auto' = 'auto'): DecodedTerminalText {
    try {
        return { text: utf8_fatal.decode(bytes), encoding: 'utf-8' };
    }
    catch { /* ConPTY can emit the active Windows code page instead of UTF-8. */ }

    const encoding = preferredEncoding !== 'auto'
        ? preferredEncoding : process.platform === 'win32' ? windows_encoding() : 'utf-8';
    try {
        return { text: new TextDecoder(encoding).decode(bytes), encoding };
    }
    catch {
        return { text: utf8.decode(bytes), encoding: 'utf-8' };
    }
}
