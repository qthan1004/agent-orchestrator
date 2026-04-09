# Task M01: TypeScript Infrastructure Setup

## Info
- **ID:** M01-ts-infra-setup
- **Module:** project config
- **Group:** 1 (Migration Foundation)
- **Dependencies:** none
- **Priority:** 1
- **Ref:** `dev-docs/migrate-to-typescript.md` — Phase 1

## What to do

Setup TypeScript tooling cho project. Không đổi bất kỳ `.mjs` file nào.

### 1. [NEW] `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests", "exchange", "plan", "tasks"]
}
```

### 2. [MODIFY] `package.json`

```diff
- "version": "0.1.0",
+ "version": "0.2.0",

  "scripts": {
-   "serve": "node src/index.mjs serve"
+   "dev": "tsx src/index.ts serve",
+   "build": "tsc",
+   "serve": "node dist/index.js serve",
+   "typecheck": "tsc --noEmit"
  },

+ "devDependencies": {
+   "typescript": "^5.8.0",
+   "tsx": "^4.19.0",
+   "@types/node": "^22.0.0",
+   "@types/express": "^5.0.0"
+ }
```

### 3. [MODIFY] `.gitignore`

Thêm:
```
dist/
*.js.map
*.d.ts
```

### 4. Install dependencies

```bash
npm install
```

## Files
| Action | Path |
|--------|------|
| NEW    | `tsconfig.json` |
| MODIFY | `package.json` |
| MODIFY | `.gitignore` |

## Verification
```bash
# Check tsc available
npx tsc --version
# Expected: Version 5.x.x

# Check tsx available
npx tsx --version

# Verify tsc reads config (sẽ fail vì chưa có .ts files, OK)
npx tsc --noEmit 2>&1 | head -5
```

## Done Criteria
- [ ] `tsconfig.json` tồn tại với đúng config
- [ ] `package.json` có scripts: dev, build, serve, typecheck
- [ ] `devDependencies` có typescript, tsx, @types/node, @types/express
- [ ] `.gitignore` có `dist/`, `*.js.map`, `*.d.ts`
- [ ] `npm install` thành công
