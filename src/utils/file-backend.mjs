import fs from 'fs';
import path from 'path';

/**
 * Ensures that a directory exists format.
 * @param {string} dirPath - The directory path.
 * @returns {boolean} True if successful, false otherwise.
 */
export function ensureDir(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err) {
    console.error(`ensureDir error for ${dirPath}:`, err.message);
    return false;
  }
}

/**
 * Atomically writes content to a file by writing to a .tmp file first, then renaming.
 * @param {string} filePath - Target file path.
 * @param {string} content - Data to write.
 * @returns {boolean} True if successful, false otherwise.
 */
export function atomicWrite(filePath, content) {
  try {
    ensureDir(path.dirname(filePath));
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
    return true;
  } catch (err) {
    console.error(`atomicWrite error for ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Reads JSON from a file.
 * @param {string} filePath - Target file path.
 * @returns {object|null} The parsed JSON or null if error.
 */
export function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`readJSON error for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Writes JSON atomically.
 * @param {string} filePath - Target file path.
 * @param {object} data - Data stringify.
 * @returns {boolean} True if successful.
 */
export function writeJSON(filePath, data) {
  try {
    return atomicWrite(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`writeJSON error for ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Atomically moves a file.
 * @param {string} from - Source path.
 * @param {string} to - Destination path.
 * @returns {boolean}
 */
export function moveFile(from, to) {
  try {
    if (!fs.existsSync(from)) return false;
    ensureDir(path.dirname(to));
    fs.renameSync(from, to);
    return true;
  } catch (err) {
    console.error(`moveFile error from ${from} to ${to}:`, err.message);
    return false;
  }
}

/**
 * Lists files in a directory, optionally filtered by extension.
 * @param {string} dirPath - The directory path.
 * @param {string} [ext] - The extension (e.g., '.md', 'json').
 * @returns {string[]} List of filenames or empty array.
 */
export function listFiles(dirPath, ext) {
  try {
    if (!fs.existsSync(dirPath)) return [];
    const files = fs.readdirSync(dirPath);
    if (!ext) return files;
    
    // Normalize extension to include dot if needed and support 'ext' or '.ext'
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return files.filter(f => f.endsWith(normalizedExt));
  } catch (err) {
    console.error(`listFiles error for ${dirPath}:`, err.message);
    return [];
  }
}

/**
 * Deletes a file.
 * @param {string} filePath - The file to delete.
 * @returns {boolean} True if successfully deleted.
 */
export function deleteFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return true; // already deleted
    fs.unlinkSync(filePath);
    return true;
  } catch (err) {
    console.error(`deleteFile error for ${filePath}:`, err.message);
    return false;
  }
}
