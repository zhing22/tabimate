// The achievements made from a list of goals in config (streak lengths,
// journal sizes): one entry per goal.
import { journalSize } from '../journal/journal';
import { journalProgress, streakProgress } from './progress';
import type { Achievement } from './registry';

export const streakGoal = (days: number): Achievement => ({
  id: `streak-${days}`,
  name: `${days}-day streak`,
  description: `Finish ${days} days in a row.`,
  icon: '🔥',
  section: 'streaks',
  check: ({ stats }) => stats.bestStreak >= days,
  progress: streakProgress(days),
});

export const journalGoal = (count: number): Achievement => ({
  id: `journal-${count}`,
  name: `${count} animals`,
  description: `Find ${count} different animals for your Field Journal.`,
  icon: '📖',
  section: 'collection',
  check: ({ journal }) => journalSize(journal) >= count,
  progress: journalProgress(count),
});
