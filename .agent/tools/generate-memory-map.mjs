import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Parse command line arguments
const args = process.argv.slice(2);
let entryParam = '';
let outputParam = '';
let htmlParam = '';
let coreParam = '';
let nameParam = '';

args.forEach(arg => {
  if (arg.startsWith('--entry=')) entryParam = arg.substring('--entry='.length);
  if (arg.startsWith('--output=')) outputParam = arg.substring('--output='.length);
  if (arg.startsWith('--html=')) htmlParam = arg.substring('--html='.length);
  if (arg.startsWith('--core=')) coreParam = arg.substring('--core='.length);
  if (arg.startsWith('--name=')) nameParam = arg.substring('--name='.length);
});

// 1. Resolve Project Name
let projectName = nameParam;
if (!projectName) {
  if (fs.existsSync('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      if (pkg.name) projectName = pkg.name;
    } catch (e) {
      // Ignore parse errors
    }
  }
  if (!projectName) {
    projectName = path.basename(process.cwd());
  }
}

// 2. Resolve entrypoint dynamically
let entrypoint = entryParam;
if (!entrypoint) {
  const potentialEntries = [
    'src/index.ts',
    'src/main.ts',
    'src/index.js',
    'src/main.js',
    'src/app.ts',
    'src/app.js',
    'index.ts',
    'index.js',
    'main.ts',
    'main.js'
  ];
  for (const p of potentialEntries) {
    if (fs.existsSync(p)) {
      entrypoint = p;
      break;
    }
  }
  // If still not found, check standard folders
  if (!entrypoint) {
    if (fs.existsSync('src') && fs.statSync('src').isDirectory()) {
      entrypoint = 'src';
    } else if (fs.existsSync('lib') && fs.statSync('lib').isDirectory()) {
      entrypoint = 'lib';
    } else {
      entrypoint = '.';
    }
  }
}

// 3. Resolve target outputs and ensure folders exist
let WORKSPACE_MEMORY_PATH = outputParam || '.agent/workspace-memory.md';
let htmlPath = htmlParam || '.agent/codebase-map.html';

try {
  const memoryDir = path.dirname(WORKSPACE_MEMORY_PATH);
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
} catch (e) {
  console.warn(`⚠️ Warning: Could not create folder for output. Saving memory map to local folder.`);
  WORKSPACE_MEMORY_PATH = 'workspace-memory.md';
}

try {
  const htmlDir = path.dirname(htmlPath);
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }
} catch (e) {
  console.warn(`⚠️ Warning: Could not create folder for output. Saving HTML map to local folder.`);
  htmlPath = 'codebase-map.html';
}

console.log(`🔄 Starting codebase dependency scan for "${projectName}" using Madge...`);
console.log(`🎯 Targeted entrypoint: ${entrypoint}`);

try {
  // Check if madge is available in local node_modules
  let madgeCmd = 'npx madge';
  try {
    const localMadge = path.join('node_modules', '.bin', 'madge');
    if (fs.existsSync(localMadge)) {
      madgeCmd = `"${localMadge}"`;
    }
  } catch (e) {}

  // Run Madge to get JSON dependencies (including npm dependencies)
  console.log('🔍 Scanning file relations and libraries (madge)...');
  let madgeJsonRaw = '';
  try {
    madgeJsonRaw = execSync(
      `${madgeCmd} --json --include-npm "${entrypoint}"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (err) {
    // If standard local command failed, try global madge command
    try {
      madgeJsonRaw = execSync(
        `madge --json --include-npm "${entrypoint}"`,
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (err2) {
      console.error('\n❌ ERROR: "madge" utility could not be executed.');
      console.error('This tool requires madge. Please install it globally or locally in the project:');
      console.error('   👉 npm install --save-dev madge');
      console.error('   👉 npm install -g madge\n');
      process.exit(1);
    }
  }

  const dependencies = JSON.parse(madgeJsonRaw || '{}');

  // Classify local vs external npm dependencies
  const localFiles = new Set(Object.keys(dependencies));
  const fileLocalDeps = {};
  const fileNpmDeps = {};
  const allUsedNpmLibs = new Set();

  Object.entries(dependencies).forEach(([file, deps]) => {
    fileLocalDeps[file] = [];
    fileNpmDeps[file] = [];
    deps.forEach(dep => {
      if (localFiles.has(dep)) {
        fileLocalDeps[file].push(dep);
      } else {
        // If it points inside node_modules (which madge often does for types/packages)
        let cleanLibName = dep;
        if (dep.includes('node_modules/')) {
          const parts = dep.split('node_modules/');
          const relativeToNodeModules = parts[parts.length - 1];
          if (relativeToNodeModules.startsWith('@')) {
            const scopeParts = relativeToNodeModules.split('/');
            if (scopeParts.length >= 2) {
              cleanLibName = `${scopeParts[0]}/${scopeParts[1]}`;
            } else {
              cleanLibName = scopeParts[0];
            }
          } else {
            cleanLibName = relativeToNodeModules.split('/')[0];
          }
        } else {
          // Fallback parsing for direct module imports
          if (dep.startsWith('@')) {
            const parts = dep.split('/');
            if (parts.length >= 2) {
              cleanLibName = `${parts[0]}/${parts[1]}`;
            }
          } else if (dep.includes('/')) {
            // Filter out relative path parts like '..', '.', etc.
            const parts = dep.split('/');
            const firstValidPart = parts.find(p => p !== '..' && p !== '.' && p !== '');
            cleanLibName = firstValidPart || dep;
          }
        }
        
        // Remove trailing types declarations extensions if any (e.g. '.d.ts', '.d.cts', etc.)
        cleanLibName = cleanLibName.replace(/\.d\.[cm]?ts$/, '');

        // Make sure it's not a relative path or garbage that leaked through
        if (cleanLibName !== '..' && cleanLibName !== '.' && cleanLibName !== '') {
          fileNpmDeps[file].push(cleanLibName);
          allUsedNpmLibs.add(cleanLibName);
        }
      }
    });
    // Remove duplicates
    fileNpmDeps[file] = [...new Set(fileNpmDeps[file])];
  });

  // Run Madge to get circular dependencies
  console.log('🔄 Checking for circular dependencies...');
  let circularOutput = '';
  let circularError = '';
  try {
    circularOutput = execSync(
      `${madgeCmd} --circular "${entrypoint}"`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (err) {
    // Madge returns exit code 1 if circular dependencies are found. That is expected!
    circularOutput = err.stdout || '';
    circularError = err.stderr || '';
  }

  // Parse circular dependencies
  const circularDeps = [];
  const combinedOutput = circularOutput + '\n' + circularError;
  const lines = combinedOutput.split('\n');
  for (const line of lines) {
    if (line.includes('>')) {
      const cleanLine = line.replace(/^\d+\)\s*/, '').trim();
      if (cleanLine) {
        circularDeps.push(cleanLine);
      }
    }
  }

  // Resolve core module keywords dynamically
  let coreKeywords = [];
  if (coreParam) {
    coreKeywords = coreParam.split(',').map(s => s.trim());
  } else if (Object.keys(fileLocalDeps).length > 0) {
    // Auto-discover the top connected files in the codebase as the "core flow" nodes
    const fileWeights = {};
    Object.entries(fileLocalDeps).forEach(([file, deps]) => {
      fileWeights[file] = (fileWeights[file] || 0) + deps.length;
      deps.forEach(dep => {
        fileWeights[dep] = (fileWeights[dep] || 0) + 1;
      });
    });
    // Sort by connection count descending
    const sortedFiles = Object.entries(fileWeights)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Take the top 8 most connected files
    const topFiles = sortedFiles.slice(0, Math.min(8, sortedFiles.length));
    coreKeywords = topFiles.map(file => path.basename(file));
    
    // Always ensure the base name of the entrypoint file is included
    const entryBase = path.basename(entrypoint);
    if (!coreKeywords.includes(entryBase)) {
      coreKeywords.push(entryBase);
    }
  }
  
  if (coreKeywords.length > 0) {
    console.log(`⚙️ Identified core architectural modules: ${coreKeywords.join(', ')}`);
  } else {
    console.log('⚙️ No modules found to identify core architecture.');
  }

  // Process data for folder-level graph
  const folderConnections = new Set();
  const folderModules = {};

  Object.entries(fileLocalDeps).forEach(([file, deps]) => {
    const fileFolder = file.includes('/') ? file.split('/')[0] : 'root';
    if (!folderModules[fileFolder]) {
      folderModules[fileFolder] = new Set();
    }
    folderModules[fileFolder].add(file);

    deps.forEach(dep => {
      const depFolder = dep.includes('/') ? dep.split('/')[0] : 'root';
      if (fileFolder !== depFolder) {
        folderConnections.add(`${fileFolder} --> ${depFolder}`);
      }
    });
  });

  // Generate Folder-Level Mermaid Graph
  let folderMermaid = '```mermaid\nflowchart TD\n';
  if (Object.keys(folderModules).length > 0) {
    Object.keys(folderModules).forEach(folder => {
      folderMermaid += `  ${folder}["📁 ${folder}"]\n`;
    });
    folderConnections.forEach(conn => {
      folderMermaid += `  ${conn}\n`;
    });
  } else {
    folderMermaid += '  empty["📁 (Empty Folder)"]\n';
  }
  folderMermaid += '```';

  // Filter for Core Modules Relationship Graph (including beautiful styled NPM library nodes!)
  const coreConnections = [];
  const coreNodes = new Set();
  const coreNpmNodes = new Set();

  Object.entries(fileLocalDeps).forEach(([file, deps]) => {
    const isFileCore = coreKeywords.some(kw => file.includes(kw));
    if (isFileCore) {
      const cleanFile = file.replace(/\.(ts|js)$/, '');
      coreNodes.add(cleanFile);
      
      // Draw local core links
      deps.forEach(dep => {
        const isDepCore = coreKeywords.some(kw => dep.includes(kw));
        if (isDepCore) {
          const cleanDep = dep.replace(/\.(ts|js)$/, '');
          coreNodes.add(cleanDep);
          coreConnections.push(`  ${cleanFile.replace(/[^a-zA-Z0-9_]/g, '_')} --> ${cleanDep.replace(/[^a-zA-Z0-9_]/g, '_')}`);
        }
      });

      // Draw links to external libraries used by this core module
      const npmDeps = fileNpmDeps[file] || [];
      npmDeps.forEach(npmLib => {
        const cleanLibId = 'npm_' + npmLib.replace(/[^a-zA-Z0-9_]/g, '_');
        coreNpmNodes.add(npmLib);
        coreConnections.push(`  ${cleanFile.replace(/[^a-zA-Z0-9_]/g, '_')} -.-> ${cleanLibId}`);
      });
    }
  });

  let coreMermaid = '```mermaid\nflowchart LR\n';
  coreMermaid += '  classDef coreFile fill:#1E1B4B,stroke:#6366F1,stroke-width:2px,color:#E0E7FF;\n';
  coreMermaid += '  classDef externalLib fill:#311042,stroke:#A78BFA,stroke-width:2px,stroke-dasharray: 5 5,color:#F3E8FF;\n\n';

  // Declare local Core Nodes
  coreNodes.forEach(node => {
    const cleanId = node.replace(/[^a-zA-Z0-9_]/g, '_');
    coreMermaid += `  ${cleanId}["📄 ${node}"]:::coreFile\n`;
  });

  // Declare external NPM Nodes
  coreNpmNodes.forEach(npmLib => {
    const cleanLibId = 'npm_' + npmLib.replace(/[^a-zA-Z0-9_]/g, '_');
    coreMermaid += `  ${cleanLibId}["📦 ${npmLib}"]:::externalLib\n`;
  });

  // Declare links
  coreConnections.forEach(conn => {
    coreMermaid += conn + '\n';
  });
  coreMermaid += '```';

  // Format Circular Dependencies section
  let circularDepsSection = '';
  if (circularDeps.length > 0) {
    circularDepsSection += `> [!WARNING]\n> **Found ${circularDeps.length} Circular Dependencies!** These should be resolved to maintain strict domain boundaries.\n\n`;
    circularDeps.forEach((dep, idx) => {
      circularDepsSection += `${idx + 1}. \`${dep}\`\n`;
    });
  } else {
    circularDepsSection += `> [!NOTE]\n> **Clean architecture!** No circular dependencies found.\n`;
  }

  // Format Complete File Directory (collapsible details block)
  let fileListMarkdown = '<details>\n<summary>🔍 Click to view full module relations directory</summary>\n\n';
  fileListMarkdown += '| Source File | Local Dependencies | External Libraries Used (NPM) |\n| :--- | :--- | :--- |\n';
  Object.entries(fileLocalDeps).forEach(([file, deps]) => {
    const depList = deps.length > 0 ? deps.map(d => `\`${d}\``).join(', ') : '_None_';
    const npmList = fileNpmDeps[file] && fileNpmDeps[file].length > 0 
      ? fileNpmDeps[file].map(d => `\`${d}\``).join(', ') 
      : '_None_';
    fileListMarkdown += '| `' + file + '` | ' + depList + ' | ' + npmList + ' |\n';
  });
  fileListMarkdown += '\n</details>';

  // Build the complete Dependency Map section
  const dependencySection = `
<!-- START_DEPENDENCY_MAP -->
## Codebase Relation Map (Auto-generated)

*This section is dynamically generated by codebase scanner.*

### 📂 High-level Domain Dependencies
${folderMermaid}

### ⚙️ Core Modules Flow
${coreMermaid}

### 🔄 Circular Dependencies Analysis
${circularDepsSection}

### 📦 Complete Codebase Directory
${fileListMarkdown}
<!-- END_DEPENDENCY_MAP -->
`;

  // Inject or append to target memory file
  let memoryContent = '';
  if (fs.existsSync(WORKSPACE_MEMORY_PATH)) {
    memoryContent = fs.readFileSync(WORKSPACE_MEMORY_PATH, 'utf-8');
  } else {
    memoryContent = `# Workspace Memory — ${projectName}\n\n`;
  }

  const startMarker = '<!-- START_DEPENDENCY_MAP -->';
  const endMarker = '<!-- END_DEPENDENCY_MAP -->';

  const startIndex = memoryContent.indexOf(startMarker);
  const endIndex = memoryContent.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    console.log(`📝 Updating existing dependency map in ${WORKSPACE_MEMORY_PATH}...`);
    memoryContent =
      memoryContent.substring(0, startIndex) +
      dependencySection.trim() +
      memoryContent.substring(endIndex + endMarker.length);
  } else {
    console.log(`➕ Appending dependency map to ${WORKSPACE_MEMORY_PATH}...`);
    memoryContent = memoryContent.trim() + '\n\n' + dependencySection.trim() + '\n';
  }

  // Generate HTML Map
  console.log(`🌐 Generating interactive HTML map (${htmlPath})...`);
  const folderMermaidCode = folderMermaid.replace('```mermaid\n', '').replace('```', '');
  const coreMermaidCode = coreMermaid.replace('```mermaid\n', '').replace('```', '');

  // Format circular deps as HTML list items
  let circularHtml = '';
  if (circularDeps.length > 0) {
    let listItems = '';
    for (const dep of circularDeps) {
      const nodes = dep.split(' > ');
      const nodesHtml = nodes.map(p => `<span class="path-node">${p}</span>`).join(' <span class="arrow">&rarr;</span> ');
      listItems += `
          <li>
            <span class="loop-icon">🔄</span>
            <span class="loop-path">${nodesHtml}</span>
          </li>`;
    }
    circularHtml = `
      <div class="alert-card warning">
        <div class="alert-icon">⚠️</div>
        <div class="alert-body">
          <h3>Found ${circularDeps.length} Circular Dependencies!</h3>
          <p>These dependency loops should be refactored to maintain clean architectural boundaries.</p>
        </div>
      </div>
      <ul class="circular-list">
        ${listItems}
      </ul>
    `;
  } else {
    circularHtml = `
      <div class="alert-card success">
        <div class="alert-icon">✅</div>
        <div class="alert-body">
          <h3>Clean Architecture!</h3>
          <p>No circular dependencies detected in the codebase.</p>
        </div>
      </div>
    `;
  }

  // Format directory rows as HTML
  let directoryRowsHtml = '';
  for (const [file, deps] of Object.entries(fileLocalDeps)) {
    const depBadges = deps.length > 0 
      ? deps.map(d => `<span class="dep-badge">${d}</span>`).join('') 
      : '<span class="dep-badge none">None</span>';
    
    const npmDeps = fileNpmDeps[file] || [];
    const npmBadges = npmDeps.length > 0
      ? npmDeps.map(d => `<span class="npm-badge">${d}</span>`).join('')
      : '<span class="npm-badge none">None</span>';

    directoryRowsHtml += `
      <tr class="searchable-row" data-file="${file.toLowerCase()}" data-deps="${deps.join(' ').toLowerCase()} ${npmDeps.join(' ').toLowerCase()}">
        <td class="file-name">📄 ${file}</td>
        <td class="dependencies-cell">${depBadges}</td>
        <td class="dependencies-cell">${npmBadges}</td>
      </tr>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} — Codebase Relation Map</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        background: '#141A2E',
        primaryColor: '#7C3AED',
        primaryTextColor: '#E0E7FF',
        lineColor: '#6366F1'
      }
    });
  </script>
  <style>
    :root {
      --bg-main: #0B0F19;
      --bg-card: rgba(20, 26, 46, 0.6);
      --border-color: rgba(99, 102, 241, 0.2);
      --text-main: #E2E8F0;
      --text-muted: #94A3B8;
      --primary: #7C3AED;
      --primary-hover: #6D28D9;
      --accent: #4F46E5;
      --warning: #F59E0B;
      --success: #10B981;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--bg-main);
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(79, 70, 229, 0.08) 0%, transparent 40%);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
      position: relative;
    }

    header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.05em;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #A78BFA 0%, #818CF8 50%, #6366F1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    /* Tabs Layout */
    .tabs-nav {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 30px;
      background: rgba(15, 23, 42, 0.4);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
      backdrop-filter: blur(8px);
    }

    .tab-btn {
      padding: 10px 20px;
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-muted);
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .tab-btn:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }

    .tab-btn.active {
      color: #FFF;
      background: var(--primary);
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
    }

    /* Glass Card styling */
    .card {
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border-color);
      padding: 30px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      min-height: 500px;
      position: relative;
    }

    .tab-content {
      display: block;
      visibility: hidden;
      position: absolute;
      pointer-events: none;
      width: 100%;
      height: 0;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s;
    }

    .tab-content.active {
      visibility: visible;
      position: relative;
      pointer-events: auto;
      height: auto;
      opacity: 1;
    }

    /* Graph Specifics - Figma style Canvas */
    .mermaid-wrapper {
      background: rgba(15, 23, 42, 0.6);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
      cursor: grab;
      user-select: none;
      height: 650px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .mermaid-wrapper:active {
      cursor: grabbing;
    }

    .mermaid-canvas {
      transition: transform 0.08s ease-out;
      transform-origin: center center;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* Floating Zoom Controls */
    .zoom-controls {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 6px;
      background: rgba(15, 23, 42, 0.85);
      padding: 6px;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
      z-index: 10;
    }

    .zoom-btn {
      width: 36px;
      height: 36px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
      color: #FFF;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .zoom-btn:hover {
      background: var(--primary);
      border-color: var(--primary);
      box-shadow: 0 0 8px rgba(124, 58, 237, 0.4);
    }

    /* Alert styles */
    .alert-card {
      display: flex;
      gap: 16px;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid;
    }

    .alert-card.warning {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.3);
      color: #FBBF24;
    }

    .alert-card.success {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34D399;
    }

    .alert-icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    .alert-body h3 {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .alert-body p {
      font-size: 0.95rem;
      opacity: 0.85;
    }

    /* Circular list */
    .circular-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .circular-list li {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 16px 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 14px;
      transition: background 0.2s;
    }

    .circular-list li:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .loop-icon {
      color: var(--warning);
      font-size: 1.1rem;
    }

    .loop-path {
      font-family: monospace;
      font-size: 0.95rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .path-node {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
      color: #FBBF24;
    }

    .arrow {
      color: var(--text-muted);
    }

    /* Search & Directory Table */
    .search-box {
      margin-bottom: 24px;
      position: relative;
    }

    .search-input {
      width: 100%;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px 20px;
      color: #FFF;
      font-size: 1rem;
      transition: all 0.3s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 12px rgba(124, 58, 237, 0.15);
    }

    .directory-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.95rem;
    }

    .directory-table th, .directory-table td {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .directory-table th {
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .directory-table tr {
      transition: background 0.15s;
    }

    .directory-table tbody tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .file-name {
      font-weight: 500;
      font-family: monospace;
      color: #818CF8;
    }

    .dependencies-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dep-badge {
      font-family: monospace;
      font-size: 0.8rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      color: #CBD5E1;
    }

    .dep-badge.none {
      background: rgba(255, 255, 255, 0.02);
      border-style: dashed;
      color: var(--text-muted);
    }

    .npm-badge {
      font-family: monospace;
      font-size: 0.8rem;
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.25);
      padding: 2px 8px;
      border-radius: 4px;
      color: #A78BFA;
    }

    .npm-badge.none {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-style: dashed;
      color: var(--text-muted);
    }

    /* Scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
    }

    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${projectName}</h1>
      <p>Interactive Codebase Dependency Map & Relations</p>
    </header>

    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab(event, 'folder-tab')">📂 Folder Graph</button>
      <button class="tab-btn" onclick="switchTab(event, 'core-tab')">⚙️ Core Flow</button>
      <button class="tab-btn" onclick="switchTab(event, 'circular-tab')">🔄 Circular Dependencies</button>
      <button class="tab-btn" onclick="switchTab(event, 'directory-tab')">📦 Module Directory</button>
    </div>

    <div class="card">
      <!-- Folder Graph -->
      <div id="folder-tab" class="tab-content active">
        <div class="mermaid-wrapper" id="folder-wrapper">
          <div class="mermaid-canvas" id="folder-canvas">
            <div class="mermaid">
              ${folderMermaidCode.trim()}
            </div>
          </div>
        </div>
      </div>

      <!-- Core Module Flow -->
      <div id="core-tab" class="tab-content">
        <div class="mermaid-wrapper" id="core-wrapper">
          <div class="mermaid-canvas" id="core-canvas">
            <div class="mermaid">
              ${coreMermaidCode.trim()}
            </div>
          </div>
        </div>
      </div>

      <!-- Circular Dependencies -->
      <div id="circular-tab" class="tab-content">
        ${circularHtml.trim()}
      </div>

      <!-- Module Directory -->
      <div id="directory-tab" class="tab-content">
        <div class="search-box">
          <input type="text" id="search-input" class="search-input" placeholder="Search modules or dependencies..." onkeyup="filterDirectory()">
        </div>
        <table class="directory-table">
          <thead>
            <tr>
              <th>Module File</th>
              <th>Local Dependencies</th>
              <th>External Libraries Used (NPM)</th>
            </tr>
          </thead>
          <tbody id="directory-body">
            ${directoryRowsHtml.trim()}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    function switchTab(evt, tabId) {
      // Hide all tabs
      const contents = document.querySelectorAll('.tab-content');
      contents.forEach(content => content.classList.remove('active'));

      // Deactivate all buttons
      const buttons = document.querySelectorAll('.tab-btn');
      buttons.forEach(btn => btn.classList.remove('active'));

      // Show current tab and activate button
      document.getElementById(tabId).classList.add('active');
      evt.currentTarget.classList.add('active');

      // Re-trigger layout if needed
      if (tabId === 'folder-tab' || tabId === 'core-tab') {
        window.dispatchEvent(new Event('resize'));
      }
    }

    function filterDirectory() {
      const input = document.getElementById('search-input');
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll('.searchable-row');

      rows.forEach(row => {
        const file = row.getAttribute('data-file');
        const deps = row.getAttribute('data-deps');
        if (file.includes(filter) || deps.includes(filter)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    function setupZoomPan(wrapperId, canvasSelector) {
      const wrapper = document.getElementById(wrapperId);
      const canvas = document.querySelector(canvasSelector);
      if (!wrapper || !canvas) return;

      let isDragging = false;
      let startX, startY;
      let translateX = 0, translateY = 0;
      let scale = 1;

      // Reset transform origin
      canvas.style.transformOrigin = 'center center';
      canvas.style.transition = 'transform 0.05s ease-out';

      function updateTransform() {
        canvas.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
      }

      // Drag to Pan
      wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Left click only
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        wrapper.style.cursor = 'grabbing';
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
        wrapper.style.cursor = 'grab';
      });

      wrapper.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      });

      // Mouse Wheel to Zoom
      wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 0.06;
        if (e.deltaY < 0) {
          scale = Math.min(scale + zoomFactor, 5);
        } else {
          scale = Math.max(scale - zoomFactor, 0.15);
        }
        updateTransform();
      }, { passive: false });

      // Add Zoom Controls
      const controls = document.createElement('div');
      controls.className = 'zoom-controls';
      
      const zoomInBtn = document.createElement('button');
      zoomInBtn.className = 'zoom-btn';
      zoomInBtn.innerHTML = '➕';
      zoomInBtn.title = 'Zoom In';
      zoomInBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scale = Math.min(scale + 0.25, 5);
        updateTransform();
      });

      const zoomOutBtn = document.createElement('button');
      zoomOutBtn.className = 'zoom-btn';
      zoomOutBtn.innerHTML = '➖';
      zoomOutBtn.title = 'Zoom Out';
      zoomOutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scale = Math.max(scale - 0.25, 0.15);
        updateTransform();
      });

      const resetBtn = document.createElement('button');
      resetBtn.className = 'zoom-btn';
      resetBtn.innerHTML = '🔄';
      resetBtn.title = 'Reset View';
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        scale = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
      });

      controls.appendChild(zoomInBtn);
      controls.appendChild(zoomOutBtn);
      controls.appendChild(resetBtn);
      wrapper.appendChild(controls);
    }

    window.addEventListener('load', () => {
      // Mermaid initializes on load, wait a brief moment for rendering
      setTimeout(() => {
        setupZoomPan('folder-wrapper', '#folder-canvas');
        setupZoomPan('core-wrapper', '#core-canvas');
      }, 800);
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
  console.log(`✅ Interactive HTML relation map successfully written to ${htmlPath}!`);

  fs.writeFileSync(WORKSPACE_MEMORY_PATH, memoryContent, 'utf-8');
  console.log(`✅ Codebase relation map successfully written to ${WORKSPACE_MEMORY_PATH}!`);

} catch (error) {
  console.error('❌ Error generating memory map:', error.stack || error.message);
  if (error.stdout) console.error('stdout:', error.stdout);
  if (error.stderr) console.error('stderr:', error.stderr);
  process.exit(1);
}
