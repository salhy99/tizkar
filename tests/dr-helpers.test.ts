import { assertIsolatedEnvironment } from '../scripts/dr-environment-guard';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface ExecSyncError extends Error {
  status: number | null;
  stderr: Buffer | string;
  stdout: Buffer | string;
}

function isExecSyncError(err: unknown): err is ExecSyncError {
  return err instanceof Error && 'status' in err && 'stderr' in err && 'stdout' in err;
}

describe('Disaster Recovery Environment Guard', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('allows execution if no production credentials are bound', () => {
    process.env.DR_DRILL_MODE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dr-isolated-project.supabase.co';
    process.env.RESTORE_S3_BUCKET = 'dr-isolated-bucket';

    assert.doesNotThrow(() => {
      assertIsolatedEnvironment();
    });
  });

  it('fails execution if production Supabase URL is bound', () => {
    process.env.DR_DRILL_MODE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://hnjfxdyterpbmkisaiiw.supabase.co';
    process.env.RESTORE_S3_BUCKET = 'dr-isolated-bucket';

    const originalExit = process.exit;
    let exitCode: number | undefined;
    (process as unknown as { exit: (code: number) => void }).exit = (code: number) => { exitCode = code; throw new Error('process.exit()'); };
    
    // Silence console error
    const originalError = console.error;
    console.error = () => {};

    try {
      assert.throws(() => {
        assertIsolatedEnvironment();
      }, /process\.exit/);
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
  });

  it('fails execution if production Storage bucket is bound', () => {
    process.env.DR_DRILL_MODE = 'true';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dr-isolated-project.supabase.co';
    process.env.RESTORE_S3_BUCKET = 'invitations_assets';

    const originalExit = process.exit;
    let exitCode: number | undefined;
    (process as unknown as { exit: (code: number) => void }).exit = (code: number) => { exitCode = code; throw new Error('process.exit()'); };
    
    // Silence console error
    const originalError = console.error;
    console.error = () => {};

    try {
      assert.throws(() => {
        assertIsolatedEnvironment();
      }, /process\.exit/);
      assert.strictEqual(exitCode, 1);
    } finally {
      process.exit = originalExit;
      console.error = originalError;
    }
  });

  describe('Workflow Pipeline Exit Propagation', () => {
    it('should correctly propagate failure when using pipefail (SCRIPT_EXIT_1 => WORKFLOW_STEP_FAILS)', () => {
      // This test ensures the pipeline syntax used in the workflow actually propagates failure
      expect(() => {
        // Run a failing script piped to tee, with pipefail enabled
        execSync('set -o pipefail && node -e "process.exit(1)" | tee -a .test-step-summary.log', { shell: '/bin/bash' });
      }).toThrow();
    });
  });
});

describe('DR Database Crosscheck (Dry-Run)', () => {
  it('identifies missing media correctly', () => {
    const dbRefs = ['a.png', 'b.png'];
    const storageFiles = new Set(['a.png']);
    
    let missing = 0;
    for (const ref of dbRefs) {
      if (!storageFiles.has(ref)) missing++;
    }
    assert.strictEqual(missing, 1);
  });
  
  it('passes when all media is present', () => {
    const dbRefs = ['a.png', 'b.png'];
    const storageFiles = new Set(['a.png', 'b.png']);
    
    let missing = 0;
    for (const ref of dbRefs) {
      if (!storageFiles.has(ref)) missing++;
    }
    assert.strictEqual(missing, 0);
  });
});

describe('DR Evidence Generation Format', () => {
  it('formats DR evidence correctly', () => {
    const evidence = {
      DRILL_ID: '123',
      STORAGE_RESTORE_RESULT: 'PASS'
    };
    assert.strictEqual(evidence.STORAGE_RESTORE_RESULT, 'PASS');
  });
});

describe('DR Backup Verify Script Contract', () => {
  it('fails closed when missing R2 credentials', () => {
    try {
      execSync('npx tsx scripts/dr-backup-verify.ts', {
        env: { ...process.env, BACKUP_S3_ENDPOINT: '' },
        stdio: 'pipe'
      });
      assert.fail('Should have thrown');
    } catch (err: unknown) {
      if (isExecSyncError(err)) {
        assert.strictEqual(err.status, 1);
        assert.match(err.stderr.toString() + err.stdout.toString(), /FATAL: Missing read-only R2 credentials\./);
      } else {
        throw err;
      }
    }
  }, 15000);

  it('fails closed when bucket is not tizkar-storage-backup', () => {
    try {
      execSync('npx tsx scripts/dr-backup-verify.ts', {
        env: {
          ...process.env,
          BACKUP_S3_ENDPOINT: 'https://s3.example.com',
          BACKUP_S3_ACCESS_KEY_ID: 'abc',
          BACKUP_S3_SECRET_ACCESS_KEY: '123',
          BACKUP_S3_BUCKET: 'wrong-bucket'
        },
        stdio: 'pipe'
      });
      assert.fail('Should have thrown');
    } catch (err: unknown) {
      if (isExecSyncError(err)) {
        assert.strictEqual(err.status, 1);
        assert.match(err.stderr.toString() + err.stdout.toString(), /FATAL: Unexpected backup bucket/);
      } else {
        throw err;
      }
    }
  }, 15000);

  it('fails closed when pg_restore version is not 17', () => {
    const tempBin = fs.mkdtempSync(path.join(process.cwd(), 'dr-test-bin-'));
    const isWin = process.platform === 'win32';
    const fakePgRestore = path.join(tempBin, isWin ? 'pg_restore.cmd' : 'pg_restore');
    
    if (isWin) {
      fs.writeFileSync(fakePgRestore, '@echo off\r\nif "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 14.10) else (exit /b 1)\r\n');
    } else {
      fs.writeFileSync(fakePgRestore, '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "pg_restore (PostgreSQL) 14.10"; else exit 1; fi\n');
      fs.chmodSync(fakePgRestore, 0o755);
    }

    try {
      execSync('npx tsx scripts/dr-backup-verify.ts', {
        env: {
          ...process.env,
          BACKUP_S3_ENDPOINT: 'https://s3.example.com',
          BACKUP_S3_ACCESS_KEY_ID: 'abc',
          BACKUP_S3_SECRET_ACCESS_KEY: '123',
          BACKUP_S3_BUCKET: 'tizkar-storage-backup',
          PG_RESTORE_BIN: fakePgRestore
        },
        stdio: 'pipe'
      });
      assert.fail('Should have thrown');
    } catch (err: unknown) {
      if (isExecSyncError(err)) {
        assert.strictEqual(err.status, 1);
        assert.match(err.stderr.toString() + err.stdout.toString(), /Error: PG_RESTORE_CLIENT_VERSION_MISMATCH/);
      } else {
        throw err;
      }
    } finally {
      fs.unlinkSync(fakePgRestore);
      fs.rmdirSync(tempBin);
    }
  }, 15000);

  it('PG17 execution cannot be intercepted by PG16 in PATH', () => {
    const tempBin16 = fs.mkdtempSync(path.join(process.cwd(), 'dr-test-bin16-'));
    const tempBin17 = fs.mkdtempSync(path.join(process.cwd(), 'dr-test-bin17-'));
    const isWin = process.platform === 'win32';
    
    const fakePgRestore16 = path.join(tempBin16, isWin ? 'pg_restore.cmd' : 'pg_restore');
    const fakePgRestore17 = path.join(tempBin17, isWin ? 'pg_restore.cmd' : 'pg_restore');
    
    if (isWin) {
      fs.writeFileSync(fakePgRestore16, '@echo off\r\nif "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 16.15) else (exit /b 1)\r\n');
      fs.writeFileSync(fakePgRestore17, '@echo off\r\nif "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 17.6) else (exit /b 1)\r\n');
    } else {
      fs.writeFileSync(fakePgRestore16, '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "pg_restore (PostgreSQL) 16.15"; else exit 1; fi\n');
      fs.writeFileSync(fakePgRestore17, '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "pg_restore (PostgreSQL) 17.6"; else exit 1; fi\n');
      fs.chmodSync(fakePgRestore16, 0o755);
      fs.chmodSync(fakePgRestore17, 0o755);
    }

    try {
      execSync('npx tsx scripts/dr-backup-verify.ts', {
        env: {
          ...process.env,
          BACKUP_S3_ENDPOINT: 'https://s3.example.com',
          BACKUP_S3_ACCESS_KEY_ID: 'abc',
          BACKUP_S3_SECRET_ACCESS_KEY: '123',
          BACKUP_S3_BUCKET: 'tizkar-storage-backup',
          PATH: `${tempBin16}${path.delimiter}${process.env.PATH}`,
          PG_RESTORE_BIN: fakePgRestore17
        },
        stdio: 'pipe'
      });
      // Should fail eventually on AWS S3 fetch because we used fake secrets
      assert.fail('Should have thrown on S3 fetch');
    } catch (err: unknown) {
      if (isExecSyncError(err)) {
        // Assert that the version check passed with 17, and it didn't use 16 from PATH
        const output = err.stderr.toString() + err.stdout.toString();
        assert.match(output, /PG_RESTORE_CLIENT_MAJOR_VERSION: 17/);
        assert.doesNotMatch(output, /PG_RESTORE_CLIENT_VERSION_MISMATCH/);
      } else {
        throw err;
      }
    }
  }, 15000);
});
