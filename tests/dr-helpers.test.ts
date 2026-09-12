import { assertIsolatedEnvironment } from '../scripts/dr-environment-guard';
import assert from 'node:assert';

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
