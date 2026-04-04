import fs from 'fs';
import path from 'path';
import { ensureDir } from './file-backend.mjs';

export class Logger {
  /**
   * Initializes the Logger.
   * @param {string} logsDir - Directory where daily logs should be stored.
   */
  constructor(logsDir) {
    this.logsDir = logsDir;
    ensureDir(this.logsDir);
  }

  /**
   * Returns the current day's log file path (YYYY-MM-DD.md).
   * @returns {string}
   */
  getLogPath() {
    const d = new Date();
    // Use local time for YYYY-MM-DD instead of UTC if preferred, but ISODate is standard
    // YYYY-MM-DD
    const isoDate = d.toISOString().split('T')[0];
    return path.join(this.logsDir, `${isoDate}.md`);
  }

  /**
   * Appends an event entry immediately to the daily log file.
   * @param {string} event - The EVENT_TYPE (e.g. SERVER_START, ERROR)
   * @param {object} [data] - Key-value structure for logging details.
   */
  log(event, data = {}) {
    const d = new Date();
    // HH:MM:SS
    const timeString = d.toTimeString().split(' ')[0];
    
    let entry = `## ${timeString} — ${event}\n`;
    
    for (const [key, value] of Object.entries(data)) {
      // Stringify if it's an object/array, else simple string presentation
      const valStr = typeof value === 'object' ? JSON.stringify(value) : value;
      entry += `- ${key}: ${valStr}\n`;
    }
    
    entry += '\n';

    try {
      const logPath = this.getLogPath();
      // appendFileSync creates the file and appends
      fs.appendFileSync(logPath, entry, 'utf8');
    } catch (err) {
      console.error(`Logger error writing event ${event}:`, err.message);
    }
  }
}
