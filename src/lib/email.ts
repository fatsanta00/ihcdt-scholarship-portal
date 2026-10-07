import nodemailer from 'nodemailer';
import { siteConfig } from '@/config';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendConfirmationEmail(
  to: string,
  applicantName: string,
  referenceNumber: string,
  category: string
) {
  if (!process.env.SMTP_USER) {
    console.warn('SMTP credentials not configured. Skipping confirmation email.');
    return;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
      <h2 style="color: #005f00;">Application Received</h2>
      <p>Dear ${applicantName},</p>
      
      <p>This is to confirm that your scholarship documents have been successfully submitted to the <strong>${siteConfig.organizationName}</strong> for assessment and validation.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #005f00;">
        <p style="margin: 0 0 10px 0;"><strong>Application Details:</strong></p>
        <p style="margin: 0 0 5px 0;"><strong>Reference Number:</strong> ${referenceNumber}</p>
        <p style="margin: 0 0 5px 0;"><strong>Application Category:</strong> ${category}</p>
        <p style="margin: 0;"><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <p>Please keep your Reference Number secure as you may need it for future correspondence.</p>
      
      <p><em>Note: All submitted documents are subject to verification. Submission of false or fraudulent documents may result in disqualification and appropriate action.</em></p>
      
      <p>Best regards,<br/><strong>IHCDT Secretariat</strong></p>
    </div>
  `;

  await transporter.sendMail({
    from: `"${siteConfig.shortOrganizationName} Scholarship Portal" <${siteConfig.contactEmail}>`,
    to,
    subject: `Application Received - ${referenceNumber}`,
    html,
  });
}
