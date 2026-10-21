// Error codes shared by both backends. The UI translates them via i18n keys "err_<code>".
export const ERROR_CODES = [
  "not_found",
  "not_allowed",
  "not_enough_quantity",
  "invalid_state",
  "own_listing",
  "invalid_input",
  "not_logged_in",
];

export class BackendError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = ERROR_CODES.includes(code) ? code : "unknown";
  }
}

export function fail(code, message) {
  throw new BackendError(code, message);
}
