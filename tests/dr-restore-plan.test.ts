import { describe, expect, it, afterEach, vi, Mock } from 'vitest';
import { verifyTargetIdentity, checkTargetClean, checkMigrationConflict } from '../scripts/dr-database-restore';
import * as fs from 'fs';
import * as child_process from 'child_process';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}));

describe('DR Restore Plan Guard Tests', () => {
  beforeEach(() => {
    process.env.DR_SUPABASE_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('A. Target Identity Verification', () => {
    it('shared pooler hostname alone cannot pass identity verification', () => {
      // Missing DR_SUPABASE_URL -> Signal 1 will fail
      process.env.DR_SUPABASE_URL = '';
      const dbUrl = 'postgresql://postgres:postgres@db.hlhrqvmmvczmvyxszzxd.supabase.co:5432/postgres';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = verifyTargetIdentity(dbUrl);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('FATAL: Target identity missing independent signals.');
      consoleErrorSpy.mockRestore();
    });

    it('passes with multiple independent signals', () => {
      process.env.DR_SUPABASE_URL = 'https://hlhrqvmmvczmvyxszzxd.supabase.co';
      const dbUrl = 'postgresql://postgres.hlhrqvmmvczmvyxszzxd:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
      const result = verifyTargetIdentity(dbUrl);
      expect(result).toBe(true);
    });

    it('rejects wrong DR project ref', () => {
      process.env.DR_SUPABASE_URL = 'https://wrongproject.supabase.co';
      const dbUrl = 'postgresql://postgres.wrongproject:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = verifyTargetIdentity(dbUrl);
      expect(result).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('handles postgres:// DB URL without throwing', () => {
      process.env.DR_SUPABASE_URL = 'https://hlhrqvmmvczmvyxszzxd.supabase.co';
      const dbUrl = 'postgres://postgres.hlhrqvmmvczmvyxszzxd:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
      const result = verifyTargetIdentity(dbUrl);
      expect(result).toBe(true);
    });

    it('handles encoded DB password falling back to regex without throwing', () => {
      process.env.DR_SUPABASE_URL = 'https://hlhrqvmmvczmvyxszzxd.supabase.co';
      // URL constructor might throw if password contains illegal unencoded characters
      const dbUrl = 'postgresql://postgres.hlhrqvmmvczmvyxszzxd:pass[word]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';
      const result = verifyTargetIdentity(dbUrl);
      expect(result).toBe(true);
    });

    it('rejects completely malformed DB URL safely', () => {
      process.env.DR_SUPABASE_URL = 'https://hlhrqvmmvczmvyxszzxd.supabase.co';
      const dbUrl = 'not-a-url';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = verifyTargetIdentity(dbUrl);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('FATAL: DR_SUPABASE_DB_URL has invalid URL syntax.');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('B. Public Target Clean Gate', () => {
    it('returns false if another TIZKAR public table exists while profiles does not', async () => {
      (child_process.execFileSync as Mock).mockImplementation((bin: string, args: string[]) => {
        const query = args[3];
        if (query.includes("information_schema.tables WHERE table_schema='public'")) {
          // profiles is absent, but invitations exists
          return 'invitations';
        }
        return '';
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await checkTargetClean();
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('FATAL: Target is not clean. Found preexisting public app tables: invitations');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('C & D. Explicit Ordering verification', () => {
    it('should logically run auth.users before auth.identities and storage.buckets before storage.objects', () => {
      const scriptContent = fs.readFileSync('scripts/dr-database-restore.ts', 'utf-8');
      
      const usersIndex = scriptContent.indexOf(`runPhase('AUTH_USERS_DATA'`);
      const identitiesIndex = scriptContent.indexOf(`runPhase('AUTH_IDENTITIES_DATA'`);
      expect(usersIndex).toBeLessThan(identitiesIndex);

      const bucketsIndex = scriptContent.indexOf(`runPhase('STORAGE_BUCKETS_DATA'`);
      const objectsIndex = scriptContent.indexOf(`runPhase('STORAGE_OBJECTS_DATA'`);
      expect(bucketsIndex).toBeLessThan(objectsIndex);
    });
  });

  describe('E. Migration History Conflict', () => {
    it('refuses to start if migration history is conflicting (non-empty)', async () => {
      (child_process.execFileSync as Mock).mockImplementation((bin: string, args: string[]) => {
        const query = args[3];
        if (query.includes('supabase_migrations.schema_migrations')) {
          return '2';
        }
        return '';
      });

      const result = await checkMigrationConflict();
      expect(result).toBe('CONFLICTING');
    });

    it('returns EMPTY if migration history table does not exist', async () => {
      (child_process.execFileSync as Mock).mockImplementation(() => {
        throw new Error('relation does not exist');
      });

      const result = await checkMigrationConflict();
      expect(result).toBe('EMPTY');
    });
  });

  describe('F. Partial failure', () => {
    it('sets MANUAL_DR_RESET_REQUIRED if it fails after first write', () => {
      const scriptContent = fs.readFileSync('scripts/dr-database-restore.ts', 'utf-8');
      expect(scriptContent).toContain(`console.log(\`MANUAL_DR_RESET_REQUIRED: YES\`);`);
      expect(scriptContent).toContain(`restoreState = 'FAILED_PARTIAL'`);
    });
  });
});
