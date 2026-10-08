/**
 * Every limit in one place, so the numbers can be argued about rather than
 * hunted for. Windows are deliberately short on the credential endpoints -- a
 * real carer typing their own password should never notice these.
 */

export const LIMITS = {
  /** Registering is the one way to mint an account, so it is the tightest. */
  signupPerIp: { max: 5, windowMs: 60 * 60 * 1000 },
  signupPerEmail: { max: 3, windowMs: 60 * 60 * 1000 },

  /**
   * Guards credential stuffing. Every attempt counts, including successful ones --
   * counting only failures would let an attacker probe for accounts for free. That
   * means these numbers have to tolerate a shared or kiosk sign-in as well as a
   * person fumbling their own password.
   */
  loginPerIp: { max: 60, windowMs: 15 * 60 * 1000 },
  loginPerAccount: { max: 25, windowMs: 15 * 60 * 1000 },

  createCircle: { max: 5, windowMs: 24 * 60 * 60 * 1000 },
  createNote: { max: 40, windowMs: 60 * 60 * 1000 },
  joinCircle: { max: 20, windowMs: 60 * 60 * 1000 },
  changePassword: { max: 5, windowMs: 60 * 60 * 1000 },
  forgotPasswordPerIp: { max: 5, windowMs: 60 * 60 * 1000 },
  forgotPasswordPerEmail: { max: 3, windowMs: 60 * 60 * 1000 },
  resetPasswordPerIp: { max: 10, windowMs: 60 * 60 * 1000 },
} as const;

export const MAX = {
  email: 254,
  /** bcrypt ignores anything past 72 bytes; anything near this is not a human. */
  password: 200,
  passwordMin: 8,

  displayName: 60,
  howIShowUp: 200,
  regionTag: 60,
  emailBlurb: 200,

  circleName: 80,
  circlePurpose: 200,

  noteTitle: 120,
  noteSituation: 1000,
  noteSteps: 2000,
  noteNeverPromise: 600,
  noteAccess: 1000,
  noteContact: 120,
} as const;

/** Trim, then measure. Returns the reason a value was refused, or null if it fits. */
export function tooLong(value: string, max: number, label: string): string | null {
  return value.length > max ? `${label} is too long — ${max} characters is the limit.` : null;
}