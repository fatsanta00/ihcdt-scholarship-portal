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

export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    const startDate = new Date(siteConfig.submissionStartDate);
    const endDate = new Date(siteConfig.submissionEndDate);

    if (now < startDate || now > endDate) {
      return NextResponse.json({ error: 'Application portal is currently closed.' }, { status: 403 });
    }

    const formData = await req.formData();
    
    // Parse text fields
    const full_name = formData.get('full_name') as string;
    const address = formData.get('address') as string;
    const state_of_origin = formData.get('state_of_origin') as string;
    const phone = formData.get('phone') as string;
    const email = (formData.get('email') as string)?.trim().toLowerCase() || '';
    const student_category = formData.get('student_category') as string; // 'fresh' or 'returning'
    const institution = formData.get('institution') as string;
    const faculty = formData.get('faculty') as string;
    const course = formData.get('course') as string;
    const level = formData.get('level') as string;
    const cgpa = (formData.get('cgpa') as string) || null;
    const matric_number = (formData.get('matric_number') as string) || null;
    const jamb_number = (formData.get('jamb_number') as string) || null;
    const is_ibeno_origin = formData.get('is_ibeno_origin') === 'true';

    const nin = (formData.get('nin') as string)?.trim() || null;
    const bank_name_raw = (formData.get('bank_name') as string)?.trim() || '';
    const bank_name_other = (formData.get('bank_name_other') as string)?.trim() || '';
    const bank_name = (bank_name_raw === 'Other' ? bank_name_other : bank_name_raw) || null;
    const account_number = (formData.get('account_number') as string)?.trim() || null;

    if (!is_ibeno_origin) {
      return NextResponse.json({ error: 'This scholarship is intended only for students of Ibeno origin.' }, { status: 400 });
    }

    if (!nin || !/^\d{11}$/.test(nin)) {
      return NextResponse.json({ error: 'A valid 11-digit National Identification Number (NIN) is required.' }, { status: 400 });
    }
    if (!account_number || !/^\d{10}$/.test(account_number)) {
      return NextResponse.json({ error: 'A valid 10-digit Bank Account Number is required.' }, { status: 400 });
    }
    if (!bank_name) {
      return NextResponse.json({ error: 'Bank name is required.' }, { status: 400 });
    }

    // Validate JAMB/Matric logic based on category
    if (student_category === 'fresh' && !jamb_number) {
        return NextResponse.json({ error: 'JAMB Registration Number is required for Fresh Intakes.' }, { status: 400 });
    }
    if (student_category === 'returning' && !matric_number) {
        return NextResponse.json({ error: 'Matriculation Number is required for Returning Students.' }, { status: 400 });
    }

    // Normalize identifiers: trim whitespace and uppercase
    const normalizedJamb = jamb_number ? jamb_number.trim().toUpperCase() : null;
    const normalizedMatric = matric_number ? matric_number.trim().toUpperCase() : null;

    // ─── Concurrent duplicate checks ────────────────────────────────────────────
    // All three lookups run simultaneously via Promise.all rather than sequentially.
    // Each query uses an indexed column and selects only id + reference_number,
    // so they are fast point-lookups regardless of dataset size.
    const [existingByEmail, existingByJamb, existingByMatric] = await Promise.all([
      db.application.findFirst({
        where: { email },
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

    if (existingByEmail) {
      return NextResponse.json(
        { error: `An application has already been submitted using this email address (Ref: ${existingByEmail.reference_number}). Each applicant may only submit one application. If you believe this is an error, please contact the IHCDT Secretariat.` },
        { status: 409 }
      );
    }
    if (existingByJamb) {
      return NextResponse.json(
        { error: `An application with this JAMB Registration Number already exists (Ref: ${existingByJamb.reference_number}). If you believe this is an error, please contact the IHCDT Secretariat.` },
        { status: 409 }
      );
    }
    if (existingByMatric) {
      return NextResponse.json(
        { error: `An application with this Matriculation Number already exists (Ref: ${existingByMatric.reference_number}). If you believe this is an error, please contact the IHCDT Secretariat.` },
        { status: 409 }
      );
    }
    // ────────────────────────────────────────────────────────────────────────────

    // Determine required documents
    const requiredDocs = student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning;
    
    // Validate that all required files are present
    const uploadedFiles: { docType: string, file: File }[] = [];
    
    for (const reqDoc of requiredDocs) {
      // Allow multiple files for a specific requirement (like previous_school_fees)
      const files = formData.getAll(`doc_${reqDoc.id}`) as File[];
      
      if (reqDoc.required && (!files || files.length === 0 || files[0].size === 0)) {
        return NextResponse.json({ error: `Missing required document: ${reqDoc.name}` }, { status: 400 });
      }
      
      for (const file of files) {
          if (file && file.size > 0) {
            uploadedFiles.push({ docType: reqDoc.name, file });
          }
      }
    }

    const reference_number = generateReferenceNumber();

    // Use transaction if using postgres, but sqlite also supports transaction for simple inserts
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
        const buffer = Buffer.from(await file.arrayBuffer());
        const savedFile = await saveDocument(buffer, file.name, file.type, reference_number, docType);
        
        await tx.document.create({
          data: {
            application_id: application.id,
            document_type: docType,
            original_filename: file.name,
            mime_type: savedFile.mimeType,
            file_size: savedFile.size,
            storage_path: savedFile.filePath, // using Vercel Blob URL now!
          }
        });
      }

      return application;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    // Send confirmation email after application and documents are safely stored in DB/Storage
    // Wrapped in try/catch to ensure email issues never fail an otherwise successful application
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
      console.error('[Application Submission Notice]: Email sending failed, but application was saved successfully:', emailErr?.message || emailErr);
    }

    return NextResponse.json({ success: true, reference_number: result.reference_number });
  } catch (error: any) {
    console.error('Application submission error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A duplicate application was detected. Please ensure your registration numbers are correct.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
