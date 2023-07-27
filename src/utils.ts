export const string2map = (string: string)  => { //: Record<String, any> =>  {
  const urlSearchParams = new URLSearchParams(string);
  const params = Object.fromEntries(urlSearchParams.entries());

  return params;
}
