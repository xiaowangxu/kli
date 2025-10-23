import { createSignal, onCleanup, createEffect } from 'solid-js';

export interface DeltaFrameReturn {
    delta: () => number; // 距离上一帧的时间差 (ms)
    duration: () => number; // 总运行时长 (ms)
    frameCount: () => number; // 帧计数
    clear: () => void; // 清除并重置
    pause: () => void; // 暂停
    start: () => void; // 开始/恢复
    isPaused: () => boolean; // 是否暂停
}

export function useDeltaFrame(fps?: number, autoStart?: boolean): DeltaFrameReturn {
    fps ??= 60;
    autoStart ??= true;

    const interval = 1000 / fps; // 间隔时间 (ms)

    const [delta, setDelta] = createSignal(0);
    const [duration, setDuration] = createSignal(0);
    const [frameCount, setFrameCount] = createSignal(0);
    const [isPaused, setIsPaused] = createSignal(!autoStart);

    let timerId: NodeJS.Timeout | null = null;
    let lastTime = 0;
    let startTime = 0;
    let pausedTime = 0;
    let pauseStartTime = 0;

    const tick = () => {
        const currentTime = Date.now();

        if (lastTime === 0) {
            lastTime = currentTime;
            startTime = currentTime;
            setDelta(0);
        } else {
            const deltaTime = currentTime - lastTime;
            setDelta(deltaTime);
            lastTime = currentTime;
        }

        setDuration(currentTime - startTime - pausedTime);
        setFrameCount(prev => prev + 1);
    };

    const start = () => {
        if (!isPaused()) return;

        setIsPaused(false);

        // 记录暂停时长
        if (pauseStartTime > 0) {
            pausedTime += Date.now() - pauseStartTime;
            pauseStartTime = 0;
        }

        // 重置 lastTime 以避免巨大的 delta
        lastTime = 0;

        if (timerId === null) {
            timerId = setInterval(tick, interval);
        }
    };

    const pause = () => {
        if (isPaused()) return;

        setIsPaused(true);
        pauseStartTime = Date.now();

        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
    };

    const clear = () => {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }

        setDelta(0);
        setDuration(0);
        setFrameCount(0);
        setIsPaused(!autoStart);

        lastTime = 0;
        startTime = 0;
        pausedTime = 0;
        pauseStartTime = 0;

        if (autoStart) {
            timerId = setInterval(tick, interval);
        }
    };

    // 自动开始
    createEffect(() => {
        if (autoStart && !isPaused()) {
            timerId = setInterval(tick, interval);
        }
    });

    // 清理
    onCleanup(() => {
        if (timerId !== null) {
            clearInterval(timerId);
        }
    });

    return {
        delta,
        duration,
        frameCount,
        clear,
        pause,
        start,
        isPaused,
    };
}