#!/usr/bin/env node

/**
 * Magento Import System - Pre-flight Check
 * 
 * Verifies that everything is configured correctly before running import
 * 
 * Usage: node scripts/magento-preflight-check.js
 */

import 'dotenv/config';
import https from 'https';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvVariables() {
  log('\n📋 Checking Environment Variables...', 'cyan');
  
  const required = [
    'DATABASE_URL',
    'MAGENTO_BASE_URL',
    'MAGENTO_CONSUMER_KEY',
    'MAGENTO_CONSUMER_SECRET',
    'MAGENTO_ACCESS_TOKEN',
    'MAGENTO_ACCESS_TOKEN_SECRET',
  ];

  let allPresent = true;

  for (const varName of required) {
    if (process.env[varName]) {
      log(`  ✓ ${varName} is set`, 'green');
    } else {
      log(`  ✗ ${varName} is MISSING`, 'red');
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkDatabase() {
  log('\n🗄️  Checking Database Connection...', 'cyan');
  
  try {
    await prisma.$connect();
    log('  ✓ Database connection successful', 'green');

    // Check if migration has been run
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('products_catalog', 'categories_catalog')
    `;

    if (Array.isArray(tables) && tables.length === 2) {
      log('  ✓ Magento catalog tables exist', 'green');
      return true;
    } else {
      log('  ✗ Magento catalog tables NOT found', 'red');
      log('  → Run: npm run prisma:migrate', 'yellow');
      log('  → Or manually: psql -f prisma/migrations/20260126_add_magento_catalog/migration.sql', 'yellow');
      return false;
    }
  } catch (error) {
    log(`  ✗ Database connection failed: ${error.message}`, 'red');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function checkMagentoAPI() {
  log('\n🔌 Checking Magento API Connection...', 'cyan');
  
  const baseUrl = process.env.MAGENTO_BASE_URL;
  const token = process.env.MAGENTO_ACCESS_TOKEN;

  if (!baseUrl || !token) {
    log('  ✗ Magento credentials not configured', 'red');
    return false;
  }

  return new Promise((resolve) => {
    const url = `${baseUrl}/rest/V1/products?searchCriteria[pageSize]=1`;
    
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }, (res) => {
      if (res.statusCode === 200) {
        log('  ✓ Magento API is reachable', 'green');
        log(`  ✓ API returned HTTP ${res.statusCode}`, 'green');
        resolve(true);
      } else {
        log(`  ✗ Magento API returned HTTP ${res.statusCode}`, 'red');
        log('  → Check your API credentials', 'yellow');
        resolve(false);
      }
    }).on('error', (error) => {
      log(`  ✗ Cannot reach Magento API: ${error.message}`, 'red');
      log('  → Check MAGENTO_BASE_URL in .env', 'yellow');
      log('  → Check your internet connection', 'yellow');
      resolve(false);
    }).on('timeout', () => {
      log('  ✗ Magento API request timed out', 'red');
      resolve(false);
    });
  });
}

async function checkImageDirectory() {
  log('\n🖼️  Checking Image Directory...', 'cyan');
  
  const imagesDir = path.join(process.cwd(), 'public', 'media', 'products');
  
  try {
    await fs.mkdir(imagesDir, { recursive: true });
    log(`  ✓ Image directory exists: ${imagesDir}`, 'green');
    
    // Test write permissions
    const testFile = path.join(imagesDir, '.test-write');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    log('  ✓ Write permissions OK', 'green');
    
    return true;
  } catch (error) {
    log(`  ✗ Image directory error: ${error.message}`, 'red');
    log('  → Run: mkdir -p public/media/products', 'yellow');
    log('  → Run: chmod -R 755 public/media/products', 'yellow');
    return false;
  }
}

async function checkNodeModules() {
  log('\n📦 Checking Dependencies...', 'cyan');
  
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
    );

    const requiredDeps = ['@prisma/client', 'dotenv'];
    const requiredDevDeps = ['prisma', 'ts-node', 'typescript'];

    let allInstalled = true;

    // Check if node_modules exists
    try {
      await fs.access(path.join(process.cwd(), 'node_modules'));
      log('  ✓ node_modules directory exists', 'green');
    } catch {
      log('  ✗ node_modules directory NOT found', 'red');
      log('  → Run: npm install', 'yellow');
      return false;
    }

    for (const dep of requiredDeps) {
      if (packageJson.dependencies?.[dep]) {
        log(`  ✓ ${dep} is in package.json`, 'green');
      } else {
        log(`  ✗ ${dep} is MISSING from package.json`, 'red');
        allInstalled = false;
      }
    }

    for (const dep of requiredDevDeps) {
      if (packageJson.devDependencies?.[dep]) {
        log(`  ✓ ${dep} is in package.json`, 'green');
      } else {
        log(`  ✗ ${dep} is MISSING from package.json`, 'red');
        allInstalled = false;
      }
    }

    if (!allInstalled) {
      log('  → Run: npm install', 'yellow');
    }

    return allInstalled;
  } catch (error) {
    log(`  ✗ Error checking dependencies: ${error.message}`, 'red');
    return false;
  }
}

async function checkPrismaClient() {
  log('\n⚙️  Checking Prisma Client...', 'cyan');
  
  try {
    const generatedPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    await fs.access(generatedPath);
    log('  ✓ Prisma client is generated', 'green');
    return true;
  } catch {
    log('  ✗ Prisma client NOT generated', 'red');
    log('  → Run: npm run prisma:generate', 'yellow');
    return false;
  }
}

async function printSummary(results) {
  log('\n═══════════════════════════════════════════', 'blue');
  log('   PRE-FLIGHT CHECK SUMMARY', 'blue');
  log('═══════════════════════════════════════════', 'blue');
  
  const checks = [
    { name: 'Environment Variables', passed: results.env },
    { name: 'Database Connection', passed: results.database },
    { name: 'Magento API', passed: results.magento },
    { name: 'Image Directory', passed: results.images },
    { name: 'Dependencies', passed: results.deps },
    { name: 'Prisma Client', passed: results.prisma },
  ];

  for (const check of checks) {
    const icon = check.passed ? '✓' : '✗';
    const color = check.passed ? 'green' : 'red';
    log(`  ${icon} ${check.name}`, color);
  }

  const allPassed = Object.values(results).every(v => v === true);

  log('\n═══════════════════════════════════════════', 'blue');
  
  if (allPassed) {
    log('\n🎉 ALL CHECKS PASSED!', 'green');
    log('\nYou are ready to run:', 'green');
    log('  npm run import:magento:full', 'cyan');
  } else {
    log('\n❌ SOME CHECKS FAILED', 'red');
    log('\nPlease fix the issues above before running import.', 'yellow');
    log('\nFor help, see:', 'yellow');
    log('  - MAGENTO_QUICKSTART.md', 'cyan');
    log('  - MAGENTO_IMPORT_README.md', 'cyan');
  }

  log('');
  
  return allPassed;
}

async function main() {
  log('\n╔═══════════════════════════════════════════╗', 'blue');
  log('║   MAGENTO IMPORT - PRE-FLIGHT CHECK       ║', 'blue');
  log('╚═══════════════════════════════════════════╝', 'blue');

  const results = {
    env: await checkEnvVariables(),
    database: await checkDatabase(),
    magento: await checkMagentoAPI(),
    images: await checkImageDirectory(),
    deps: await checkNodeModules(),
    prisma: await checkPrismaClient(),
  };

  const allPassed = await printSummary(results);

  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
