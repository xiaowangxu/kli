import { Color } from '../util/color.js';

export interface KliTheme {
    name: string;
    colors: {
        canvas: Color; surface: Color; elevated: Color; border: Color;
        text: Color; muted: Color; accent: Color; success: Color; warning: Color; error: Color;
        selection: Color; selectionText: Color;
    };
    spacing: { xs: number; sm: number; md: number; lg: number; };
    sizes: { controlHeight: number; compactHeight: number; scrollbar: number; };
}

export const darkTheme: KliTheme = {
    name: 'dark',
    colors: {
        canvas: Color.of(8, 11, 18), surface: Color.of(16, 21, 31), elevated: Color.of(23, 30, 43),
        border: Color.of(59, 73, 98), text: Color.of(232, 239, 251), muted: Color.of(132, 148, 174),
        accent: Color.of(74, 211, 255), success: Color.of(108, 224, 167), warning: Color.of(255, 194, 92),
        error: Color.of(255, 112, 122), selection: Color.of(32, 68, 96), selectionText: Color.of(238, 243, 255),
    },
    spacing: { xs: 0, sm: 1, md: 2, lg: 3 },
    sizes: { controlHeight: 3, compactHeight: 1, scrollbar: 1 },
};

export const lightTheme: KliTheme = {
    name: 'light',
    colors: {
        canvas: Color.of(245, 247, 252), surface: Color.of(255, 255, 255), elevated: Color.of(238, 242, 249),
        border: Color.of(143, 155, 178), text: Color.of(25, 31, 44), muted: Color.of(91, 101, 122),
        accent: Color.of(0, 112, 170), success: Color.of(0, 128, 84), warning: Color.of(180, 105, 0),
        error: Color.of(196, 45, 64), selection: Color.of(188, 226, 244), selectionText: Color.of(12, 36, 50),
    },
    spacing: { xs: 0, sm: 1, md: 2, lg: 3 },
    sizes: { controlHeight: 3, compactHeight: 1, scrollbar: 1 },
};
