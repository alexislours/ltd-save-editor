/**
 * Stable, machine-readable identifier for every failure {@link ShareMiiError}
 * can raise. Used as the error `message` and exposed via {@link ShareMiiError.code}
 * so callers can branch or localize without parsing prose.
 */
export type ShareMiiErrorCode =
  | 'mii_not_initialized'
  | 'no_free_facepaint_slot'
  | 'ugc_missing_textures'
  | 'wrong_ugc_kind'
  | 'subtype_mismatch'
  | 'cannot_replace_kind'
  | 'invalid_ltd_file'
  | 'unsupported_ltd_version'
  | 'ltd_missing_marker'
  | 'invalid_ugc_kind_index'
  | 'invalid_zip'
  | 'save_format_error'
  | 'slot_out_of_range';

/**
 * Error thrown by every operation in this package when extraction or application
 * fails for a known reason. The {@link ShareMiiErrorCode} carries the cause and
 * {@link ShareMiiError.params} any contextual values for messaging.
 */
export class ShareMiiError extends Error {
  /** The machine-readable failure cause; also used as the `Error` message. */
  readonly code: ShareMiiErrorCode;
  /** Contextual values for the failure (slot number, kind, marker name, and so on), suitable for interpolation into a localized message. */
  readonly params: Record<string, string | number>;
  /** Construct an error for `code`, attaching optional `params` for messaging. */
  constructor(code: ShareMiiErrorCode, params: Record<string, string | number> = {}) {
    super(code);
    this.name = 'ShareMiiError';
    this.code = code;
    this.params = params;
  }
}
