/**
 * How sharing a result went. Defined once here, so the service that shares
 * (services/share.ts) and the screen that reports it (ui/screens/results.ts)
 * can't drift apart: a new outcome must be handled by both or neither compiles.
 */
export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';
