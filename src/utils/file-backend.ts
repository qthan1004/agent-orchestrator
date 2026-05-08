import fs from 'fs';
import path from 'path';

/**
 * Ensures that a directory exists format.
 * @param dirPath - The directory path.
 * @returns True if successful, false otherwise.
 */
export function ensureDir(dirPath: string): boolean {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err: any) {
    console.error(`ensureDir error for ${dirPath}:`, err.message);
    return false;
  }
}

/**
 * Atomically writes content to a file by writing to a .tmp file first, then renaming.
 * @param filePath - Target file path.
 * @param content - Data to write.
 * @returns True if successful, false otherwise.
 */
export function atomicWrite(filePath: string, content: string): boolean {
  try {
    ensureDir(path.dirname(filePath));
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err: any) {
    console.error(`atomicWrite error for ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Reads JSON from a file.
 * @param filePath - Target file path.
 * @returns The parsed JSON or null if error.
 */
export function readJSON<T = any>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch (err: any) {
    console.error(`readJSON error for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Reads plain text from a file.
 * @param filePath - Target file path.
 * @returns The string content or null if error.
 */
export function readFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf8');
  } catch (err: any) {
    console.error(`readFile error for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Writes JSON atomically.
 * @param filePath - Target file path.
 * @param data - Data stringify.
 * @returns True if successful.
 */
export function writeJSON(filePath: string, data: any): boolean {
  try {
    return atomicWrite(filePath, JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error(`writeJSON error for ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Atomically moves a file.
 * @param from - Source path.
 * @param to - Destination path.
 * @returns boolean
 */
export function moveFile(from: string, to: string): boolean {
  try {
    if (!fs.existsSync(from)) return false;
    ensureDir(path.dirname(to));
    fs.renameSync(from, to);
    return true;
  } catch (err: any) {
    console.error(`moveFile error from ${from} to ${to}:`, err.message);
    return false;
  }
}

/**
 * Copies a file.
 * @param from - Source path.
 * @param to - Destination path.
 * @returns boolean
 */
export function copyFile(from: string, to: string): boolean {
  try {
    if (!fs.existsSync(from)) return false;
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
    return true;
  } catch (err: any) {
    console.error(`copyFile error from ${from} to ${to}:`, err.message);
    return false;
  }
}

/**
 * Lists files in a directory, optionally filtered by extension.
 * @param dirPath - The directory path.
 * @param ext - The extension (e.g., '.md', 'json').
 * @returns List of filenames or empty array.
 */
export function listFiles(dirPath: string, ext?: string): string[] {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath);
    if (!ext) return files;
    
    // Normalize extension to include dot if needed and support 'ext' or '.ext'
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return files.filter(f => f.endsWith(normalizedExt));
  } catch (err: any) {
    console.error(`listFiles error for ${dirPath}:`, err.message);
    return [];
  }
}

/**
 * Deletes a file.
 * @param filePath - The file to delete.
 * @returns True if successfully deleted.
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) return true; // already deleted
    fs.unlinkSync(filePath);
    return true;
  } catch (err: any) {
    console.error(`deleteFile error for ${filePath}:`, err.message);
    return false;
  }
}
