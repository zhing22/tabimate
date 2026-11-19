// Reads a request body with a size cap, for the dev puzzle API.

/** A week of puzzles is a few KB; anything this big is not one. */
export const MAX_BODY_BYTES = 256 * 1024;

/**
 * The request body as text, or null once it passes `limit` bytes (reading
 * stops there, so a huge body costs no more memory than the limit).
 */
export const readBody = (
  req: NodeJS.ReadableStream,
  limit = MAX_BODY_BYTES,
): Promise<string | null> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > limit) {
        req.removeListener('data', onData);
        req.pause();
        resolve(null);
        return;
      }
      chunks.push(buffer);
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
