"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spin = void 0;
const cli_color_1 = __importDefault(require("cli-color"));
const clc = cli_color_1.default;
const spinner = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏"
];
const length = spinner.length;
const spin = (total, suffix = '', option) => {
    if (!process.stdout.isTTY) {
        return;
    }
    const start = (option === null || option === void 0 ? void 0 : option.newline) !== true ? clc.move.lineBegin : '';
    const end = (option === null || option === void 0 ? void 0 : option.newline) === true ? "\n" : clc.move.lineBegin;
    if (typeof (option === null || option === void 0 ? void 0 : option.wrapper) === 'function')
        process.stdout.write(start + option.wrapper(spinner[total % length] + ' ' + suffix + end)); // +'\x033[0G');
    else
        process.stdout.write(start + spinner[total % length] + ' ' + suffix + end); // +'\x033[0G');
};
exports.spin = spin;
