import { SnapshotMetadata } from './types';

export interface RetentionPolicy {
  daily: number; // Days to keep daily snapshots
  weekly: number; // Weeks to keep weekly snapshots
  monthly: number; // Months to keep monthly snapshots
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  daily: 30,
  weekly: 12,
  monthly: 12
};

export interface RetentionResult {
  snapshot_id: string;
  category: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EXPIRED';
  action: 'RETAIN' | 'DELETE';
  reason: string;
}

/**
 * Classifies snapshots and determines which ones should be retained or deleted.
 * Note: Only ONE snapshot per period (day/week/month) should be classified as the representative snapshot.
 * Here we assume the input is sorted by date ascending.
 */
export function calculateRetention(
  snapshots: SnapshotMetadata[], 
  policy: RetentionPolicy = DEFAULT_RETENTION_POLICY, 
  currentDate: Date = new Date()
): RetentionResult[] {
  const results: RetentionResult[] = [];
  
  // Sort descending to process newest first
  const sorted = [...snapshots].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  const seenDays = new Set<string>();
  const seenWeeks = new Set<string>();
  const seenMonths = new Set<string>();

  for (const snap of sorted) {
    if (snap.state !== 'COMPLETE') {
      // Keep failed/incomplete snapshots for a short window if needed, but per policy we focus on COMPLETE.
      results.push({ snapshot_id: snap.snapshot_id, category: 'EXPIRED', action: 'DELETE', reason: 'Non-COMPLETE state' });
      continue;
    }

    const snapDate = new Date(snap.started_at);
    const dayKey = snapDate.toISOString().split('T')[0];
    
    // Week key: ISO year and week number (simplified to just week start date for this example)
    const day = snapDate.getDay();
    const diff = snapDate.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(snapDate.setDate(diff));
    const weekKey = weekStart.toISOString().split('T')[0];

    const monthKey = `${snapDate.getFullYear()}-${String(snapDate.getMonth() + 1).padStart(2, '0')}`;

    const ageInDays = Math.floor((currentDate.getTime() - new Date(snap.started_at).getTime()) / (1000 * 60 * 60 * 24));
    
    let category: RetentionResult['category'] = 'EXPIRED';
    let action: RetentionResult['action'] = 'DELETE';
    let reason = 'Expired';

    // To ensure proper categorization, we check age buckets in ascending order of retention.
    const isDaily = ageInDays <= policy.daily;
    const isWeekly = ageInDays <= policy.weekly * 7;
    const isMonthly = ageInDays <= policy.monthly * 30;

    if (isDaily && !seenDays.has(dayKey)) {
      seenDays.add(dayKey);
      seenWeeks.add(weekKey); // Also counts as the representative for its week
      seenMonths.add(monthKey); // Also counts as the representative for its month
      category = 'DAILY';
      action = 'RETAIN';
      reason = 'Daily representative';
    } else if (isWeekly && !seenWeeks.has(weekKey)) {
      seenWeeks.add(weekKey);
      seenMonths.add(monthKey);
      category = 'WEEKLY';
      action = 'RETAIN';
      reason = 'Weekly representative';
    } else if (isMonthly && !seenMonths.has(monthKey)) {
      seenMonths.add(monthKey);
      category = 'MONTHLY';
      action = 'RETAIN';
      reason = 'Monthly representative';
    }

    results.push({ snapshot_id: snap.snapshot_id, category, action, reason });
  }

  return results;
}
