import nodemailer from 'nodemailer';
import { siteConfig } from '@/config';

export interface ConfirmationEmailPayload {
  to: string;
  applicantName: string;
  referenceNumber: string;
  category: string;
  institution?: string | null;
  course?: string | null;
  level?: string | null;
}

export interface EmailSendResult {
  success: boolean;
  provider: 'resend' | 'smtp' | 'ethereal' | 'none';
  id?: string;
  previewUrl?: string | false;
  error?: string;
}

/**
 * Sanitizes an email address for logging (e.g. j***n@domain.com) to protect user privacy.
 */
function maskEmail(email: string): string {
  try {
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    const maskedName = name.length <= 2 ? name[0] + '***' : name[0] + '***' + name[name.length - 1];
    return `${maskedName}@${domain}`;
  } catch {
    return '***@***.***';
  }
}

/**
 * Builds the responsive HTML body for the application confirmation email.
 */
function buildConfirmationHtml(params: {
  applicantName: string;
  referenceNumber: string;
  category: string;
  institution?: string | null;
  course?: string | null;
  level?: string | null;
  submissionDate: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - ${params.referenceNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
              <div style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #a7f3d0; margin-bottom: 8px;">
                ${siteConfig.organizationName}
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Scholarship Application Received
              </h1>
              <div style="font-size: 13px; color: #d1fae5; margin-top: 6px;">
                Academic Session: ${siteConfig.scholarshipYear}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="font-size: 16px; margin: 0 0 16px 0; color: #1e293b;">
                Dear <strong>${params.applicantName}</strong>,
              </p>
              
              <p style="font-size: 15px; margin: 0 0 24px 0; color: #334155; line-height: 1.6;">
                Thank you for applying for the <strong>${siteConfig.shortOrganizationName} Scholarship Award</strong>. We are pleased to confirm that your application and supporting documentation have been successfully received and logged into our system.
              </p>

              <!-- Reference Number Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #065f46; margin-bottom: 6px;">
                      Your Official Application Reference Number
                    </div>
                    <div style="font-size: 26px; font-weight: 800; font-family: 'Courier New', Courier, monospace; letter-spacing: 2px; color: #047857; margin: 4px 0;">
                      ${params.referenceNumber}
                    </div>
                    <div style="font-size: 12px; color: #047857; margin-top: 6px;">
                      Please save this number securely. You will need it to track your application.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Application Summary Details -->
              <h2 style="font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 12px 0;">
                Application Summary
              </h2>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b; width: 40%;"><strong>Category:</strong></td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${params.category}</td>
                </tr>
                ${params.institution ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b;"><strong>Institution:</strong></td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${params.institution}</td>
                </tr>
                ` : ''}
                ${params.course ? `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b;"><strong>Course of Study:</strong></td>
                  <td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${params.course}${params.level ? ` (${params.level})` : ''}</td>
                </tr>
                ` : ''}
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px 0; color: #64748b;"><strong>Submission Date:</strong></td>
                  <td style="padding: 10px 0; color: #1e293b;">${params.submissionDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #64748b;"><strong>Status:</strong></td>
                  <td style="padding: 10px 0;">
                    <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                      Received & Awaiting Review
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Next Steps -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 0 0 10px 0;">
                  What Happens Next?
                </h3>
                <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.7;">
                  <li><strong>Document Verification:</strong> The IHCDT Secretariat and Verification Committee will examine your uploaded credentials and proof of Ibeno origin.</li>
                  <li><strong>Screening & Assessment:</strong> All qualified candidates will be assessed based on the established scholarship selection guidelines.</li>
                  <li><strong>Official Communication:</strong> Shortlisted and successful candidates will be contacted directly via this email address and SMS.</li>
                </ol>
              </div>

              <!-- Fraud Warning -->
              <p style="font-size: 12px; color: #64748b; background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; margin: 0 0 24px 0; line-height: 1.5;">
                <strong>Important Notice:</strong> Submission of falsified certificates, mismatched National Identification Numbers (NIN), or inaccurate origin claims will result in immediate disqualification and possible blacklisting.
              </p>

              <!-- Signoff -->
              <p style="font-size: 14px; color: #334155; margin: 0;">
                Warm regards,<br>
                <strong style="color: #065f46;">Scholarship Board Secretariat</strong><br>
                ${siteConfig.organizationName}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              <div><strong>${siteConfig.shortOrganizationName} Secretariat</strong></div>
              <div>${siteConfig.contactAddress}</div>
              <div style="margin-top: 4px;">
                Email: <a href="mailto:${siteConfig.contactEmail}" style="color: #047857; text-decoration: none;">${siteConfig.contactEmail}</a> | Phone: ${siteConfig.contactPhone}
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
                This is an automated confirmation from the IHCDT Scholarship Portal. Please do not reply directly to this email.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the plain-text fallback version of the email.
 */
function buildConfirmationText(params: {
  applicantName: string;
  referenceNumber: string;
  category: string;
  institution?: string | null;
  course?: string | null;
  level?: string | null;
  submissionDate: string;
}): string {
  return `
APPLICATION RECEIVED & ACKNOWLEDGED
============================================================
${siteConfig.organizationName}
Scholarship Award Application (${siteConfig.scholarshipYear})
============================================================

Dear ${params.applicantName},

Thank you for applying for the ${siteConfig.shortOrganizationName} Scholarship Award. We are pleased to confirm that your application and supporting documentation have been successfully received and recorded in our portal database.

YOUR APPLICATION REFERENCE NUMBER:
${params.referenceNumber}

Please save this reference number securely as you will need it for all future inquiries.

APPLICATION SUMMARY:
------------------------------------------------------------
- Full Name: ${params.applicantName}
- Reference Number: ${params.referenceNumber}
- Student Category: ${params.category}
${params.institution ? `- Institution: ${params.institution}\n` : ''}${params.course ? `- Course of Study: ${params.course}${params.level ? ` (${params.level})` : ''}\n` : ''}- Submission Date: ${params.submissionDate}
- Current Status: Received & Awaiting Review

WHAT HAPPENS NEXT?
------------------------------------------------------------
1. Document Verification: The IHCDT Secretariat and Verification Committee will review your uploaded credentials and proof of Ibeno origin.
2. Screening & Assessment: Eligible applicants will be evaluated based on the Trust's selection guidelines.
3. Official Communication: Shortlisted and awarded students will be notified via this email address and SMS.

IMPORTANT NOTICE:
All submitted documents are subject to verification with the issuing institutions. Submission of fraudulent documents, invalid National Identification Numbers (NIN), or false claims will lead to immediate disqualification.

============================================================
Secretariat Contact Details:
${siteConfig.contactAddress}
Email: ${siteConfig.contactEmail}
Phone: ${siteConfig.contactPhone}

This is an automated notification. Please do not reply directly to this email.
`.trim();
}

/**
 * Sends confirmation email using Resend API (HTTP), SMTP (Nodemailer), or Ethereal fallback.
 */
export async function sendConfirmationEmail(
  toOrOptions: string | ConfirmationEmailPayload,
  applicantName?: string,
  referenceNumber?: string,
  category?: string
): Promise<EmailSendResult> {
  let to: string;
  let name: string;
  let ref: string;
  let cat: string;
  let inst: string | null = null;
  let course: string | null = null;
  let level: string | null = null;

  if (typeof toOrOptions === 'object') {
    to = toOrOptions.to;
    name = toOrOptions.applicantName;
    ref = toOrOptions.referenceNumber;
    cat = toOrOptions.category;
    inst = toOrOptions.institution || null;
    course = toOrOptions.course || null;
    level = toOrOptions.level || null;
  } else {
    to = toOrOptions;
    name = applicantName || 'Applicant';
    ref = referenceNumber || 'IHCDT-REF';
    cat = category || 'Scholarship Application';
  }

  const submissionDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `Application Received: ${ref} - ${siteConfig.shortOrganizationName} Scholarship`;
  const html = buildConfirmationHtml({
    applicantName: name,
    referenceNumber: ref,
    category: cat,
    institution: inst,
    course,
    level,
    submissionDate,
  });
  const text = buildConfirmationText({
    applicantName: name,
    referenceNumber: ref,
    category: cat,
    institution: inst,
    course,
    level,
    submissionDate,
  });

  const maskedTo = maskEmail(to);
  const fromName = `${siteConfig.shortOrganizationName} Scholarship Portal`;
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || siteConfig.contactEmail;

  // -------------------------------------------------------------
  // Option A: Resend API (HTTP REST — recommended for Vercel)
  // -------------------------------------------------------------
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      console.log(`[Email Service]: Attempting delivery via Resend API to ${maskedTo} for ref ${ref}...`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail.includes('@') ? fromEmail : 'onboarding@resend.dev'}>`,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Resend error HTTP ${res.status}`);
      }

      console.log(`[Email Service]: Email delivered successfully via Resend API to ${maskedTo}. Message ID: ${data.id}`);
      return { success: true, provider: 'resend', id: data.id };
    } catch (resendErr: any) {
      console.error(`[Email Service Warning]: Resend delivery failed for ${maskedTo}:`, resendErr?.message || resendErr);
      // Fall through to SMTP if configured, or return failure
      if (!process.env.SMTP_USER) {
        return { success: false, provider: 'resend', error: resendErr?.message };
      }
    }
  }

  // -------------------------------------------------------------
  // Option B: Standard SMTP via Nodemailer
  // -------------------------------------------------------------
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    try {
      console.log(`[Email Service]: Attempting delivery via SMTP (${process.env.SMTP_HOST || 'default'}) to ${maskedTo} for ref ${ref}...`);
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 15000,
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        text,
      });

      console.log(`[Email Service]: Email delivered successfully via SMTP to ${maskedTo}. Message ID: ${info.messageId}`);
      return { success: true, provider: 'smtp', id: info.messageId };
    } catch (smtpErr: any) {
      console.error(`[Email Service Warning]: SMTP delivery failed for ${maskedTo}:`, smtpErr?.message || smtpErr);
      return { success: false, provider: 'smtp', error: smtpErr?.message };
    }
  }

  // -------------------------------------------------------------
  // Option C: Development / Fallback via Ethereal Email
  // -------------------------------------------------------------
  // If neither RESEND_API_KEY nor SMTP credentials are configured,
  // we generate an Ethereal inbox so the system does not crash and
  // developers can view the live email preview.
  try {
    console.warn(`[Email Service]: No production email credentials found (RESEND_API_KEY or SMTP_USER/PASS missing). Falling back to Ethereal Email for testing...`);
    const testAccount = await nodemailer.createTestAccount();
    const testTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await testTransporter.sendMail({
      from: `"${fromName}" <${siteConfig.contactEmail}>`,
      to,
      subject,
      html,
      text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log(`[Email Service - Dev Preview]: Test confirmation email created for ${maskedTo}!`);
    console.log(`[Email Service - Dev Preview]: View email here: ${previewUrl}`);

    return {
      success: true,
      provider: 'ethereal',
      id: info.messageId,
      previewUrl,
    };
  } catch (fallbackErr: any) {
    console.error(`[Email Service Warning]: Ethereal fallback failed:`, fallbackErr?.message || fallbackErr);
    return {
      success: false,
      provider: 'none',
      error: 'No email service configured and fallback failed',
    };
  }
}
