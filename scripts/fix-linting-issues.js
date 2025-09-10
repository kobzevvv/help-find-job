#!/usr/bin/env node

/**
 * Quick fix script for common linting issues
 * Run with: node scripts/fix-linting-issues.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting automated linting fixes...\n');

try {
  // Step 1: Auto-fix ESLint issues
  console.log('1️⃣ Fixing ESLint issues...');
  execSync('npm run lint:fix', { stdio: 'inherit' });

  // Step 2: Format code with Prettier
  console.log('2️⃣ Formatting code with Prettier...');
  execSync('npm run format', { stdio: 'inherit' });

  // Step 3: Run final checks
  console.log('3️⃣ Running final quality checks...');
  execSync('npm run quality', { stdio: 'inherit' });

  console.log('\n✅ All automated fixes applied successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Review the changes in your IDE');
  console.log('2. Run tests: npm test');
  console.log('3. Commit your changes: git add -A && git commit -m "fix: code quality improvements"');

} catch (error) {
  console.error('\n❌ Some issues could not be auto-fixed.');
  console.log('\n🔍 Manual fixes needed:');

  // Check for remaining issues
  try {
    const lintOutput = execSync('npm run lint 2>&1 || true', { encoding: 'utf8' });
    if (lintOutput.includes('error')) {
      console.log('• ESLint errors remain - check the output above');
    }
  } catch (e) {
    // Ignore - we just want to show the output
  }

  console.log('\n🛠️  For manual fixes:');
  console.log('• Replace `any` types with specific types');
  console.log('• Add missing type annotations');
  console.log('• Check our Code Quality Guide: docs/CODE_QUALITY_GUIDE.md');

  console.log('\n🚀 Still need help? Run: npm run quality');
}
