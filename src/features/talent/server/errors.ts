export class TalentError extends Error {
  readonly status: number
  constructor(message: string, status = 400) { super(message); this.name = 'TalentError'; this.status = status }
}
