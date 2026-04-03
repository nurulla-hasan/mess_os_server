export const authLogger = {
  info: (event: string, meta: object = {}) => {
    console.log(`[AUTH][INFO][${new Date().toISOString()}] ${event}`, JSON.stringify(meta));
  },
  warn: (event: string, meta: object = {}) => {
    console.warn(`[AUTH][WARN][${new Date().toISOString()}] ${event}`, JSON.stringify(meta));
  },
  error: (event: string, error: any, meta: object = {}) => {
    console.error(`[AUTH][ERROR][${new Date().toISOString()}] ${event}`, error?.message || error, JSON.stringify(meta));
  }
};
