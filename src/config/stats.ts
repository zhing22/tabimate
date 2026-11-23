// Player stats (v2 Step 13): finished runs go to /api/runs, and the results
// show how many players picked each answer once enough have played.

export const STATS = {
  /** Percentages show for a prompt only once this many players answered it. */
  minPlayers: 20,
  /** The client gives up on a request after this long (the game never waits on it). */
  timeoutMs: 5000,
  /** How long the server and browsers may cache a day's stats. */
  cacheSeconds: 60,
  /** Request body limits: a run is small, anything bigger is refused. */
  maxBodyBytes: 4096,
  maxAnswers: 10,
  maxIdLength: 80,
  /** Where the client keeps its random device id and a run still to send. */
  deviceKey: 'tabimate.device',
  pendingKey: 'tabimate.pendingRun',
  /** The API path, under the site's base URL. */
  apiPath: 'api/runs',
} as const;
