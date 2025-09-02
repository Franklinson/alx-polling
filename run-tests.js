#!/usr/bin/env node

/**
 * ALX Polling Test Runner
 *
 * This script provides a comprehensive test runner for the ALX Polling application
 * with coverage reports, examples, and detailed output.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log('\n' + '='.repeat(80));
  console.log(colorize('🧪 ALX Polling Application Test Suite', 'bold'));
  console.log('='.repeat(80) + '\n');
}

function printSection(title) {
  console.log(colorize(`\n📋 ${title}`, 'cyan'));
  console.log('-'.repeat(50));
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkTestFiles() {
  printSection('Test Files Overview');

  const testDirs = [
    '__tests__/lib/actions',
    '__tests__/app/polls',
    '__tests__/components',
  ];

  let totalTests = 0;

  for (const dir of testDirs) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
      console.log(colorize(`${dir}:`, 'green'), `${files.length} test files`);

      files.forEach(file => {
        console.log(colorize(`  ├─ ${file}`, 'dim'));
        totalTests++;
      });
    } else {
      console.log(colorize(`${dir}:`, 'yellow'), 'Directory not found');
    }
  }

  console.log(colorize(`\n📊 Total test files: ${totalTests}`, 'bold'));
  return totalTests;
}

function printTestExamples() {
  printSection('Test Coverage Examples');

  console.log(colorize('📄 polls.test.ts covers:', 'green'));
  console.log('  ✓ createPoll() - validation, authentication, database operations');
  console.log('  ✓ getPolls() - public polls fetching with error handling');
  console.log('  ✓ getUserPolls() - user-specific polls with auth checks');
  console.log('  ✓ deletePoll() - ownership validation and cascade delete');
  console.log('  ✓ updatePollStatus() - status transitions with validation');

  console.log(colorize('\n📄 page.test.tsx covers:', 'green'));
  console.log('  ✓ Authenticated user experience with polls');
  console.log('  ✓ Unauthenticated user experience');
  console.log('  ✓ Empty states and loading states');
  console.log('  ✓ Error handling and graceful degradation');
  console.log('  ✓ Poll ownership detection and UI state');
  console.log('  ✓ Responsive layout and accessibility');
}

function printCommands() {
  printSection('Available Test Commands');

  console.log(colorize('Basic Commands:', 'yellow'));
  console.log('  npm test              - Run all tests once');
  console.log('  npm run test:watch    - Run tests in watch mode');
  console.log('  npm run test:coverage - Run tests with coverage report');

  console.log(colorize('\nAdvanced Commands:', 'yellow'));
  console.log('  npx jest polls        - Run only polls-related tests');
  console.log('  npx jest --verbose    - Run with detailed output');
  console.log('  npx jest --bail       - Stop on first failure');
  console.log('  npx jest --updateSnapshot - Update snapshots');

  console.log(colorize('\nThis Script:', 'yellow'));
  console.log('  node run-tests.js --help     - Show this help');
  console.log('  node run-tests.js --coverage - Run with coverage');
  console.log('  node run-tests.js --watch    - Run in watch mode');
  console.log('  node run-tests.js --verbose  - Run with verbose output');
}

async function runTests(mode = 'default') {
  printSection(`Running Tests (${mode} mode)`);

  let jestArgs = [];

  switch (mode) {
    case 'coverage':
      jestArgs = ['--coverage', '--collectCoverageFrom=lib/**/*.{ts,tsx}', '--collectCoverageFrom=app/**/*.{ts,tsx}'];
      break;
    case 'watch':
      jestArgs = ['--watch'];
      break;
    case 'verbose':
      jestArgs = ['--verbose'];
      break;
    case 'ci':
      jestArgs = ['--ci', '--coverage', '--watchAll=false'];
      break;
    default:
      jestArgs = [];
  }

  try {
    await runCommand('npx', ['jest', ...jestArgs]);
    console.log(colorize('\n✅ All tests completed successfully!', 'green'));
  } catch (error) {
    console.error(colorize('\n❌ Tests failed!', 'red'));
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function printCoverageInfo() {
  printSection('Coverage Information');

  console.log('📊 Coverage targets:');
  console.log(colorize('  Functions: 80%+', 'green'));
  console.log(colorize('  Branches: 75%+', 'green'));
  console.log(colorize('  Lines: 85%+', 'green'));
  console.log(colorize('  Statements: 85%+', 'green'));

  console.log('\n📁 Coverage includes:');
  console.log('  • lib/actions/*.ts - Server actions');
  console.log('  • lib/utils/*.ts - Utility functions');
  console.log('  • app/**/*.tsx - Page components');
  console.log('  • components/**/*.tsx - UI components');

  console.log('\n📁 Coverage excludes:');
  console.log('  • Type definitions (*.d.ts)');
  console.log('  • Configuration files');
  console.log('  • Test files themselves');
  console.log('  • node_modules');
}

function printTroubleshooting() {
  printSection('Troubleshooting');

  console.log(colorize('Common Issues:', 'yellow'));
  console.log('');

  console.log(colorize('🔧 "Module not found" errors:', 'red'));
  console.log('   Solution: Check that all imports use the @/ alias correctly');
  console.log('   Example: import { createPoll } from "@/lib/actions/polls"');
  console.log('');

  console.log(colorize('🔧 "Cannot find module" for UI components:', 'red'));
  console.log('   Solution: Verify component files exist in components/ui/');
  console.log('   Check: card.tsx, button.tsx, badge.tsx, etc.');
  console.log('');

  console.log(colorize('🔧 Mock-related errors:', 'red'));
  console.log('   Solution: Ensure jest.setup.js is properly configured');
  console.log('   Check: All external dependencies are mocked');
  console.log('');

  console.log(colorize('🔧 Async/await test failures:', 'red'));
  console.log('   Solution: Use proper async/await in test functions');
  console.log('   Check: Mock promises resolve/reject correctly');
  console.log('');

  console.log(colorize('🔧 React 19 compatibility issues:', 'red'));
  console.log('   Solution: Tests use @testing-library/react@^15.0.0');
  console.log('   Note: Installed with --legacy-peer-deps flag');
}

function showUsageStats() {
  printSection('Test Statistics');

  const testFiles = [
    '__tests__/lib/actions/polls.test.ts',
    '__tests__/app/polls/page.test.tsx'
  ];

  let totalTests = 0;
  let totalLines = 0;

  testFiles.forEach(file => {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      const testCount = (content.match(/it\(/g) || []).length + (content.match(/test\(/g) || []).length;

      console.log(colorize(`${file}:`, 'blue'));
      console.log(`  Tests: ${testCount}, Lines: ${lines}`);

      totalTests += testCount;
      totalLines += lines;
    }
  });

  console.log(colorize(`\n📈 Totals: ${totalTests} tests, ${totalLines} lines of test code`, 'bold'));
}

async function main() {
  const args = process.argv.slice(2);

  printHeader();

  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    printCommands();
    printTroubleshooting();
    return;
  }

  if (args.includes('--stats')) {
    await checkTestFiles();
    showUsageStats();
    return;
  }

  // Show overview
  await checkTestFiles();
  printTestExamples();

  if (args.includes('--coverage-info')) {
    printCoverageInfo();
    return;
  }

  // Determine run mode
  let mode = 'default';
  if (args.includes('--coverage')) mode = 'coverage';
  else if (args.includes('--watch')) mode = 'watch';
  else if (args.includes('--verbose')) mode = 'verbose';
  else if (args.includes('--ci')) mode = 'ci';

  // Run tests
  await runTests(mode);

  if (mode === 'coverage') {
    printCoverageInfo();
    console.log(colorize('\n📊 Coverage report generated in coverage/ directory', 'cyan'));
    console.log('Open coverage/lcov-report/index.html in your browser to view detailed report');
  }

  console.log(colorize('\n🎉 Test run completed!', 'green'));
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(colorize('\n💥 Unhandled error:', 'red'));
  console.error(error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(colorize('💥 Script error:', 'red'), error);
    process.exit(1);
  });
}

module.exports = { main, runTests, checkTestFiles };
