/**
 * Parse API error bodies for Stage F admin screens.
 * Supports ValidationError shape ({ error, errors: [{ field, message, rejectedKeys }] })
 * and Zod validate middleware shape ({ error, details: [...] }).
 * Does not change existing Users-page toast paths.
 *
 * @param {unknown} error - typically an Axios error
 * @param {string} [fallback='Operation failed']
 * @returns {{
 *   message: string,
 *   details: Array<{ field?: string, message?: string, rejectedKeys?: string[] }>,
 *   rejectedKeys: string[],
 * }}
 */
export function parseApiError(error, fallback = 'Operation failed') {
  const data = error?.response?.data;
  const message =
    (typeof data?.error === 'string' && data.error) ||
    (typeof data?.message === 'string' && data.message) ||
    fallback;

  const rawDetails = Array.isArray(data?.errors)
    ? data.errors
    : Array.isArray(data?.details)
      ? data.details
      : [];

  const details = rawDetails.map((d) => ({
    field: d?.field,
    message: d?.message,
    rejectedKeys: Array.isArray(d?.rejectedKeys) ? d.rejectedKeys : undefined,
  }));

  const rejectedKeys = [
    ...new Set(details.flatMap((d) => d.rejectedKeys ?? [])),
  ];

  return { message, details, rejectedKeys };
}
