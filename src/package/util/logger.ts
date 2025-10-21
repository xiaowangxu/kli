import * as fs from 'fs';
import * as path from 'path';

const log_file = path.join(process.cwd(), './log/dev.log');
const log_stream = fs.createWriteStream(log_file, { flags: 'w' });

export function log(...args: any[]) {
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    // 写入文件
    log_stream.write(logMessage);
}