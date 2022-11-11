/**
 * What info we need to read actions from Proca action queue?
 * */

export type Configuration = {
  url: string  // the URL of queue server
  queue: string // the queue name
};


// our default queue server
export const DEFAULT_URL = "amqps://api.proca.app";

