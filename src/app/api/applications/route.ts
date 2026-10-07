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
    const email = formData.get('email') as string;
    const student_category = formData.get('student_category') as string; // 'fresh' or 'returning'
    const institution = formData.get('institution') as string;
    const faculty = formData.get('faculty') as string;
    const department = formData.get('department') as string;
    const course = formData.get('course') as string;
    const level = formData.get('level') as string;
    const matric_number = (formData.get('matric_number') as string) || null;
    const jamb_number = (formData.get('jamb_number') as string) || null;
    const is_ibeno_origin = formData.get('is_ibeno_origin') === 'true';

    if (!is_ibeno_origin) {
      return NextResponse.json({ error: 'This scholarship is intended only for students of Ibeno origin.' }, { status: 400 });
    }

    // Determine required documents
    const requiredDocs = student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning;
    
    // Validate that all required files are present
    const uploadedFiles: { docType: string, file: File }[] = [];
    
    for (const reqDoc of requiredDocs) {
      const file = formData.get(`doc_${reqDoc.id}`) as File;
      if (reqDoc.required && (!file || !(file instanceof Blob) || file.size === 0)) {
        return NextResponse.json({ error: `Missing required document: ${reqDoc.name}` }, { status: 400 });
      }
      if (file && file.size > 0) {
        uploadedFiles.push({ docType: reqDoc.name, file });
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
          department,
          course,
          level,
          matric_number,
          jamb_number,
          is_ibeno_origin,
        },
      });

      for (const { docType, file } of uploadedFiles) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const savedFile = await saveDocument(buffer, file.name, file.type);
        
        await tx.document.create({
          data: {
            application_id: application.id,
            document_type: docType,
            original_filename: file.name,
            mime_type: savedFile.mimeType,
            file_size: savedFile.size,
            storage_path: savedFile.filename, // we just store the safe uuid filename
          }
        });
      }

      return application;
    });

    // Send email asynchronously without blocking the response
    sendConfirmationEmail(result.email, result.full_name, result.reference_number, result.student_category).catch(console.error);

    return NextResponse.json({ success: true, reference_number: result.reference_number });
  } catch (error: any) {
    console.error('Application submission error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
