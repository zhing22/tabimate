// index.html starts the day's data before main.js has even downloaded (v3
// Step 3): a tiny inline script works out today's puzzle key and fetches the
// puzzle and animals files; data/jsonLoader.ts picks the responses up. The
// key's rule is core/date.ts dailyKey's, written out here from the same
// constants (config/game.ts), and a test checks the two agree.
import type { Plugin } from 'vite';
import { EARLY_FETCH_GLOBAL } from '../../src/config/data.ts';
import { RESET_HOUR, TIMEZONE } from '../../src/config/game.ts';

/** The body of function (now) -> "YYYY-MM-DD": the local date of the last reset in `timeZone`. */
export function dailyKeySource(timeZone: string, resetHour: number): string {
  const format = `{timeZone:${JSON.stringify(timeZone)},year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}`;
  return [
    'var p={};',
    `new Intl.DateTimeFormat('en-CA',${format}).formatToParts(now).forEach(function(x){p[x.type]=x.value;});`,
    'var t=Date.UTC(+p.year,+p.month-1,+p.day);',
    `if(+p.hour<${resetHour})t-=864e5;`,
    'return new Date(t).toISOString().slice(0,10);',
  ].join('');
}

/**
 * The inline script: ?debug=1&date= picks the day as debug/debugParams.ts
 * does (a well-formed date; main.ts checks it fully); otherwise today's key.
 * Any failure just leaves the loader to fetch as usual.
 */
export function earlyFetchScript(
  base: string,
  timeZone = TIMEZONE,
  resetHour = RESET_HOUR,
): string {
  const root = base.endsWith('/') ? base : `${base}/`;
  return [
    '(function(){try{',
    `var dailyKey=function(now){${dailyKeySource(timeZone, resetHour)}};`,
    "var q=new URLSearchParams(location.search),d=q.get('date');",
    String.raw`var key=q.get('debug')==='1'&&/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d:dailyKey(new Date());`,
    `var b=${JSON.stringify(root)},f={};`,
    "var go=function(file){f[b+file]=fetch(b+file,{headers:{Accept:'application/json'}});};",
    "go('data/puzzles/'+key+'.json');go('data/animals.json');",
    `window[${JSON.stringify(EARLY_FETCH_GLOBAL)}]=f;`,
    '}catch(e){}})();',
  ].join('');
}

export function earlyFetch(): Plugin {
  let base = '/';
  return {
    name: 'tabimate-early-fetch',
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: () => [
      { tag: 'script', children: earlyFetchScript(base), injectTo: 'head' },
    ],
  };
}
