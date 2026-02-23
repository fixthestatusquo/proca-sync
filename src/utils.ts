export const pause = (time: number | undefined): Promise<any> => {
  const min = !time || time >= 7 ? 7 : time / 2;
  const max = time || 42; // wait between min and max
  time = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
  //  console.log("waiting", time / 1000);
  return new Promise((resolve) => setTimeout(() => resolve(time), time));
};

export const string2map = (string: string): Record<string, string> => {
  const urlSearchParams = new URLSearchParams(string);
  const params = Object.fromEntries(urlSearchParams.entries());

  return params;
};
