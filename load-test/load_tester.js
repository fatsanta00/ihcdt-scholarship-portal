const fs = require('fs');
const path = require('path');
const os = require('os');
const { PrismaClient } = require('@prisma/client');

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/ibeno_test?schema=public';
process.env.DATABASE_URL = DB_URL;
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const BASE_URL = 'http://localhost:3001';

// Generate realistic synthetic files
const SYNTHETIC_FILES = {
  small_pdf: {
    name: 'cert_small.pdf',
    type: 'application/pdf',
    buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(50 * 1024, 0x41), Buffer.from('\n%%EOF')]),
  },
  medium_pdf: {
    name: 'transcript.pdf',
    type: 'application/pdf',
    buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(250 * 1024, 0x42), Buffer.from('\n%%EOF')]),
  },
  sample_jpeg: {
    name: 'school_id.jpeg',
    type: 'image/jpeg',
    buffer: Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.alloc(150 * 1024, 0x43), Buffer.from([0xFF, 0xD9])]),
  },
  receipt_pdf: {
    name: 'receipt.pdf',
    type: 'application/pdf',
    buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(80 * 1024, 0x44), Buffer.from('\n%%EOF')]),
  },
};

const FIRST_NAMES = ['Emem', 'Edidiong', 'Bassey', 'Ubong', 'Aniefiok', 'Utibe', 'Idorenyin', 'Nsikak', 'Ekemini', 'Inemesit', 'Imaobong', 'Kufre', 'Mfon', 'Anietie', 'Ekikere'];
const LAST_NAMES = ['Akpan', 'Effiong', 'Udoh', 'Asuquo', 'Etuk', 'Okon', 'Ekpo', 'Archibong', 'Bassey', 'Umana', 'Essien', 'Antai', 'Ita', 'Eyo', 'Inyang'];
const INSTITUTIONS = ['University of Uyo', 'Akwa Ibom State University', 'Federal Polytechnic Ukana', 'Heritage Polytechnic', 'College of Education Afaha Nsit'];
const COURSES = ['Computer Science', 'Mechanical Engineering', 'Petroleum Engineering', 'Accounting', 'Medicine & Surgery', 'Biochemistry', 'Mass Communication'];

function generateApplicantPayload(index, isReturning = false, customJamb = null, customMatric = null) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const fullName = `TEST ${firstName} ${lastName} ${index}`;
  const jambNumber = customJamb || (isReturning ? null : `TEST-JAMB-${String(index).padStart(6, '0')}`);
  const matricNumber = customMatric || (isReturning ? `TEST-MAT-${String(index).padStart(6, '0')}` : null);
  const category = isReturning ? 'returning' : 'fresh';

  const formParts = [
    { name: 'full_name', value: fullName },
    { name: 'phone', value: `080${String(10000000 + index).slice(-8)}` },
    { name: 'email', value: `test.applicant.${index}@scholarship.test` },
    { name: 'address', value: `${(index % 100) + 1} Memorial Way, Ibeno` },
    { name: 'state_of_origin', value: 'Akwa Ibom' },
    { name: 'is_ibeno_origin', value: 'true' },
    { name: 'student_category', value: category },
    { name: 'institution', value: INSTITUTIONS[index % INSTITUTIONS.length] },
    { name: 'faculty', value: 'Faculty of Sciences' },
    { name: 'course', value: COURSES[index % COURSES.length] },
    { name: 'level', value: isReturning ? '300' : '100' },
    { name: 'declaration', value: 'true' },
  ];

  if (jambNumber) formParts.push({ name: 'jamb_number', value: jambNumber });
  if (matricNumber) {
    formParts.push({ name: 'matric_number', value: matricNumber });
    formParts.push({ name: 'cgpa', value: (2.5 + (index % 25) * 0.1).toFixed(2) });
  }

  const docFields = [];
  if (!isReturning) {
    docFields.push({ name: 'doc_certificate_of_origin', file: SYNTHETIC_FILES.small_pdf });
    docFields.push({ name: 'doc_school_certificate', file: SYNTHETIC_FILES.medium_pdf });
    docFields.push({ name: 'doc_jamb_admission_letter', file: SYNTHETIC_FILES.small_pdf });
    docFields.push({ name: 'doc_acceptance_fee_receipt', file: SYNTHETIC_FILES.receipt_pdf });
  } else {
    docFields.push({ name: 'doc_certificate_of_origin', file: SYNTHETIC_FILES.small_pdf });
    docFields.push({ name: 'doc_previous_school_fees', file: SYNTHETIC_FILES.receipt_pdf });
    docFields.push({ name: 'doc_confirmation_letter', file: SYNTHETIC_FILES.medium_pdf });
    docFields.push({ name: 'doc_current_academic_fee', file: SYNTHETIC_FILES.receipt_pdf });
    docFields.push({ name: 'doc_school_id_card', file: SYNTHETIC_FILES.sample_jpeg });
  }

  let body = Buffer.alloc(0);
  for (const part of formParts) {
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`);
    body = Buffer.concat([body, header]);
  }

  for (const doc of docFields) {
    const fileHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${doc.name}"; filename="${doc.file.name}"\r\nContent-Type: ${doc.file.type}\r\n\r\n`
    );
    body = Buffer.concat([body, fileHeader, doc.file.buffer, Buffer.from('\r\n')]);
  }

  body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

  return { boundary, body, length: body.length };
}

async function submitApplicant(index, isReturning = false, customJamb = null, customMatric = null) {
  const { boundary, body, length } = generateApplicantPayload(index, isReturning, customJamb, customMatric);
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(length),
      },
      body: body,
    });
    const latency = Date.now() - start;
    const json = await res.json().catch(() => ({}));
    return {
      success: res.status === 200,
      status: res.status,
      latency,
      ref: json.reference_number || null,
      error: json.error || null,
      bytes: length,
    };
  } catch (err) {
    return {
      success: false,
      status: 0,
      latency: Date.now() - start,
      error: err.message,
      bytes: length,
    };
  }
}

function calculateStats(latencies) {
  if (latencies.length === 0) return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p = (pct) => sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: p(50),
    p90: p(90),
    p95: p(95),
    p99: p(99),
  };
}

// Concurrency pool runner
async function runStage(totalCount, concurrency, startIndex = 0) {
  console.log(`\n======================================================`);
  console.log(`Starting Stage: ${totalCount} requests | Concurrency: ${concurrency} | Start Index: ${startIndex}`);
  console.log(`======================================================`);

  const results = [];
  const latencies = [];
  let successCount = 0;
  let failureCount = 0;
  const errorBreakdown = {};
  let totalBytes = 0;

  const stageStart = Date.now();
  let currentIndex = startIndex;
  const endIndex = startIndex + totalCount;

  async function worker() {
    while (currentIndex < endIndex) {
      const idx = currentIndex++;
      const isReturning = idx % 2 === 1;
      const res = await submitApplicant(idx, isReturning);
      results.push(res);
      latencies.push(res.latency);
      totalBytes += res.bytes || 0;

      if (res.success) {
        successCount++;
      } else {
        failureCount++;
        const code = String(res.status || res.error || 'unknown');
        errorBreakdown[code] = (errorBreakdown[code] || 0) + 1;
      }

      if ((idx - startIndex + 1) % Math.max(1, Math.floor(totalCount / 10)) === 0 || idx === endIndex - 1) {
        const elapsed = (Date.now() - stageStart) / 1000;
        const currentRps = (results.length / elapsed).toFixed(1);
        process.stdout.write(`  -> Completed: ${results.length}/${totalCount} (${currentRps} req/s) - Success: ${successCount}, Fail: ${failureCount}\r`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationSec = (Date.now() - stageStart) / 1000;
  const stats = calculateStats(latencies);
  const rps = parseFloat((totalCount / durationSec).toFixed(2));
  const successRate = parseFloat(((successCount / totalCount) * 100).toFixed(2));
  const throughputMB = parseFloat((totalBytes / (1024 * 1024) / durationSec).toFixed(2));

  console.log(`\nStage Completed in ${durationSec.toFixed(2)}s`);
  console.log(`  Success: ${successCount}/${totalCount} (${successRate}%) | Failed: ${failureCount}`);
  console.log(`  Throughput: ${rps} req/s | Upload Bandwidth: ${throughputMB} MB/s`);
  console.log(`  Latency: Avg=${stats.avg}ms | P50=${stats.p50}ms | P95=${stats.p95}ms | P99=${stats.p99}ms | Max=${stats.max}ms`);
  if (failureCount > 0) {
    console.log(`  Errors breakdown:`, errorBreakdown);
  }

  return {
    totalCount,
    concurrency,
    durationSec,
    successCount,
    failureCount,
    successRate,
    rps,
    throughputMB,
    stats,
    errorBreakdown,
  };
}

module.exports = { runStage, submitApplicant, generateApplicantPayload, prisma };
