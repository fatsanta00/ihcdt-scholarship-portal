/**
 * Centralised, user-facing error message catalogue for the IHCDT Scholarship Portal.
 *
 * All error messages follow a consistent pattern:
 *   - What happened (plain English, no jargon)
 *   - Why it happened where useful
 *   - Exactly what the user should do next
 *
 * Server-side error codes are translated here to avoid leaking stack traces,
 * database errors, or internal status codes to applicants.
 */

// ─── File Upload Errors ──────────────────────────────────────────────────────

export const FileErrors = {
  typeMismatch: (filename: string, allowed: string[]) =>
    `"${filename}" is not an accepted format. Please upload a ${allowed.join(', ')} file instead.`,

  tooLarge: (filename: string, actualSize: string, maxSize: string) =>
    `"${filename}" is ${actualSize}, which exceeds the maximum allowed size of ${maxSize}. Please reduce the file size or take a lower-resolution photo of your document.`,

  tooLargeGeneric: (maxSize: string) =>
    `This file exceeds the maximum allowed upload size of ${maxSize}. Please compress the file or take a lower-resolution photo.`,

  corrupted: (filename: string) =>
    `"${filename}" could not be read and may be corrupted. Please try re-scanning or re-taking the photo of your document.`,

  compressionFailed: (filename: string) =>
    `We could not automatically optimise "${filename}". Please try uploading a smaller version of the file.`,

  tooManyFiles: (max: number) =>
    `You can upload a maximum of ${max} files for this document. Please remove one before adding another.`,

  uploadInterrupted: (filename: string) =>
    `The upload of "${filename}" was interrupted, likely due to a poor internet connection. Please check your connection and try uploading again.`,

  storageUnavailable: () =>
    'The document storage service is temporarily unavailable. Please wait a few moments and try submitting again. Your form data has been preserved.',

  missingRequired: (documentName: string) =>
    `"${documentName}" is required. Please upload this document before proceeding.`,
} as const;

// ─── Payload / Size Errors ──────────────────────────────────────────────────

export const PayloadErrors = {
  tooLarge: (actualSize: string, maxSize: string) =>
    `Your uploaded documents total ${actualSize}, which is too large for a single submission (maximum: ${maxSize}). ` +
    'Your photo documents have already been auto-compressed. If you have PDFs, please export them at a lower quality, or scan your documents as JPEG images instead.',
} as const;

// ─── Form Field Validation Errors ────────────────────────────────────────────

export const FieldErrors = {
  required: (fieldLabel: string) =>
    `${fieldLabel} is required.`,

  invalidEmail: () =>
    'Please enter a valid email address (e.g. yourname@gmail.com).',

  invalidPhone: () =>
    'Please enter a valid Nigerian phone number (e.g. 08012345678 or +234 801 234 5678).',

  ninRequired: () =>
    'Your National Identification Number (NIN) is required to prevent duplicate applications.',

  ninInvalid: () =>
    'Your NIN must be exactly 11 numeric digits with no spaces, letters, or symbols (e.g. 12345678901).',

  ninDuplicate: (ref: string) =>
    `An application with this NIN has already been submitted (Ref: ${ref}). Each person may only submit one application per year. If you believe this is an error, please contact the IHCDT Secretariat.`,

  jambRequired: () =>
    'Your JAMB Registration Number is required for Fresh Intake applicants.',

  jambDuplicate: (ref: string) =>
    `An application with this JAMB Registration Number already exists (Ref: ${ref}). If you believe this is an error, please contact the IHCDT Secretariat.`,

  matricRequired: () =>
    'Your Matriculation Number is required for Returning Student applicants.',

  matricDuplicate: (ref: string) =>
    `An application with this Matriculation Number already exists (Ref: ${ref}). If you believe this is an error, please contact the IHCDT Secretariat.`,

  accountRequired: () =>
    'Your bank account number is required for scholarship disbursement.',

  accountInvalid: () =>
    'Your bank account number must be exactly 10 numeric digits — this is your standard Nigerian NUBAN account number (e.g. 0123456789).',

  bankRequired: () =>
    'Please select your bank from the list.',

  bankOtherRequired: () =>
    'Please type the full name of your bank.',

  cgpaRequired: () =>
    'Your current CGPA is required for Returning Student applicants.',

  ibenoRequired: () =>
    'You must confirm that you are of Ibeno origin to be eligible for this scholarship.',

  ibenoIneligible: () =>
    'This scholarship is exclusively for students of Ibeno origin. Unfortunately, you are not eligible to apply.',

  declarationRequired: () =>
    'You must check the declaration box to confirm that the information and documents you have submitted are accurate and authentic.',
} as const;

// ─── Network & Submission Errors ──────────────────────────────────────────────

export const SubmissionErrors = {
  offline: () =>
    'Your internet connection appears to be unavailable. Please check your mobile data or Wi-Fi connection and try submitting again.',

  timedOut: () =>
    'The submission took too long and timed out — this sometimes happens on slow mobile networks. Please check your connection and tap "Submit Application" again. Your form data is still intact.',

  serverBusy: () =>
    'The scholarship portal server is temporarily busy. Please wait 30 seconds and try submitting again.',

  serverError: (status: number) =>
    `A server error occurred (HTTP ${status}). Please try submitting again. If the problem persists, please contact the IHCDT Secretariat and quote the error code.`,

  tooManyRequests: () =>
    'You have submitted too many requests. Please wait one minute and try again.',

  portalClosed: () =>
    'The application portal is currently closed. Applications are only accepted during the open submission window. Please check the portal homepage for the current deadline.',

  notIbenoOrigin: () =>
    'This scholarship is intended only for students of Ibeno origin. Your submission cannot be accepted.',

  unexpected: () =>
    'An unexpected error occurred during submission. Please try again. If the problem continues, please contact the IHCDT Secretariat.',
} as const;

// ─── Error Code → User Message Map ───────────────────────────────────────────
// Maps structured error codes returned by the API (via `errorCode` field)
// to precise, actionable user-facing messages.

export type ApiErrorCode =
  | 'PORTAL_CLOSED'
  | 'NOT_IBENO_ORIGIN'
  | 'NIN_INVALID'
  | 'ACCOUNT_NUMBER_INVALID'
  | 'BANK_NAME_MISSING'
  | 'JAMB_REQUIRED'
  | 'MATRIC_REQUIRED'
  | 'NIN_DUPLICATE'
  | 'JAMB_DUPLICATE'
  | 'MATRIC_DUPLICATE'
  | 'DOCUMENT_MISSING'
  | 'DOCUMENT_TYPE_INVALID'
  | 'DOCUMENT_TOO_LARGE'
  | 'STORAGE_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR';

export function resolveApiError(
  errorCode: ApiErrorCode | string | undefined,
  errorMessage: string,
  meta?: Record<string, any>
): { message: string; fieldKey?: string } {
  switch (errorCode) {
    case 'PORTAL_CLOSED':
      return { message: SubmissionErrors.portalClosed() };
    case 'NOT_IBENO_ORIGIN':
      return { message: FieldErrors.ibenoIneligible() };
    case 'NIN_INVALID':
      return { message: FieldErrors.ninInvalid(), fieldKey: 'nin' };
    case 'NIN_DUPLICATE':
      return { message: FieldErrors.ninDuplicate(meta?.ref || ''), fieldKey: 'nin' };
    case 'JAMB_REQUIRED':
      return { message: FieldErrors.jambRequired(), fieldKey: 'jamb_number' };
    case 'JAMB_DUPLICATE':
      return { message: FieldErrors.jambDuplicate(meta?.ref || ''), fieldKey: 'jamb_number' };
    case 'MATRIC_REQUIRED':
      return { message: FieldErrors.matricRequired(), fieldKey: 'matric_number' };
    case 'MATRIC_DUPLICATE':
      return { message: FieldErrors.matricDuplicate(meta?.ref || ''), fieldKey: 'matric_number' };
    case 'ACCOUNT_NUMBER_INVALID':
      return { message: FieldErrors.accountInvalid(), fieldKey: 'account_number' };
    case 'BANK_NAME_MISSING':
      return { message: FieldErrors.bankRequired(), fieldKey: 'bank_name' };
    case 'DOCUMENT_MISSING':
      return { message: meta?.documentName ? FileErrors.missingRequired(meta.documentName) : errorMessage };
    case 'DOCUMENT_TYPE_INVALID':
      return { message: `One of your uploaded files has an invalid format. ${FileErrors.tooLargeGeneric('10 MB')}` };
    case 'DOCUMENT_TOO_LARGE':
      return { message: FileErrors.tooLargeGeneric('10 MB') };
    case 'STORAGE_ERROR':
      return { message: FileErrors.storageUnavailable() };
    case 'PAYLOAD_TOO_LARGE':
      return { message: PayloadErrors.tooLarge('your documents', '4.2 MB') };
    case 'RATE_LIMITED':
      return { message: SubmissionErrors.tooManyRequests() };
    default:
      // Fallback: return the server's message verbatim if it looks safe (no stack trace markers)
      if (
        errorMessage &&
        !errorMessage.includes('at ') &&
        !errorMessage.includes('prisma') &&
        !errorMessage.includes('Error:') &&
        errorMessage.length < 400
      ) {
        return { message: errorMessage };
      }
      return { message: SubmissionErrors.unexpected() };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function classifyNetworkError(err: unknown): string {
  const error = err as any;
  if (error?.name === 'AbortError') return SubmissionErrors.timedOut();
  const msg: string = error?.message || '';
  if (
    msg === 'Failed to fetch' ||
    msg.toLowerCase().includes('networkerror') ||
    msg.toLowerCase().includes('network request failed') ||
    error?.name === 'TypeError'
  ) {
    return SubmissionErrors.offline();
  }
  return error?.message || SubmissionErrors.unexpected();
}
