import color from 'cli-color';

const clc = color;

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

export const spin= (total : number, suffix = '', color = 'blue') => {
  if (process.stdout.isTTY) {
    process.stdout.write(clc.move.lineBegin + spinner[total%length]+' '+suffix);// +'\x033[0G');
  }
}
