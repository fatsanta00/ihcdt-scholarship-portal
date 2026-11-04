const fs = require('fs');
const path = require('path');

async function testSingleSubmission() {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  
  // Synthetic dummy PDF buffer
  const samplePdf = Buffer.from('%PDF-1.4 synthetic test pdf document for load testing\n%%EOF');
  
  const formParts = [
    { name: 'full_name', value: 'TEST Applicant One' },
    { name: 'phone', value: '08012345678' },
    { name: 'email', value: 'test.applicant1@example.com' },
    { name: 'address', value: '12 Test Street, Ibeno' },
    { name: 'state_of_origin', value: 'Akwa Ibom' },
    { name: 'is_ibeno_origin', value: 'true' },
    { name: 'student_category', value: 'fresh' },
    { name: 'institution', value: 'University of Uyo' },
    { name: 'faculty', value: 'Engineering' },
    { name: 'course', value: 'Mechanical Engineering' },
    { name: 'level', value: '100' },
    { name: 'jamb_number', value: 'TESTJAMB001' },
    { name: 'declaration', value: 'true' },
  ];

  const docFields = [
    { name: 'doc_certificate_of_origin', filename: 'origin_cert.pdf', buffer: samplePdf, type: 'application/pdf' },
    { name: 'doc_school_certificate', filename: 'waec.pdf', buffer: samplePdf, type: 'application/pdf' },
    { name: 'doc_jamb_admission_letter', filename: 'jamb_letter.pdf', buffer: samplePdf, type: 'application/pdf' },
    { name: 'doc_acceptance_fee_receipt', filename: 'acceptance.pdf', buffer: samplePdf, type: 'application/pdf' },
  ];

  let body = Buffer.alloc(0);

  for (const part of formParts) {
    const partHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`
    );
    body = Buffer.concat([body, partHeader]);
  }

  for (const doc of docFields) {
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${doc.name}"; filename="${doc.filename}"\r\nContent-Type: ${doc.type}\r\n\r\n`
    );
    body = Buffer.concat([body, fileHeader, doc.buffer, Buffer.from('\r\n')]);
  }

  body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

  console.log('Sending single test submission...');
  const start = Date.now();
  const res = await fetch('http://localhost:3001/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body: body,
  });

  const duration = Date.now() - start;
  const status = res.status;
  const data = await res.json();
  console.log(`Status: ${status} in ${duration}ms`, data);
}

testSingleSubmission().catch(console.error);
