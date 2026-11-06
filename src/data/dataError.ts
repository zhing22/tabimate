/** Bad or unreachable data. The message always names the file, and the field when known. */
export class DataError extends Error {
  readonly file: string;
  readonly field: string | null;

  constructor(file: string, field: string | null, problem: string) {
    super(field ? `${file}: ${field} ${problem}` : `${file}: ${problem}`);
    this.name = 'DataError';
    this.file = file;
    this.field = field;
  }
}
