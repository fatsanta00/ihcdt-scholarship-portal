import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { saveDocument } from '@/lib/storage';
import { siteConfig, documentRequirements } from '@/config';
import { sendConfirmationEmail } from '@/lib/email';
import crypto from 'crypto';

function generateReferenceNumber() {
  const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `IHCDT-2026-${randomChars}`;
}

// Allow up to 60 seconds execution time on Vercel for blob uploads and DB transactions
export const maxDuration = 60;

/**
 * Helper: returns a JSON error response with a structured errorCode so the
 * client can resolve it to a precise, user-friendly message via resolveApiError().
 * Never exposes database errors, stack traces, or internal paths.
 */
function apiError(
  errorCode: string,
  userMessage: string,
  status: number,
  meta?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: userMessage, errorCode, ...(meta ? { meta } : {}) }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    const startDate = new Date(siteConfig.submissionStartDate);
    const endDate = new Date(siteConfig.submissionEndDate);

    if (now < startDate || now > endDate) {
      return apiError(
        'PORTAL_CLOSED',
        'The application portal is currently closed. Applications are only accepted during the open submission window.',
        403
      );
    }

    const formData = await req.formData();

    // ─── Parse text fields ────────────────────────────────────────────────────
    const full_name       = (formData.get('full_name') as string)?.trim() || '';
    const address         = (formData.get('address') as string)?.trim() || '';
    const state_of_origin = (formData.get('state_of_origin') as string)?.trim() || '';
    const phone           = (formData.get('phone') as string)?.trim() || '';
    const email           = (formData.get('email') as string)?.trim().toLowerCase() || '';
    const student_category = formData.get('student_category') as string; // 'fresh' | 'returning'
    const institution     = (formData.get('institution') as string)?.trim() || '';
    const faculty         = (formData.get('faculty') as string)?.trim() || '';
    const course          = (formData.get('course') as string)?.trim() || '';
    const level           = (formData.get('level') as string)?.trim() || '';
    const cgpa            = (formData.get('cgpa') as string)?.trim() || null;
    const matric_number   = (formData.get('matric_number') as string)?.trim() || null;
    const jamb_number     = (formData.get('jamb_number') as string)?.trim() || null;
    const is_ibeno_origin = formData.get('is_ibeno_origin') === 'true';

    const rawNin       = (formData.get('nin') as string)?.trim() || '';
    const nin          = rawNin.replace(/\D/g, '') || null;
    const bank_name_raw   = (formData.get('bank_name') as string)?.trim() || '';
    const bank_name_other = (formData.get('bank_name_other') as string)?.trim() || '';
    const bank_name    = (bank_name_raw === 'Other' ? bank_name_other : bank_name_raw) || null;
    const account_number  = (formData.get('account_number') as string)?.trim() || null;

    // ─── Server-side validation ───────────────────────────────────────────────

    if (!is_ibeno_origin) {
      return apiError(
        'NOT_IBENO_ORIGIN',
        'This scholarship is exclusively for students of Ibeno origin. Your submission cannot be accepted.',
        400
      );
    }

    if (!nin || !/^\d{11}$/.test(nin)) {
      return apiError(
        'NIN_INVALID',
        'A valid 11-digit National Identification Number (NIN) is required (e.g. 12345678901).',
        400
      );
    }

    if (!account_number || !/^\d{10}$/.test(account_number)) {
      return apiError(
        'ACCOUNT_NUMBER_INVALID',
        'A valid 10-digit Nigerian bank account number (NUBAN) is required (e.g. 0123456789).',
        400
      );
    }

    if (!bank_name) {
      return apiError('BANK_NAME_MISSING', 'Please select your bank name.', 400);
    }

    // Validate JAMB/Matric based on student category
    if (student_category === 'fresh' && !jamb_number) {
      return apiError(
        'JAMB_REQUIRED',
        'Your JAMB Registration Number is required for Fresh Intake applicants.',
        400
      );
    }
    if (student_category === 'returning' && !matric_number) {
      return apiError(
        'MATRIC_REQUIRED',
        'Your Matriculation Number is required for Returning Student applicants.',
        400
      );
    }

    // Normalise identifiers: trim whitespace, uppercase
    const normalizedJamb  = jamb_number  ? jamb_number.trim().toUpperCase()  : null;
    const normalizedMatric = matric_number ? matric_number.trim().toUpperCase() : null;

    // ─── Concurrent duplicate checks ─────────────────────────────────────────
    // NIN is the primary unique identifier. JAMB and Matric are secondary guards.
    const [existingByNin, existingByJamb, existingByMatric] = await Promise.all([
      db.application.findFirst({
        where: { nin },
        select: { id: true, reference_number: true },
      }),
      normalizedJamb
        ? db.application.findFirst({
            where: { jamb_number: normalizedJamb },
            select: { id: true, reference_number: true },
          })
        : Promise.resolve(null),
      normalizedMatric
        ? db.application.findFirst({
            where: { matric_number: normalizedMatric },
            select: { id: true, reference_number: true },
          })
        : Promise.resolve(null),
    ]);

    if (existingByNin) {
      return apiError(
        'NIN_DUPLICATE',
        `An application with this NIN has already been submitted (Ref: ${existingByNin.reference_number}). Each applicant may only submit one application. If you believe this is an error, please contact the IHCDT Secretariat.`,
        409,
        { ref: existingByNin.reference_number }
      );
    }
    if (existingByJamb) {
      return apiError(
        'JAMB_DUPLICATE',
        `An application with this JAMB Registration Number already exists (Ref: ${existingByJamb.reference_number}). If you believe this is an error, please contact the IHCDT Secretariat.`,
        409,
        { ref: existingByJamb.reference_number }
      );
    }
    if (existingByMatric) {
      return apiError(
        'MATRIC_DUPLICATE',
        `An application with this Matriculation Number already exists (Ref: ${existingByMatric.reference_number}). If you believe this is an error, please contact the IHCDT Secretariat.`,
        409,
        { ref: existingByMatric.reference_number }
      );
    }

    // ─── Document validation ──────────────────────────────────────────────────
    const requiredDocs = student_category === 'fresh'
      ? documentRequirements.fresh
      : documentRequirements.returning;

    const uploadedFiles: { docType: string; file: File }[] = [];

    for (const reqDoc of requiredDocs) {
      const docFiles = formData.getAll(`doc_${reqDoc.id}`) as File[];

      if (reqDoc.required && (!docFiles || docFiles.length === 0 || docFiles[0].size === 0)) {
        return apiError(
          'DOCUMENT_MISSING',
          `A required document is missing: "${reqDoc.name}". Please upload this document and try again.`,
          400,
          { documentName: reqDoc.name }
        );
      }

      for (const file of docFiles) {
        if (!file || file.size === 0) continue;

        // Server-side file type validation
        if (
          !siteConfig.allowedFileTypes.includes(file.type) &&
          !siteConfig.allowedFileExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
        ) {
          return apiError(
            'DOCUMENT_TYPE_INVALID',
            `"${file.name}" is not an accepted file format. Only PDF, JPG, JPEG, and PNG files are allowed.`,
            400
          );
        }

        // Server-side size re-check (defence-in-depth against bypassed frontend checks)
        if (file.size > siteConfig.maxFileSize) {
          return apiError(
            'DOCUMENT_TOO_LARGE',
            `"${file.name}" exceeds the maximum allowed file size of 10 MB. Please upload a smaller version.`,
            400
          );
        }

        uploadedFiles.push({ docType: reqDoc.name, file });
      }
    }

    // ─── Create application record + upload documents ─────────────────────────
    const reference_number = generateReferenceNumber();

    const result = await db.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          reference_number,
          full_name,
          address,
          state_of_origin,
          phone,
          email,
          student_category: student_category === 'fresh' ? 'Fresh Intake' : 'Returning Student',
          institution,
          faculty,
          course,
          level,
          cgpa,
          matric_number: normalizedMatric,
          jamb_number: normalizedJamb,
          nin,
          bank_name,
          account_number,
          is_ibeno_origin,
        },
      });

      for (const { docType, file } of uploadedFiles) {
        let buffer: Buffer;
        try {
          buffer = Buffer.from(await file.arrayBuffer());
        } catch {
          throw Object.assign(new Error(`Could not read file "${file.name}". The file may be corrupted.`), {
            errorCode: 'DOCUMENT_READ_ERROR',
          });
        }

        let savedFile;
        try {
          savedFile = await saveDocument(buffer, file.name, file.type, reference_number, docType);
        } catch (storageErr: any) {
          // Wrap storage errors with a recognisable code
          throw Object.assign(
            new Error('The document storage service is temporarily unavailable. Please try again in a moment.'),
            { errorCode: 'STORAGE_ERROR' }
          );
        }

        await tx.document.create({
          data: {
            application_id: application.id,
            document_type: docType,
            original_filename: file.name,
            mime_type: savedFile.mimeType,
            file_size: savedFile.size,
            storage_path: savedFile.filePath,
          },
        });
      }

      return application;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // ─── Send confirmation email (non-blocking) ───────────────────────────────
    try {
      await sendConfirmationEmail({
        to: result.email,
        applicantName: result.full_name,
        referenceNumber: result.reference_number,
        category: result.student_category,
        institution: result.institution,
        course: result.course,
        level: result.level,
      });
    } catch (emailErr: any) {
      // Log but never fail a successful submission due to email issues
      console.error('[Application Submission]: Email delivery failed (application saved successfully):', emailErr?.message || emailErr);
    }

    return NextResponse.json({ success: true, reference_number: result.reference_number });

  } catch (error: any) {
    // ─── Structured error catch ───────────────────────────────────────────────
    // Log full detail server-side; return only safe, categorised message client-side.
    console.error('[API /applications POST] Unhandled error:', {
      code: error?.code,
      errorCode: error?.errorCode,
      message: error?.message,
    });

    // Prisma unique constraint violation (race condition fallback)
    if (error?.code === 'P2002') {
      const target: string[] = error.meta?.target || [];
      if (target.includes('nin')) {
        return apiError(
          'NIN_DUPLICATE',
          'An application with this NIN was submitted concurrently. Only one application per NIN is permitted.',
          409
        );
      }
      if (target.includes('jamb_number')) {
        return apiError(
          'JAMB_DUPLICATE',
          'An application with this JAMB Registration Number was submitted concurrently.',
          409
        );
      }
      if (target.includes('matric_number')) {
        return apiError(
          'MATRIC_DUPLICATE',
          'An application with this Matriculation Number was submitted concurrently.',
          409
        );
      }
      return apiError(
        'DUPLICATE',
        'A duplicate application was detected. Please check your NIN and registration numbers.',
        409
      );
    }

    // Prisma timeout
    if (error?.code === 'P1008' || error?.message?.includes('timed out')) {
      return apiError(
        'SERVER_ERROR',
        'The server took too long to process your application. Please check your internet connection and try again.',
        504
      );
    }

    // Storage / file read errors with our own errorCode
    if (error?.errorCode) {
      return apiError(error.errorCode, error.message, 503);
    }

    // Catch-all — never leak internals
    return apiError(
      'SERVER_ERROR',
      'An unexpected error occurred while processing your application. Please try again. If the problem persists, please contact the IHCDT Secretariat.',
      500
    );
  }
}
