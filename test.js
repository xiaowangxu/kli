const stdin = process.stdin;
const stdout = process.stdout;

if (!stdin.isTTY) {
    console.error("This script requires an interactive terminal.");
    process.exit(1);
}

let scrollCount = 0;

function setupTerminal() {
    stdout.write('\x1b[?1049h'); // 进入备用屏幕
    stdout.write('\x1b[?25l');   // 隐藏光标，避免闪烁
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdout.write('\x1b[?1006h'); // 开启鼠标报告 (SGR 模式)
}

function restoreTerminal() {
    stdout.write('\x1b[?1006l'); // 禁用鼠标报告
    stdin.setRawMode(false);
    stdout.write('\x1b[?25h');   // 显示光标
    stdout.write('\x1b[?1049l'); // 退出备用屏幕
    stdout.write('\n');
    process.exit();
}

function updateDisplay() {
    // 仅将光标移动到起始位置
    stdout.write('\x1b[H');
    // 写入新内容，并清除行尾多余部分
    for (let i = 0; i < 4; i++) {
        stdout.write(`Mouse scroll count: ${scrollCount}\x1b[K\n`);
        stdout.write(`${i} Use mouse wheel to scroll. Press Ctrl+C to exit.\x1b[K\n`);
    }
}

setupTerminal();
updateDisplay();

stdin.on('data', (data) => {
    const sequence = data.toString('utf8');
    if (sequence === '\u0003') { // Ctrl+C
        restoreTerminal();
    }

    if (sequence === '\x1B[B') {
        scrollCount++;
        updateDisplay();
    } else if (sequence === '\x1B[A') {
        scrollCount--;
        updateDisplay();
    }
});

process.on('SIGINT', restoreTerminal);
process.on('exit', () => stdout.write('\x1b[?1049l\n'));
