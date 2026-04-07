/**
 * Token Optimization — Realistic Measurement v2
 * 
 * Mục đích: Mô phỏng sát thực tế nhất quy trình:
 *   1. Planner đọc plan `2026_04_07_implement_libs_breadcrumbs.md`
 *   2. Planner tham khảo skills/context/tools/workflows của dự án Personal-lib
 *   3. Planner decompose thành tasks (theo task-delegation template thực tế)
 *   4. So sánh 3 options khi worker nhận task
 * 
 * Usage: node dev-docs/scripts/token-measure.mjs
 */

import { z } from 'zod';

// ========================================================================
// SECTION 1: Realistic Planner Decomposition
// ========================================================================
// Planner đã đọc:
//   - .agent/context.md (project structure & conventions)
//   - .agent/skills/component-patterns/SKILL.md
//   - .agent/skills/styled-theme-convention/SKILL.md
//   - .agent/skills/testing-patterns/SKILL.md
//   - .agent/skills/task-delegation/SKILL.md + template.md
//   - .agent/workflows/create-lib.md (scaffold workflow)
//   - tools/gen-lib.sh, tools/git-setup-lib.sh
//   - Existing lib structure: libs/button/src/lib/ (Button/, models/, stories/)
//
// Plan content:
//   # @thanh-libs/breadcrumb
//   ## Components: Breadcrumb (separator, maxItems, itemsBeforeCollapse, itemsAfterCollapse)
//                  BreadcrumbItem (href, onClick, icon, active)
//   ## Phụ thuộc: @thanh-libs/theme
// ========================================================================

const WORKSPACE = '/home/administrator/back up/Personal lib';

// Realistic planner decomposition — following task-delegation template format
// Planner knows:
//   - gen-lib.sh scaffolds: package.json, vite.config.mts, tsconfig*, storybook, stories template
//   - Component structure: src/lib/ComponentName/index.tsx + styled.tsx, src/lib/models/index.ts
//   - Must use forwardRef, object style CSS, Styled suffix, useTheme()
//   - Must have vitest tests with ThemeProvider, jest-axe a11y
//   - create-lib workflow: 1) scaffold → 2) analysis & planning → 3) git setup → 4) verify build

const PLANNER_TASKS_REALISTIC = [
  {
    id: "01-scaffold-breadcrumb",
    module: "breadcrumb",
    title: "Scaffold breadcrumb library",
    action: `Run /create-lib workflow step 1: bash tools/gen-lib.sh breadcrumb`,
    what_to_do: `Execute \`bash tools/gen-lib.sh breadcrumb\` at workspace root to scaffold the library.
This generates: libs/breadcrumb/ with package.json, vite.config.mts, tsconfig.json, tsconfig.lib.json, tsconfig.spec.json, tsconfig.storybook.json, .storybook/preview.ts, .github/workflows/publish.yml, src/lib/stories/breadcrumb.stories.tsx, tests/setup.ts, check-deps.mjs.
After scaffold, run \`bash tools/git-setup-lib.sh breadcrumb\` to initialize git submodule.`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/package.json`,
      `${WORKSPACE}/libs/breadcrumb/vite.config.mts`,
      `${WORKSPACE}/libs/breadcrumb/tsconfig.json`,
      `${WORKSPACE}/libs/breadcrumb/src/index.ts`
    ],
    constraints: `Follow /create-lib workflow exactly. Do NOT implement any component code yet — this task is scaffold only.
Read skill: .agent/skills/strict-scope/SKILL.md`,
    verification: `ls libs/breadcrumb/package.json libs/breadcrumb/vite.config.mts libs/breadcrumb/tsconfig.json && echo "scaffold OK"`,
    done_criteria: [
      "libs/breadcrumb/ directory exists with all template files",
      "git submodule initialized",
      "No component code written yet"
    ],
    dependencies: "None"
  },
  {
    id: "02-models-types",
    module: "breadcrumb",
    title: "Define Breadcrumb types and models",
    action: "Create TypeScript interfaces for Breadcrumb and BreadcrumbItem props",
    what_to_do: `Create \`src/lib/models/index.ts\` with:

1. \`BreadcrumbProps\` extending \`HTMLAttributes<HTMLElement>\`:
   - separator?: ReactNode (default: '/')
   - maxItems?: number
   - itemsBeforeCollapse?: number (default: 1)
   - itemsAfterCollapse?: number (default: 1)
   - children: ReactNode

2. \`BreadcrumbItemProps\` extending \`HTMLAttributes<HTMLElement>\`:
   - href?: string
   - onClick?: () => void
   - icon?: ReactNode
   - active?: boolean

Add JSDoc to every prop. Research MUI Breadcrumbs, Ant Design Breadcrumb for API reference.`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/src/lib/models/index.ts`
    ],
    constraints: `Read skills:
- .agent/skills/component-patterns/SKILL.md (Models & Index section)
- .agent/skills/strict-scope/SKILL.md
Extend HTMLAttributes<HTMLElement>. Named exports only. JSDoc on every prop.`,
    verification: `cd libs/breadcrumb && npx tsc --noEmit`,
    done_criteria: [
      "BreadcrumbProps interface defined with all props + JSDoc",
      "BreadcrumbItemProps interface defined with all props + JSDoc",
      "TypeScript compilation passes"
    ],
    dependencies: "01-scaffold-breadcrumb"
  },
  {
    id: "03-breadcrumb-item",
    module: "breadcrumb",
    title: "Implement BreadcrumbItem component",
    action: "Create BreadcrumbItem with href, onClick, icon, active props following component-patterns",
    what_to_do: `Create \`src/lib/BreadcrumbItem/\` folder with:

1. \`index.tsx\`: forwardRef component that renders:
   - <a> when href provided
   - <button> when onClick provided (no href)  
   - <span> when neither
   - icon rendered before children when provided
   - aria-current="page" when active=true
   - Spread ...rest onto root element

2. \`styled.tsx\`: BreadcrumbItemStyled with:
   - Object style only, return CSSObject
   - Use useTheme() for palette/spacing access
   - ownerActive prop for active styling (distinct color, font-weight)
   - Hover effect on interactive items (link/button)
   - Remove default button styles when rendering as button`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/src/lib/BreadcrumbItem/index.tsx`,
      `${WORKSPACE}/libs/breadcrumb/src/lib/BreadcrumbItem/styled.tsx`
    ],
    constraints: `Read skills:
- .agent/skills/component-patterns/SKILL.md
- .agent/skills/styled-theme-convention/SKILL.md
MUST: forwardRef, displayName, Styled suffix, object style CSSObject, useTheme() (not theme arg).
WCAG: aria-current="page" on active, focus-visible on interactive, semantic HTML tags.`,
    verification: `cd libs/breadcrumb && npx tsc --noEmit`,
    done_criteria: [
      "BreadcrumbItem renders as a/button/span based on props",
      "Active state has aria-current='page' and distinct styling",
      "Icon renders before children",
      "Uses forwardRef + displayName",
      "Styled follows theme convention (useTheme, CSSObject, Styled suffix)"
    ],
    dependencies: "02-models-types"
  },
  {
    id: "04-breadcrumb-container",
    module: "breadcrumb",
    title: "Implement Breadcrumb container with collapse logic",
    action: "Create Breadcrumb container component with separator rendering and items collapse",
    what_to_do: `Create \`src/lib/Breadcrumb/\` folder with:

1. \`index.tsx\`: forwardRef component with <nav aria-label="breadcrumb"> wrapper:
   - Iterate children, insert separator between each item
   - Collapse logic when React.Children.count > maxItems:
     * Keep first itemsBeforeCollapse items
     * Show ellipsis indicator ("...") in the middle  
     * Keep last itemsAfterCollapse items
   - Separator default: "/" ReactNode

2. \`styled.tsx\`: BreadcrumbStyled + BreadcrumbSeparatorStyled:
   - <ol> based list layout (semantic HTML)
   - Flexbox with align-items: center
   - Separator styled with muted color from palette
   - Object style, CSSObject return type, useTheme()`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/src/lib/Breadcrumb/index.tsx`,
      `${WORKSPACE}/libs/breadcrumb/src/lib/Breadcrumb/styled.tsx`
    ],
    constraints: `Read skills:
- .agent/skills/component-patterns/SKILL.md
- .agent/skills/styled-theme-convention/SKILL.md
Semantic HTML: <nav> + <ol> + <li>. WCAG: aria-label on nav.
forwardRef, displayName. Collapse must handle edge cases (maxItems=0, children < maxItems).`,
    verification: `cd libs/breadcrumb && npx tsc --noEmit`,
    done_criteria: [
      "Breadcrumb renders children with separators",
      "Collapse works correctly when items > maxItems",
      "Uses semantic <nav>/<ol>/<li> structure",
      "forwardRef + displayName",
      "Styled follows conventions"
    ],
    dependencies: "02-models-types"
  },
  {
    id: "05-exports-stories",
    module: "breadcrumb",
    title: "Setup exports and Storybook stories",
    action: "Configure src/index.ts exports and create Storybook stories for both components",
    what_to_do: `1. Update \`src/index.ts\`:
   - export { Breadcrumb } from './lib/Breadcrumb';
   - export { BreadcrumbItem } from './lib/BreadcrumbItem';
   - export type { BreadcrumbProps, BreadcrumbItemProps } from './lib/models';

2. Update \`src/lib/stories/breadcrumb.stories.tsx\`:
   - Default story: basic breadcrumb with 3 items (Home > Products > Current)
   - WithIcons story: items with icons
   - Collapsed story: 8+ items with maxItems=5, showing collapse behavior
   - ActiveItem story: last item marked active
   - CustomSeparator story: using ">" or ChevronRight icon as separator
   - Wrap all stories in ThemeProvider`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/src/index.ts`,
      `${WORKSPACE}/libs/breadcrumb/src/lib/stories/breadcrumb.stories.tsx`
    ],
    constraints: `Read skill: .agent/skills/component-patterns/SKILL.md (Models & Index section).
Named exports only — no default exports. Export prop types for consumers.`,
    verification: `cd libs/breadcrumb && npx vite build`,
    done_criteria: [
      "All components and types exported from index.ts",
      "5+ Storybook stories covering main use cases",
      "vite build passes with exit code 0"
    ],
    dependencies: "03-breadcrumb-item, 04-breadcrumb-container"
  },
  {
    id: "06-unit-tests",
    module: "breadcrumb",
    title: "Write unit tests for Breadcrumb and BreadcrumbItem",
    action: "Create vitest tests with React Testing Library, jest-axe a11y checks",
    what_to_do: `Create test files following testing-patterns skill:

1. \`src/lib/BreadcrumbItem/BreadcrumbItem.spec.tsx\`:
   - renders as <a> when href provided
   - renders as <button> when onClick provided
   - renders as <span> when neither
   - shows icon before label
   - applies aria-current="page" when active
   - a11y: no violations (jest-axe)

2. \`src/lib/Breadcrumb/Breadcrumb.spec.tsx\`:
   - renders children with default separator "/"
   - renders with custom separator
   - collapses items when children > maxItems
   - respects itemsBeforeCollapse and itemsAfterCollapse
   - renders semantic <nav> with aria-label
   - a11y: no violations (jest-axe)

ALL tests MUST wrap in <ThemeProvider> from @thanh-libs/theme.`,
    files: [
      `${WORKSPACE}/libs/breadcrumb/src/lib/BreadcrumbItem/BreadcrumbItem.spec.tsx`,
      `${WORKSPACE}/libs/breadcrumb/src/lib/Breadcrumb/Breadcrumb.spec.tsx`
    ],
    constraints: `Read skill: .agent/skills/testing-patterns/SKILL.md
MUST: ThemeProvider wrapper, import describe/it/expect from vitest, jest-axe a11y test per component, userEvent for interactions.
Test files next to component (NOT in tests/ folder).`,
    verification: `cd libs/breadcrumb && npx vitest run --reporter=verbose`,
    done_criteria: [
      "BreadcrumbItem: 6+ test cases all passing",
      "Breadcrumb: 6+ test cases all passing",
      "a11y tests with jest-axe pass for both components",
      "All tests use ThemeProvider wrapper"
    ],
    dependencies: "05-exports-stories"
  }
];

const GRAPH_REALISTIC = {
  groups: [
    { group_id: 1, tasks: ["01-scaffold-breadcrumb"], depends_on: [] },
    { group_id: 2, tasks: ["02-models-types"], depends_on: [1] },
    { group_id: 3, tasks: ["03-breadcrumb-item", "04-breadcrumb-container"], depends_on: [2] },
    { group_id: 4, tasks: ["05-exports-stories"], depends_on: [3] },
    { group_id: 5, tasks: ["06-unit-tests"], depends_on: [4] }
  ]
};

// ========================================================================
// SECTION 2: Zod Schema behaviors
// ========================================================================

const TaskDefSchema = z.object({
  id: z.string().regex(/^\d{2}-[a-z0-9-]+$/, "id must be in XX-kebab-case format"),
  module: z.string(),
  action: z.string(),
  verification: z.string()
});

const TaskDefSchemaPassthrough = z.object({
  id: z.string().regex(/^\d{2}-[a-z0-9-]+$/, "id must be in XX-kebab-case format"),
  module: z.string(),
  action: z.string(),
  verification: z.string()
}).passthrough();

// ========================================================================
// SECTION 3: Token estimation (character-class based)
// ========================================================================

function estimateTokens(text) {
  const charCount = text.length;
  const jsonSyntaxCount = (text.match(/[{}[\]",:]/g) || []).length;
  const contentChars = charCount - jsonSyntaxCount;
  return Math.ceil(jsonSyntaxCount + (contentChars / 4));
}

// ========================================================================
// SECTION 4: Compact function
// ========================================================================

const STRIP_FIELDS = ['status', 'assigned_to', 'priority', 'metadata', 'dependencies', 'done_criteria'];

function compactTask(task) {
  if (!task) return task;
  const compact = {};
  for (const [key, value] of Object.entries(task)) {
    if (!STRIP_FIELDS.includes(key)) compact[key] = value;
  }
  return compact;
}

// ========================================================================
// SECTION 5: Measurement
// ========================================================================

console.log('='.repeat(80));
console.log('TOKEN OPTIMIZATION — REALISTIC MEASUREMENT v2');
console.log('Project: Personal-lib (@thanh-libs/breadcrumb)');
console.log('='.repeat(80));
console.log();

// --- Verify Zod strip ---
console.log('─'.repeat(60));
console.log('STEP 0: Zod 4 Strip Verification (realistic task data)');
console.log('─'.repeat(60));
console.log();

const sampleTask = PLANNER_TASKS_REALISTIC[3]; // 04-breadcrumb-container (rich content)
const zodStripped = TaskDefSchema.parse(sampleTask);
const zodFull = TaskDefSchemaPassthrough.parse(sampleTask);

console.log('  Sample task: 04-breadcrumb-container');
console.log('  Original fields:', Object.keys(sampleTask));
console.log('  After z.object().parse():', Object.keys(zodStripped));
console.log('  After z.object().passthrough().parse():', Object.keys(zodFull));
console.log();
console.log('  ⚠️  STRIPPED by Zod:', Object.keys(sampleTask).filter(k => !(k in zodStripped)));
console.log('  ✅  Preserved by passthrough:', Object.keys(zodFull).filter(k => !(k in zodStripped)));
console.log();

// --- Measure each task ---
console.log('─'.repeat(60));
console.log('STEP 1: Per-Task Token Measurement');
console.log('─'.repeat(60));
console.log();

let totalA = 0, totalA2 = 0, totalB = 0, totalC = 0;
const perTaskResults = [];

for (const task of PLANNER_TASKS_REALISTIC) {
  const stripped = TaskDefSchema.parse(task);
  const full = TaskDefSchemaPassthrough.parse(task);
  
  // Option A: Current (Zod stripped + status)
  const respA = JSON.stringify({
    action: "EXECUTE",
    task_id: task.id,
    task_details: { ...stripped, status: 'pending' },
    context: { group_id: 1, total_remaining: 5 }
  });
  
  // Option A2: Full inline with passthrough
  const respA2 = JSON.stringify({
    action: "EXECUTE",
    task_id: task.id,
    task_details: { ...full, status: 'pending' },
    context: { group_id: 1, total_remaining: 5 }
  });
  
  // Option B: File reference (ref) + view_file call + file content
  const respB_ref = JSON.stringify({
    action: "EXECUTE",
    task_id: task.id,
    task_file: `exchange/inbox/task-${task.id}.json`,
    context: { group_id: 1, total_remaining: 5 }
  });
  const respB_toolCall = JSON.stringify({
    tool: "view_file",
    arguments: { AbsolutePath: `/path/to/exchange/inbox/task-${task.id}.json` }
  });
  const respB_fileContent = JSON.stringify({ ...full, status: 'pending' }, null, 2);
  
  // Option C: Compact inline (passthrough + strip metadata)
  const respC = JSON.stringify({
    action: "EXECUTE",
    task_id: task.id,
    task_details: compactTask({ ...full, status: 'pending' }),
    context: { group_id: 1, total_remaining: 5 }
  });
  
  const tokA = estimateTokens(respA);
  const tokA2 = estimateTokens(respA2);
  const tokB = estimateTokens(respB_ref) + estimateTokens(respB_toolCall) + estimateTokens(respB_fileContent);
  const tokC = estimateTokens(respC);
  
  totalA += tokA;
  totalA2 += tokA2;
  totalB += tokB;
  totalC += tokC;
  
  perTaskResults.push({
    id: task.id,
    title: task.title,
    fieldsOriginal: Object.keys(task).length,
    fieldsStripped: Object.keys(stripped).length + 1, // +1 for status
    charsA: respA.length,
    charsA2: respA2.length,
    charsB: respB_ref.length + respB_toolCall.length + respB_fileContent.length,
    charsC: respC.length,
    tokA, tokA2, tokB, tokC
  });
}

// Print per-task table
console.log('┌─────────────────────────────┬───────┬───────┬───────┬───────┬────────┬────────┬────────┬────────┐');
console.log('│ Task                        │ Fields│ Zod   │ Tok A │ Tok A2│ Tok B  │ Tok C  │ Char A │ Char C │');
console.log('│                             │ Orig  │ Strip │(broke)│(full) │(file)  │(compct)│       │        │');
console.log('├─────────────────────────────┼───────┼───────┼───────┼───────┼────────┼────────┼────────┼────────┤');

for (const r of perTaskResults) {
  const id = r.id.padEnd(27);
  console.log(`│ ${id} │ ${String(r.fieldsOriginal).padStart(5)} │ ${String(r.fieldsStripped).padStart(5)} │ ${String(r.tokA).padStart(5)} │ ${String(r.tokA2).padStart(5)} │ ${String(r.tokB).padStart(6)} │ ${String(r.tokC).padStart(6)} │ ${String(r.charsA).padStart(6)} │ ${String(r.charsC).padStart(6)} │`);
}

console.log('├─────────────────────────────┼───────┼───────┼───────┼───────┼────────┼────────┼────────┼────────┤');
console.log(`│ ${'TOTAL (6 tasks)'.padEnd(27)} │       │       │ ${String(totalA).padStart(5)} │ ${String(totalA2).padStart(5)} │ ${String(totalB).padStart(6)} │ ${String(totalC).padStart(6)} │        │        │`);
console.log('└─────────────────────────────┴───────┴───────┴───────┴───────┴────────┴────────┴────────┴────────┘');
console.log();

// --- Quality comparison ---
console.log('─'.repeat(60));
console.log('STEP 2: Quality / Correctness — What Worker Actually Sees');
console.log('─'.repeat(60));
console.log();

// Show actual content for task 04 (most complex)
const taskExample = PLANNER_TASKS_REALISTIC[3];
const exStripped = { ...TaskDefSchema.parse(taskExample), status: 'pending' };
const exFull = { ...TaskDefSchemaPassthrough.parse(taskExample), status: 'pending' };
const exCompact = compactTask(exFull);

console.log('═══ OPTION A (Current — Zod stripped) ═══');
console.log(JSON.stringify({ action: "EXECUTE", task_id: taskExample.id, task_details: exStripped, context: { group_id: 3, total_remaining: 4 } }, null, 2));
console.log();
console.log('>>> Worker sees: id, module, action (1 line!), verification, status');
console.log('>>> MISSING: title, what_to_do (detailed instructions!), files (which files!), constraints (which skills!)');
console.log('>>> ❌ Worker CANNOT implement this task correctly');
console.log();

console.log('═══ OPTION C (Compact inline — RECOMMENDED) ═══');
console.log(JSON.stringify({ action: "EXECUTE", task_id: taskExample.id, task_details: exCompact, context: { group_id: 3, total_remaining: 4 } }, null, 2));
console.log();
console.log('>>> Worker sees: ALL planner fields. Knows exactly what to do, which files, which skills.');
console.log('>>> ✅ Worker CAN implement correctly');
console.log();

// --- Summary ---
console.log('─'.repeat(60));
console.log('STEP 3: Final Comparison Summary');
console.log('─'.repeat(60));
console.log();

console.log('                              Tokens   Chars    vs C    Correct?');
console.log('  ─────────────────────────────────────────────────────────────');
console.log(`  Option A  (Zod stripped):    ${String(totalA).padStart(6)}   ${String(perTaskResults.reduce((s,r) => s+r.charsA, 0)).padStart(6)}    ${((totalA/totalC*100)-100).toFixed(1).padStart(5)}%   ❌ BROKEN`);
console.log(`  Option A2 (Full inline):     ${String(totalA2).padStart(6)}   ${String(perTaskResults.reduce((s,r) => s+r.charsA2, 0)).padStart(6)}    ${((totalA2/totalC*100)-100).toFixed(1).padStart(5)}%   ✅ YES`);
console.log(`  Option B  (File reference):  ${String(totalB).padStart(6)}   ${String(perTaskResults.reduce((s,r) => s+r.charsB, 0)).padStart(6)}    ${((totalB/totalC*100)-100).toFixed(1).padStart(5)}%   ✅ YES`);
console.log(`  Option C  (Compact inline):  ${String(totalC).padStart(6)}   ${String(perTaskResults.reduce((s,r) => s+r.charsC, 0)).padStart(6)}    ${' base'.padStart(5)}    ✅ YES`);
console.log();

const savingsOverB = ((totalB - totalC) / totalB * 100).toFixed(1);
const savingsOverA2 = ((totalA2 - totalC) / totalA2 * 100).toFixed(1);
const costVsBroken = ((totalC - totalA) / totalA * 100).toFixed(1);

console.log(`  C saves ${savingsOverA2}% vs A2 (full inline)`);
console.log(`  C saves ${savingsOverB}% vs B (file reference)`);
console.log(`  C costs ${costVsBroken}% more than A (but A is BROKEN)`);
console.log();

// ========================================================================
// SECTION 6: "Can worker actually execute?" simulation
// ========================================================================

console.log('─'.repeat(60));
console.log('STEP 4: Worker Execution Ability Simulation');
console.log('─'.repeat(60));
console.log();

const taskForWorker = PLANNER_TASKS_REALISTIC[2]; // 03-breadcrumb-item

console.log('Task: 03-breadcrumb-item');
console.log();

// Simulate Option A — worker receives stripped task
const workerSeesA = { ...TaskDefSchema.parse(taskForWorker), status: 'pending' };
console.log('📋 OPTION A — Worker receives:');
console.log(`   id: ${workerSeesA.id}`);
console.log(`   module: ${workerSeesA.module}`);
console.log(`   action: "${workerSeesA.action}"`);
console.log(`   verification: "${workerSeesA.verification}"`);
console.log(`   status: ${workerSeesA.status}`);
console.log();
console.log('   🤔 Worker questions:');
console.log('      - Which files to create/modify? → UNKNOWN');
console.log('      - What is the detailed implementation spec? → Only 1 line in "action"');
console.log('      - Which skills/conventions to follow? → UNKNOWN');
console.log('      - Styled-component convention? useTheme? forwardRef? → NOT MENTIONED');
console.log('      - Accessibility requirements? → NOT MENTIONED');
console.log('   ❌ VERDICT: Worker will GUESS or ask user → likely wrong implementation');
console.log();

// Simulate Option C — worker receives compact
const workerSeesC = compactTask({ ...TaskDefSchemaPassthrough.parse(taskForWorker), status: 'pending' });
console.log('📋 OPTION C — Worker receives:');
console.log(`   id: ${workerSeesC.id}`);
console.log(`   module: ${workerSeesC.module}`);
console.log(`   title: "${workerSeesC.title}"`);
console.log(`   action: "${workerSeesC.action}"`);
console.log(`   what_to_do: "${workerSeesC.what_to_do.substring(0, 80)}..."`);
console.log(`   files: ${JSON.stringify(workerSeesC.files)}`);
console.log(`   constraints: "${workerSeesC.constraints.substring(0, 80)}..."`);
console.log(`   verification: "${workerSeesC.verification}"`);
console.log();
console.log('   ✅ Worker knows:');
console.log('      - Exactly which files to create: BreadcrumbItem/index.tsx + styled.tsx');
console.log('      - Detailed spec: forwardRef, renders as a/button/span, icon before children');
console.log('      - Skills to read: component-patterns, styled-theme-convention');
console.log('      - Accessibility: aria-current, focus-visible, semantic HTML');
console.log('   ✅ VERDICT: Worker can implement correctly without guessing');
console.log();

// ========================================================================
// CONCLUSIONS
// ========================================================================

console.log('='.repeat(80));
console.log('CONCLUSIONS (Realistic Data)');
console.log('='.repeat(80));
console.log();
console.log(`1. REALISTIC TASK SIZE: tasks contain 8-10 fields (not 4!)`);
console.log(`   Average task response: ~${Math.round(totalC/6)} tokens (Option C)`);
console.log(`   Total for 6 tasks plan: ${totalC} tokens (trivial vs 128K+ context window)`);
console.log();
console.log(`2. ZOD BUG IMPACT — much worse with realistic data:`);
console.log(`   Stripped fields contain THE ACTUAL IMPLEMENTATION INSTRUCTIONS`);
console.log(`   - what_to_do: multi-paragraph detailed spec`);
console.log(`   - files: exact paths worker needs to create/modify`);
console.log(`   - constraints: which skills to read, conventions to follow`);
console.log(`   Without these, worker is essentially blind.`);
console.log();
console.log(`3. TOKEN COST IS NOT THE ISSUE:`);
console.log(`   C costs +${costVsBroken}% more than broken A, but in absolute terms:`);
console.log(`   +${totalC - totalA} tokens total for 6 tasks = negligible`);
console.log(`   The "optimization" in Option A is an ACCIDENT (Zod stripping useful data)`);
console.log();
console.log(`4. RECOMMENDATION: Option C (compact inline)`);
console.log(`   - Fix: .passthrough() on TaskDefSchema`);
console.log(`   - Add: compactTask() to strip [${STRIP_FIELDS.join(', ')}]`);
console.log(`   - Apply at: get_next_task + complete_task auto-pickup`);
console.log(`   - Result: Worker gets all planner context, no wasted metadata`);
