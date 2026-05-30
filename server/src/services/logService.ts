export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'email' | 'error';
  message: string;
  details?: string;
}

const MAX_ENTRIES = 200;
const logs: LogEntry[] = [];
let seq = 0;

export function pushLog(type: LogEntry['type'], message: string, details?: string): void {
  logs.unshift({ id: `log-${++seq}`, timestamp: new Date().toISOString(), type, message, details });
  if (logs.length > MAX_ENTRIES) logs.pop();
}

export function getLogs(): LogEntry[] {
  return [...logs];
}
