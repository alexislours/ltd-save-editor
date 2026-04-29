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
  | 'save_format_error';

export class ShareMiiError extends Error {
  readonly code: ShareMiiErrorCode;
  readonly params: Record<string, string | number>;
  constructor(code: ShareMiiErrorCode, params: Record<string, string | number> = {}) {
    super(code);
    this.name = 'ShareMiiError';
    this.code = code;
    this.params = params;
  }
}
