/** Marker embedded in adminNote to flag a customer as trusted. */
export const TRUSTED_CUSTOMER_MARKER = '[TRUSTED_CUSTOMER]';

/** Marker embedded in adminNote to suppress the out-of-zone approval modal. */
export const APPROVAL_MODAL_SUPPRESS_MARKER = '[SUPPRESS_APPROVAL_MODAL]';

/** Categorises a net margin value for display purposes. */
export function getMarginSeverity(netMargin: number): 'healthy' | 'thin' | 'negative' {
    return netMargin < 0 ? 'negative' : netMargin < 1.5 ? 'thin' : 'healthy';
}
