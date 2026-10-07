export const siteConfig = {
  organizationName: 'NNPC/SEPNU JV Ibeno Host Community Development Trust (IHCDT)',
  shortOrganizationName: 'IHCDT',
  scholarshipYear: '2026/2027',
  contactEmail: 'mail@hcdt.org',
  contactPhone: '09162857819',
  contactAddress: 'No. 33 Qit Jetty Road, Inua Eyet Ikot Ibeno',
  
  // Submission dates
  submissionStartDate: '2026-09-21T00:00:00.000Z',
  // Using Nov 30 2026 instead of invalid Nov 31
  submissionEndDate: '2026-11-30T23:59:59.999Z',
  
  // File upload configs
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowedFileExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
};

export const documentRequirements = {
  fresh: [
    { id: 'certificate_of_origin', name: 'Certificate of Origin', required: true },
    { id: 'school_certificate', name: 'School Certificate (SSCE, WAEC or NECO)', required: true },
    { id: 'jamb_admission_letter', name: 'JAMB / School Admission Letter', required: true },
    { id: 'acceptance_fee_receipt', name: 'Acceptance Fee Receipt', required: true },
  ],
  returning: [
    { id: 'certificate_of_origin', name: 'Certificate of Origin', required: true },
    { id: 'previous_school_fees', name: 'Previous School Fees Receipts', required: true },
    { id: 'confirmation_letter', name: 'Confirmation Letter from School Faculty or Registrar', required: true },
    { id: 'current_academic_fee', name: 'Current Academic Fee', required: true },
    { id: 'school_id_card', name: 'School Identification Card', required: true },
  ]
};
