export const logger = {
  info: (msg: string, data?: any) => console.log(`ℹ️ ${msg}`, data),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err),
  warn: (msg: string, data?: any) => console.warn(`⚠️ ${msg}`, data),
  debug: (msg: string, data?: any) => console.log(`🐛 ${msg}`, data)
};
