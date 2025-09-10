# Code Quality Guide

## Overview

This guide helps maintain consistent code quality across the project and provides solutions for common linting issues that appear in pull requests.

## 🔍 Understanding Linting Issues

### Types of Issues

#### 1. Prettier Formatting Errors (Most Common)
These are automatic code formatting issues that can be fixed automatically:

```bash
# Auto-fix formatting issues
npm run lint:fix
# or
npm run format
```

**Common formatting problems:**
- Incorrect indentation (tabs vs spaces)
- Missing/trailing whitespace
- Line length violations (>80 characters)
- Inconsistent line breaks
- Missing semicolons

#### 2. ESLint Warnings
These require manual attention but are generally less critical:

```typescript
// ❌ Bad: Using 'any' type
private ai: any;

// ✅ Good: Use specific types
private ai: Ai | undefined;
```

## 🚀 Quick Solutions

### Option 1: Auto-Fix Everything (Recommended)

```bash
# Fix all auto-fixable issues
npm run lint:fix

# Format all files
npm run format

# Check if everything is fixed
npm run lint
```

### Option 2: Format on Save (IDE Integration)

#### VS Code Setup
Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "prettier.configPath": "./package.json"
}
```

#### Cursor Setup
Cursor automatically uses Prettier and ESLint configurations from the project.

### Option 3: Pre-commit Hooks (Prevention)

The project includes pre-commit hooks that run automatically:

```bash
# These run on every commit
npm run type-check
npm run lint
npm run test
```

## 📋 Development Workflow

### Before Committing

1. **Run quality checks:**
   ```bash
   npm run precommit
   ```

2. **Auto-fix issues:**
   ```bash
   npm run lint:fix
   npm run format
   ```

3. **Verify everything passes:**
   ```bash
   npm run lint
   npm run type-check
   ```

### During Development

1. **Use auto-formatting** - Most IDEs can format on save
2. **Run linting regularly** - Catch issues early
3. **Use TypeScript strict mode** - Catch type issues at development time

## 🔧 Configuration Details

### ESLint Configuration (`.eslintrc.js`)

```javascript
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "prettier"  // Must be last to override other configs
  ],
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "@typescript-eslint/no-explicit-any": "warn", // Warnings, not errors
    "no-unused-vars": "off", // Let TypeScript handle this
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### Prettier Configuration (in `package.json`)

```json
{
  "prettier": {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 2,
    "useTabs": false
  }
}
```

## 🎯 Best Practices

### TypeScript Guidelines

1. **Avoid `any` types:**
   ```typescript
   // ❌ Bad
   private ai: any;

   // ✅ Good - Use specific types
   private ai: Ai | undefined;

   // ✅ Alternative - Use unknown for truly dynamic types
   private config: unknown;
   ```

2. **Use strict typing:**
   ```typescript
   // ✅ Good
   interface UserSession {
     userId: number;
     state: ConversationState;
     timestamp: Date;
   }
   ```

### Code Formatting

1. **Line length:** Keep lines under 80 characters
2. **Indentation:** Use 2 spaces (no tabs)
3. **Semicolons:** Always use semicolons
4. **Quotes:** Use single quotes for strings
5. **Trailing commas:** Use trailing commas in multi-line objects

### File Organization

1. **Imports:** Group and sort imports
   ```typescript
   // Node.js built-ins
   import { readFile } from 'fs';

   // External libraries
   import express from 'express';

   // Internal modules
   import { UserService } from './services/user';
   ```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Unexpected any" warnings
```typescript
// Fix by using specific types
interface AiBinding {
  run(model: string, input: any): Promise<any>;
}

private ai: AiBinding | undefined;
```

#### 2. Prettier formatting conflicts
```bash
# Force format entire codebase
npm run format

# Check what would be changed
npm run format:check
```

#### 3. ESLint and Prettier conflicts
- Prettier handles formatting (spacing, line breaks)
- ESLint handles code quality (unused vars, patterns)
- They work together but Prettier runs first

### Advanced Configuration

#### Custom ESLint Rules
Add to `.eslintrc.js`:

```javascript
rules: {
  // Custom rules for this project
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_'
  }],
  'no-console': 'off' // Allow console in Cloudflare Workers
}
```

#### Ignoring Files
Create `.eslintignore`:

```
dist/
node_modules/
*.js
!*.config.js
```

## 🔄 CI/CD Integration

### GitHub Actions Workflows

The project includes multiple automated quality checks:

#### Main CI Pipeline (`ci.yml`)
- **Lint Code** - ESLint checks
- **Format Check** - Prettier validation
- **Type Check** - TypeScript compilation
- **Unit Tests** - Test execution

#### PR Quality Assistant (`pr-quality.yml`)
- **Auto-fixes** - Automatically fixes formatting and linting issues
- **Quality Insights** - Provides feedback on code quality metrics
- **PR Comments** - Posts helpful comments on pull requests

#### Simple Quality Check (`pr-quality-simple.yml`)
- **Lightweight alternative** - No PR comments, just job summaries
- **Fork-friendly** - Works with forked repositories
- **Fast execution** - Minimal permissions required

### Handling Permission Issues

If you see "Resource not accessible by integration" errors:

1. **For forked PRs**: Use the simple workflow (`pr-quality-simple.yml`)
2. **For main repo PRs**: The full workflow should work with proper permissions
3. **Local development**: Always run `npm run quality:fix` before pushing

The workflows are designed to fail gracefully - even if commenting fails, the actual fixes are still applied to your code.

### Pre-commit Hooks
Using husky for git hooks:

```bash
# Install husky
npm install --save-dev husky

# Initialize hooks
npx husky install

# Add pre-commit hook
echo "npm run precommit" > .husky/pre-commit
```

## 📊 Quality Metrics

### Coverage Goals
- **Test Coverage:** >80%
- **Type Coverage:** 100% (no `any` types in production code)
- **Lint Compliance:** 0 errors, 0 warnings

### Monitoring
```bash
# Check coverage
npm run test:coverage

# Check types
npm run type-check

# Check formatting
npm run format:check
```

## 🚨 When to Skip Quality Checks

**Only skip in emergency situations:**

1. **Hotfixes** for production issues
2. **Security patches** that need immediate deployment
3. **Infrastructure outages** requiring quick fixes

**Always document why checks were skipped:**

```bash
# Skip linting for emergency hotfix
npm run build -- --skip-lint
# Reason: Critical bug fix needed immediately
```

## 📞 Getting Help

### Common Questions

**Q: Why do I keep getting formatting errors?**
A: Your IDE might not be configured to format on save. Enable auto-formatting or run `npm run format` before committing.

**Q: Should I fix all ESLint warnings?**
A: Yes, but prioritize errors over warnings. Warnings can be addressed gradually.

**Q: Can I disable specific rules?**
A: Only for valid reasons documented in the code. Use inline comments:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
private legacyApi: any; // TODO: Replace with proper types
```

### Resources

- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint Documentation](https://eslint.org/docs/user-guide/)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

**Remember:** Consistent code quality makes collaboration easier and reduces bugs. The initial setup takes time but pays off in the long run.
