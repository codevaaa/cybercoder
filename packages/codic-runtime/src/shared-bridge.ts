export { SecretScanner } from '../../shared/src/secret-scanner.js';

type Logger = {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  child: (scope: string) => Logger;
};

/** Keep the shared CLI logger out of the desktop bundle and avoid writing project data to CLI logs. */
export function createLogger(_scope: string): Logger {
  const noop = () => undefined;
  return { debug: noop, info: noop, warn: noop, error: noop, child: (scope) => createLogger(scope) };
}
