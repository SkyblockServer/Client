export type ClientEvents = {
  debug(type: 'log' | 'warn' | 'error' | 'debug', ...data: any[]): void;
};
