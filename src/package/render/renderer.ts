import { WriteStream } from "node:tty";
import { Color } from "../util/color.js";
import { PixelTextStyle, Buffer } from "./buffer.js";
import { Rect } from "../util/rect.js";
import { Scene } from "../scene/scene.js";
import { BorderType } from "../style/border_style.js";
import { TextContainer } from "../node/container.js";

export const ANSI = {
    none: '',

    clear: '\x1B[2J\x1B[3J\x1B[H\x1Bc',
    hide_cursor: '\x1B[?25l',
    show_cursor: '\x1B[?25h',
    move_to: (x: number, y: number) => `\x1B[${y + 1};${x + 1}H`,

    reset: '\x1B[0m',
    bold: '\x1B[1m',
    dim: '\x1B[2m',
    italic: '\x1B[3m',
    underline: '\x1B[4m',
    inverse: '\x1B[7m',

    fg: (n: number) => `\x1B[38;5;${n}m`,
    bg: (n: number) => `\x1B[48;5;${n}m`,
    rgb: (c: Color) => `\x1B[38;2;${c.r};${c.g};${c.b}m`,
    bg_rgb: (c: Color) => `\x1B[48;2;${c.r};${c.g};${c.b}m`,

    color: {
        red: '\x1B[31m',
        green: '\x1B[32m',
        yellow: '\x1B[33m',
        blue: '\x1B[34m',
        magenta: '\x1B[35m',
        cyan: '\x1B[36m',
        white: '\x1B[37m',
    },
};

// #region emoji_regax
export const emoji_regax = () => /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F?/g;
// #endregion

export function calculate_char_region(char: string) {
    let x = char.charCodeAt(0);
    let y = (char.length == 2) ? char.charCodeAt(1) : 0;
    let codePoint = x;
    if ((0xD800 <= x && x <= 0xDBFF) && (0xDC00 <= y && y <= 0xDFFF)) {
        x &= 0x3FF;
        y &= 0x3FF;
        codePoint = (x << 10) | y;
        codePoint += 0x10000;
    }

    if ((0x3000 == codePoint) ||
        (0xFF01 <= codePoint && codePoint <= 0xFF60) ||
        (0xFFE0 <= codePoint && codePoint <= 0xFFE6)) {
        return 'F';
    }
    if ((0x20A9 == codePoint) ||
        (0xFF61 <= codePoint && codePoint <= 0xFFBE) ||
        (0xFFC2 <= codePoint && codePoint <= 0xFFC7) ||
        (0xFFCA <= codePoint && codePoint <= 0xFFCF) ||
        (0xFFD2 <= codePoint && codePoint <= 0xFFD7) ||
        (0xFFDA <= codePoint && codePoint <= 0xFFDC) ||
        (0xFFE8 <= codePoint && codePoint <= 0xFFEE)) {
        return 'H';
    }
    if ((0x1100 <= codePoint && codePoint <= 0x115F) ||
        (0x11A3 <= codePoint && codePoint <= 0x11A7) ||
        (0x11FA <= codePoint && codePoint <= 0x11FF) ||
        (0x2329 <= codePoint && codePoint <= 0x232A) ||
        (0x2E80 <= codePoint && codePoint <= 0x2E99) ||
        (0x2E9B <= codePoint && codePoint <= 0x2EF3) ||
        (0x2F00 <= codePoint && codePoint <= 0x2FD5) ||
        (0x2FF0 <= codePoint && codePoint <= 0x2FFB) ||
        (0x3001 <= codePoint && codePoint <= 0x303E) ||
        (0x3041 <= codePoint && codePoint <= 0x3096) ||
        (0x3099 <= codePoint && codePoint <= 0x30FF) ||
        (0x3105 <= codePoint && codePoint <= 0x312D) ||
        (0x3131 <= codePoint && codePoint <= 0x318E) ||
        (0x3190 <= codePoint && codePoint <= 0x31BA) ||
        (0x31C0 <= codePoint && codePoint <= 0x31E3) ||
        (0x31F0 <= codePoint && codePoint <= 0x321E) ||
        (0x3220 <= codePoint && codePoint <= 0x3247) ||
        (0x3250 <= codePoint && codePoint <= 0x32FE) ||
        (0x3300 <= codePoint && codePoint <= 0x4DBF) ||
        (0x4E00 <= codePoint && codePoint <= 0xA48C) ||
        (0xA490 <= codePoint && codePoint <= 0xA4C6) ||
        (0xA960 <= codePoint && codePoint <= 0xA97C) ||
        (0xAC00 <= codePoint && codePoint <= 0xD7A3) ||
        (0xD7B0 <= codePoint && codePoint <= 0xD7C6) ||
        (0xD7CB <= codePoint && codePoint <= 0xD7FB) ||
        (0xF900 <= codePoint && codePoint <= 0xFAFF) ||
        (0xFE10 <= codePoint && codePoint <= 0xFE19) ||
        (0xFE30 <= codePoint && codePoint <= 0xFE52) ||
        (0xFE54 <= codePoint && codePoint <= 0xFE66) ||
        (0xFE68 <= codePoint && codePoint <= 0xFE6B) ||
        (0x1B000 <= codePoint && codePoint <= 0x1B001) ||
        (0x1F200 <= codePoint && codePoint <= 0x1F202) ||
        (0x1F210 <= codePoint && codePoint <= 0x1F23A) ||
        (0x1F240 <= codePoint && codePoint <= 0x1F248) ||
        (0x1F250 <= codePoint && codePoint <= 0x1F251) ||
        (0x20000 <= codePoint && codePoint <= 0x2F73F) ||
        (0x2B740 <= codePoint && codePoint <= 0x2FFFD) ||
        (0x30000 <= codePoint && codePoint <= 0x3FFFD)) {
        return 'W';
    }
    if ((0x0020 <= codePoint && codePoint <= 0x007E) ||
        (0x00A2 <= codePoint && codePoint <= 0x00A3) ||
        (0x00A5 <= codePoint && codePoint <= 0x00A6) ||
        (0x00AC == codePoint) ||
        (0x00AF == codePoint) ||
        (0x27E6 <= codePoint && codePoint <= 0x27ED) ||
        (0x2985 <= codePoint && codePoint <= 0x2986)) {
        return 'Na';
    }
    if ((0x00A1 == codePoint) ||
        (0x00A4 == codePoint) ||
        (0x00A7 <= codePoint && codePoint <= 0x00A8) ||
        (0x00AA == codePoint) ||
        (0x00AD <= codePoint && codePoint <= 0x00AE) ||
        (0x00B0 <= codePoint && codePoint <= 0x00B4) ||
        (0x00B6 <= codePoint && codePoint <= 0x00BA) ||
        (0x00BC <= codePoint && codePoint <= 0x00BF) ||
        (0x00C6 == codePoint) ||
        (0x00D0 == codePoint) ||
        (0x00D7 <= codePoint && codePoint <= 0x00D8) ||
        (0x00DE <= codePoint && codePoint <= 0x00E1) ||
        (0x00E6 == codePoint) ||
        (0x00E8 <= codePoint && codePoint <= 0x00EA) ||
        (0x00EC <= codePoint && codePoint <= 0x00ED) ||
        (0x00F0 == codePoint) ||
        (0x00F2 <= codePoint && codePoint <= 0x00F3) ||
        (0x00F7 <= codePoint && codePoint <= 0x00FA) ||
        (0x00FC == codePoint) ||
        (0x00FE == codePoint) ||
        (0x0101 == codePoint) ||
        (0x0111 == codePoint) ||
        (0x0113 == codePoint) ||
        (0x011B == codePoint) ||
        (0x0126 <= codePoint && codePoint <= 0x0127) ||
        (0x012B == codePoint) ||
        (0x0131 <= codePoint && codePoint <= 0x0133) ||
        (0x0138 == codePoint) ||
        (0x013F <= codePoint && codePoint <= 0x0142) ||
        (0x0144 == codePoint) ||
        (0x0148 <= codePoint && codePoint <= 0x014B) ||
        (0x014D == codePoint) ||
        (0x0152 <= codePoint && codePoint <= 0x0153) ||
        (0x0166 <= codePoint && codePoint <= 0x0167) ||
        (0x016B == codePoint) ||
        (0x01CE == codePoint) ||
        (0x01D0 == codePoint) ||
        (0x01D2 == codePoint) ||
        (0x01D4 == codePoint) ||
        (0x01D6 == codePoint) ||
        (0x01D8 == codePoint) ||
        (0x01DA == codePoint) ||
        (0x01DC == codePoint) ||
        (0x0251 == codePoint) ||
        (0x0261 == codePoint) ||
        (0x02C4 == codePoint) ||
        (0x02C7 == codePoint) ||
        (0x02C9 <= codePoint && codePoint <= 0x02CB) ||
        (0x02CD == codePoint) ||
        (0x02D0 == codePoint) ||
        (0x02D8 <= codePoint && codePoint <= 0x02DB) ||
        (0x02DD == codePoint) ||
        (0x02DF == codePoint) ||
        (0x0300 <= codePoint && codePoint <= 0x036F) ||
        (0x0391 <= codePoint && codePoint <= 0x03A1) ||
        (0x03A3 <= codePoint && codePoint <= 0x03A9) ||
        (0x03B1 <= codePoint && codePoint <= 0x03C1) ||
        (0x03C3 <= codePoint && codePoint <= 0x03C9) ||
        (0x0401 == codePoint) ||
        (0x0410 <= codePoint && codePoint <= 0x044F) ||
        (0x0451 == codePoint) ||
        (0x2010 == codePoint) ||
        (0x2013 <= codePoint && codePoint <= 0x2016) ||
        (0x2018 <= codePoint && codePoint <= 0x2019) ||
        (0x201C <= codePoint && codePoint <= 0x201D) ||
        (0x2020 <= codePoint && codePoint <= 0x2022) ||
        (0x2024 <= codePoint && codePoint <= 0x2027) ||
        (0x2030 == codePoint) ||
        (0x2032 <= codePoint && codePoint <= 0x2033) ||
        (0x2035 == codePoint) ||
        (0x203B == codePoint) ||
        (0x203E == codePoint) ||
        (0x2074 == codePoint) ||
        (0x207F == codePoint) ||
        (0x2081 <= codePoint && codePoint <= 0x2084) ||
        (0x20AC == codePoint) ||
        (0x2103 == codePoint) ||
        (0x2105 == codePoint) ||
        (0x2109 == codePoint) ||
        (0x2113 == codePoint) ||
        (0x2116 == codePoint) ||
        (0x2121 <= codePoint && codePoint <= 0x2122) ||
        (0x2126 == codePoint) ||
        (0x212B == codePoint) ||
        (0x2153 <= codePoint && codePoint <= 0x2154) ||
        (0x215B <= codePoint && codePoint <= 0x215E) ||
        (0x2160 <= codePoint && codePoint <= 0x216B) ||
        (0x2170 <= codePoint && codePoint <= 0x2179) ||
        (0x2189 == codePoint) ||
        (0x2190 <= codePoint && codePoint <= 0x2199) ||
        (0x21B8 <= codePoint && codePoint <= 0x21B9) ||
        (0x21D2 == codePoint) ||
        (0x21D4 == codePoint) ||
        (0x21E7 == codePoint) ||
        (0x2200 == codePoint) ||
        (0x2202 <= codePoint && codePoint <= 0x2203) ||
        (0x2207 <= codePoint && codePoint <= 0x2208) ||
        (0x220B == codePoint) ||
        (0x220F == codePoint) ||
        (0x2211 == codePoint) ||
        (0x2215 == codePoint) ||
        (0x221A == codePoint) ||
        (0x221D <= codePoint && codePoint <= 0x2220) ||
        (0x2223 == codePoint) ||
        (0x2225 == codePoint) ||
        (0x2227 <= codePoint && codePoint <= 0x222C) ||
        (0x222E == codePoint) ||
        (0x2234 <= codePoint && codePoint <= 0x2237) ||
        (0x223C <= codePoint && codePoint <= 0x223D) ||
        (0x2248 == codePoint) ||
        (0x224C == codePoint) ||
        (0x2252 == codePoint) ||
        (0x2260 <= codePoint && codePoint <= 0x2261) ||
        (0x2264 <= codePoint && codePoint <= 0x2267) ||
        (0x226A <= codePoint && codePoint <= 0x226B) ||
        (0x226E <= codePoint && codePoint <= 0x226F) ||
        (0x2282 <= codePoint && codePoint <= 0x2283) ||
        (0x2286 <= codePoint && codePoint <= 0x2287) ||
        (0x2295 == codePoint) ||
        (0x2299 == codePoint) ||
        (0x22A5 == codePoint) ||
        (0x22BF == codePoint) ||
        (0x2312 == codePoint) ||
        (0x2460 <= codePoint && codePoint <= 0x24E9) ||
        (0x24EB <= codePoint && codePoint <= 0x254B) ||
        (0x2550 <= codePoint && codePoint <= 0x2573) ||
        (0x2580 <= codePoint && codePoint <= 0x258F) ||
        (0x2592 <= codePoint && codePoint <= 0x2595) ||
        (0x25A0 <= codePoint && codePoint <= 0x25A1) ||
        (0x25A3 <= codePoint && codePoint <= 0x25A9) ||
        (0x25B2 <= codePoint && codePoint <= 0x25B3) ||
        (0x25B6 <= codePoint && codePoint <= 0x25B7) ||
        (0x25BC <= codePoint && codePoint <= 0x25BD) ||
        (0x25C0 <= codePoint && codePoint <= 0x25C1) ||
        (0x25C6 <= codePoint && codePoint <= 0x25C8) ||
        (0x25CB == codePoint) ||
        (0x25CE <= codePoint && codePoint <= 0x25D1) ||
        (0x25E2 <= codePoint && codePoint <= 0x25E5) ||
        (0x25EF == codePoint) ||
        (0x2605 <= codePoint && codePoint <= 0x2606) ||
        (0x2609 == codePoint) ||
        (0x260E <= codePoint && codePoint <= 0x260F) ||
        (0x2614 <= codePoint && codePoint <= 0x2615) ||
        (0x261C == codePoint) ||
        (0x261E == codePoint) ||
        (0x2640 == codePoint) ||
        (0x2642 == codePoint) ||
        (0x2660 <= codePoint && codePoint <= 0x2661) ||
        (0x2663 <= codePoint && codePoint <= 0x2665) ||
        (0x2667 <= codePoint && codePoint <= 0x266A) ||
        (0x266C <= codePoint && codePoint <= 0x266D) ||
        (0x266F == codePoint) ||
        (0x269E <= codePoint && codePoint <= 0x269F) ||
        (0x26BE <= codePoint && codePoint <= 0x26BF) ||
        (0x26C4 <= codePoint && codePoint <= 0x26CD) ||
        (0x26CF <= codePoint && codePoint <= 0x26E1) ||
        (0x26E3 == codePoint) ||
        (0x26E8 <= codePoint && codePoint <= 0x26FF) ||
        (0x273D == codePoint) ||
        (0x2757 == codePoint) ||
        (0x2776 <= codePoint && codePoint <= 0x277F) ||
        (0x2B55 <= codePoint && codePoint <= 0x2B59) ||
        (0x3248 <= codePoint && codePoint <= 0x324F) ||
        (0xE000 <= codePoint && codePoint <= 0xF8FF) ||
        (0xFE00 <= codePoint && codePoint <= 0xFE0F) ||
        (0xFFFD == codePoint) ||
        (0x1F100 <= codePoint && codePoint <= 0x1F10A) ||
        (0x1F110 <= codePoint && codePoint <= 0x1F12D) ||
        (0x1F130 <= codePoint && codePoint <= 0x1F169) ||
        (0x1F170 <= codePoint && codePoint <= 0x1F19A) ||
        (0xE0100 <= codePoint && codePoint <= 0xE01EF) ||
        (0xF0000 <= codePoint && codePoint <= 0xFFFFD) ||
        (0x100000 <= codePoint && codePoint <= 0x10FFFD)) {
        return 'A';
    }

    return 'N';
};

export function calculate_char_width(char: string, ambiguous_width: number = 2) {
    if (char === ' ') return 1;
    const code = calculate_char_region(char);
    switch (code) {
        case 'F':
        case 'W':
            return 2;
        case 'A':
            return ambiguous_width;
        default:
            return 1;
    }
}

export class Renderer {

    public readonly stream: WriteStream;
    protected readonly buffer: Buffer;
    protected readonly render_callback: (render: Renderer) => void;

    protected scene: Scene | undefined;

    constructor(stream: WriteStream, render_callback: (render: Renderer) => void) {
        this.stream = stream;
        this.buffer = new Buffer();
        this.buffer.resize(this.width, this.height);
        this.render_callback = render_callback;
    }

    get width(): number {
        return this.stream.columns;
    }
    get height(): number {
        return this.stream.rows;
    }

    protected render_queued: boolean = false;
    protected is_rendering: boolean = false;

    public queue_render() {
        if (this.is_rendering) {
            this.render_queued = true;
        }
        if (this.render_queued) return;
        else {
            this.render_queued = true;
            setImmediate(() => {
                this.begin_render(this.width, this.height);
                this.render_callback(this);
                this.end_render();
            });
        }
    }

    private on_changed_listener = () => this.queue_render();
    public set_scene(scene: Scene) {
        if (this.scene === scene) return;
        if (this.scene !== undefined) {
            this.scene.on_changed.disconnect(this.on_changed_listener);
        }
        this.scene = scene;
        this.scene.on_changed.connect(this.on_changed_listener);
    }

    public clear_scene() {
        if (this.scene !== undefined) {
            this.scene.on_changed.disconnect(this.on_changed_listener);
        }
        this.scene = undefined;
    }

    init() {
        this.stream.write('\x1b[?1049h\x1b[?25l\x1b[?1006h');
        this.stream.on('resize', this.on_changed_listener);
    }
    dispose() {
        this.stream.write('\x1b[?1006l\x1b[?1049l\x1b[?25h');
        this.stream.off('resize', this.on_changed_listener);
    }

    private rendered_content: string = '';

    protected begin_render(width: number, height: number): void {
        this.is_rendering = true;
        this.render_queued = false;
        this.buffer.resize(width, height);
        this.rendered_content = '';
        this.mask_stack = [];
    }

    protected mask_stack: Rect[] = [];

    public push_mask(mask: Rect) {
        if (this.mask_stack.length === 0) {
            this.mask_stack.push(mask);
            this.buffer.set_mask(mask);
        }
        else {
            mask = this.mask_stack[this.mask_stack.length - 1].intersect(mask) ?? Rect.of(0, 0, 0, 0);
            this.mask_stack.push(mask);
            this.buffer.set_mask(mask);
        }
    }

    public pop_mask() {
        this.mask_stack.pop();
        if (this.mask_stack.length === 0) {
            this.buffer.set_mask();
        }
        else {
            this.buffer.set_mask(this.mask_stack[this.mask_stack.length - 1]);
        }
    }

    public fill(rect: Rect, bg_color?: Color) {
        this.draw_char(rect.x, rect.y, rect.width, rect.height, undefined, undefined, bg_color === undefined ? undefined : { bg_color }, true);
    }

    public draw_text_style(x: number, y: number, width: number, height: number, text_style?: PixelTextStyle, clear_style?: boolean) {
        this.buffer.set_text_style(x, y, width, height, text_style, clear_style);
    }

    public draw_char(x: number, y: number, width?: number, height?: number, char?: string, span: number = 1, text_style?: PixelTextStyle, clear_style?: boolean) {
        this.buffer.set_char(x, y, width, height, char, span, text_style, clear_style);
    }

    public draw_string(x: number, y: number, str: string, text_style?: PixelTextStyle, clear_style?: boolean) {
        const chars = [...str];
        const width = chars.length;
        if (width === 0) return 0;
        if (width === 1) {
            const char_width = calculate_char_width(chars[0]);
            this.draw_char(x, y, 1, 1, chars[0], char_width, text_style, clear_style);
            return char_width;
        }
        else {
            let total_width = 0;
            for (let i = 0; i < width && (x + i) < this.width; i++) {
                const char_width = calculate_char_width(chars[i]);
                this.draw_char(x + i, y, 1, 1, chars[i], char_width, text_style, clear_style);
                x += char_width - 1;
                total_width += char_width;
            }
            return total_width;
        }
    }

    public draw_box_border(rect: Rect, border_type: BorderType, text_style?: PixelTextStyle, clear_style?: boolean) {
        const { x, y, width, height } = rect;
        const {
            top_left,
            top,
            top_right,
            right,
            bottom_left,
            bottom,
            bottom_right,
            left,
        } = border_type;
        this.draw_char(x, y, undefined, undefined, top_left, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y, undefined, undefined, top_right, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y + height - 1, undefined, undefined, bottom_right, undefined, text_style, clear_style);
        this.draw_char(x, y + height - 1, undefined, undefined, bottom_left, undefined, text_style, clear_style);
        this.draw_char(x + 1, y, width - 2, 1, top, undefined, text_style, clear_style);
        this.draw_char(x + 1, y + height - 1, width - 2, 1, bottom, undefined, text_style, clear_style);
        this.draw_char(x, y + 1, 1, height - 2, left, undefined, text_style, clear_style);
        this.draw_char(x + width - 1, y + 1, 1, height - 2, right, undefined, text_style, clear_style);
    }

    public draw_scene() {
        if (this.scene === undefined) return;
        this.scene.calculate_layout(this.width, this.height);
        this.scene.draw(this);
    }

    public execute_render(viewport: Rect, target: Rect, clear_screen: boolean, clear_empty: boolean, clear_screen_color?: Color, clear_empty_color?: Color) {

        const render_rect = target.intersect(Rect.of(0, 0, this.width, this.height));

        if (render_rect === undefined) {
            // clear
            if (clear_screen) {
                const width = this.width;
                const clear_str = ' '.repeat(width);
                let str = '';
                for (let i = 0; i < this.height; i++) {
                    str += ANSI.move_to(0, i);
                    str += `${ANSI.reset}${clear_screen_color ? ANSI.bg_rgb(clear_screen_color) : ''}${clear_str}${ANSI.reset}`;
                }
                this.rendered_content += str;
            }
            return;
        }

        const render_offset_x = target.x - render_rect.x;
        const render_offset_y = target.y - render_rect.y;

        const content_rect = Rect.of(
            viewport.x - render_offset_x,
            viewport.y - render_offset_y,
            Math.min(viewport.width + render_offset_x, render_rect.width),
            Math.min(viewport.height + render_offset_y, render_rect.height),
        )

        const has_more_x = content_rect.width < render_rect.width;
        const has_more_y = content_rect.height < render_rect.height;
        const more_top = render_rect.y + content_rect.height;
        const more_bottom = render_rect.y + render_rect.height;
        const more_width = ' '.repeat(render_rect.width - content_rect.width);
        const more_height = ' '.repeat(render_rect.width);

        let str = ANSI.move_to(render_rect.x, render_rect.y);
        let skip_span = 1;
        const clear_empty_str = clear_empty_color ? `${ANSI.reset}${ANSI.bg_rgb(clear_empty_color)}` : '';
        for (const { x, y, pixel, newline, endline } of this.buffer.iterate(content_rect.x, content_rect.y, content_rect.width, content_rect.height)) {
            if (newline) {
                str += ANSI.move_to(
                    render_rect.x + x + render_offset_x - content_rect.x,
                    render_rect.y + y + render_offset_y - content_rect.y,
                );
                // console.log(y, render_rect.y + y + render_offset_y - content_rect.y);
            }
            if (pixel === undefined) {
                str += `${clear_empty_str} `;
                skip_span = 0;
            }
            else {
                const styled_char = pixel.get_styled_text_content();
                const span = pixel.get_span();
                if (skip_span > 1) {
                    skip_span--;
                }
                else {
                    str += styled_char;
                    skip_span = span;
                }
            }
            if (endline) {
                if (has_more_x) str += `${clear_empty_str}${more_width}`;
                str += ANSI.reset;
                skip_span = 1;
            }
        }
        if (has_more_y) {
            for (let i = more_top; i < more_bottom; i++) {
                str += `${ANSI.move_to(render_rect.x, i)}${ANSI.reset}${clear_empty_str}${more_height}${ANSI.reset}`;
            }
        }

        this.rendered_content += str;
    }

    protected async end_render() {
        await new Promise((resolve) => this.stream.write(this.rendered_content, resolve as any));
        this.is_rendering = false;
        if (this.render_queued) {
            this.render_queued = false;
            this.queue_render();
        }
    }
}