import color from "cli-color";

const clc = color;

const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const length = spinner.length;

export type SpinOption = {
  wrapper: Function;
  newline: boolean;
};

export const spin = (total: number, suffix = "", option: SpinOption | void) => {
  if (!process.stdout.isTTY) {
    return;
  }
  const start = option?.newline !== true ? clc.move.lineBegin : "";
  const end = option?.newline === true ? "\n" : clc.move.lineBegin;
  if (typeof option?.wrapper === "function")
    process.stdout.write(
      start + option.wrapper(spinner[total % length] + " " + suffix + end),
    ); // +'\x033[0G');
  else
    process.stdout.write(start + spinner[total % length] + " " + suffix + end); // +'\x033[0G');
};
