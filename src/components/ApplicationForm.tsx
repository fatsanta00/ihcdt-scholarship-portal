'use client';

import { useState, useCallback } from 'react';
import { siteConfig, documentRequirements } from '@/config';
import FileUpload from './FileUpload';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import { compressFiles } from '@/lib/imageCompression';
import {
  FieldErrors,
  PayloadErrors,
  SubmissionErrors,
  resolveApiError,
  formatFileSize,
  classifyNetworkError,
  type ApiErrorCode,
} from '@/lib/errorMessages';
import {
  useToast,
  ToastContainer,
  OfflineBanner,
  FieldError,
  SubmissionErrorBanner,
} from './Toast';

const STEPS = [
  'Student Category',
  'Applicant Details',
  'Required Documents',
  'Bank & Identity Details',
  'Review',
  'Submit',
];

const NIGERIAN_BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'UBA',
  'Zenith Bank',
  'Fidelity Bank',
  'FCMB',
  'Union Bank',
  'Sterling Bank',
  'Stanbic IBTC',
  'Wema Bank',
  'Ecobank',
  'Polaris Bank',
  'Jaiz Bank',
  'Kuda Bank',
  'Moniepoint',
  'Opay',
  'PalmPay',
  'Providus Bank',
];

/** Simple email format check */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ApplicationForm() {
  const router = useRouter();
  const { toasts, toast, dismiss } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({ is_ibeno_origin: '' });
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'compressing' | 'uploading' | 'saving' | 'done' | 'error'>('idle');
  // Keep a prepared FormData payload so the user can retry without recompressing
  const [retryPayload, setRetryPayload] = useState<FormData | null>(null);

  // ─── Input handlers ─────────────────────────────────────────────────────────

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  }, []);

  const handleFileChange = useCallback((docId: string, newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFiles((prev) => ({ ...prev, [docId]: newFiles }));
      setErrors((prev) => ({ ...prev, [docId]: '' }));
    } else {
      setFiles((prev) => {
        const updated = { ...prev };
        delete updated[docId];
        return updated;
      });
    }
  }, []);

  // ─── Per-step validation ────────────────────────────────────────────────────

  const validateStep = useCallback((): boolean => {
    const e: Record<string, string> = {};

    if (currentStep === 0) {
      if (!formData.student_category) e.student_category = 'Please select a student category to continue.';

    } else if (currentStep === 1) {
      // Required text fields with descriptive labels
      const required: { key: string; label: string }[] = [
        { key: 'full_name',       label: 'Full Name' },
        { key: 'phone',           label: 'Phone Number' },
        { key: 'email',           label: 'Email Address' },
        { key: 'address',         label: 'Residential Address' },
        { key: 'state_of_origin', label: 'State of Origin' },
        { key: 'institution',     label: 'Name of Tertiary Institution' },
        { key: 'faculty',         label: 'Faculty' },
        { key: 'course',          label: 'Department / Course of Study' },
        { key: 'level',           label: 'Current Level' },
      ];

      required.forEach(({ key, label }) => {
        if (!formData[key]?.trim()) e[key] = FieldErrors.required(label);
      });

      // Email format
      if (formData.email && !EMAIL_RE.test(formData.email.trim())) {
        e.email = FieldErrors.invalidEmail();
      }

      // Category-specific fields
      if (formData.student_category === 'fresh') {
        if (!formData.jamb_number?.trim()) e.jamb_number = FieldErrors.jambRequired();
      } else if (formData.student_category === 'returning') {
        if (!formData.matric_number?.trim()) e.matric_number = FieldErrors.matricRequired();
        if (!formData.cgpa?.trim()) e.cgpa = FieldErrors.required('Current Academic CGPA');
      }

      // Ibeno origin
      if (formData.is_ibeno_origin === 'false') {
        e.is_ibeno_origin = FieldErrors.ibenoIneligible();
      } else if (!formData.is_ibeno_origin) {
        e.is_ibeno_origin = FieldErrors.ibenoRequired();
      }

    } else if (currentStep === 2) {
      const docs = formData.student_category === 'fresh'
        ? documentRequirements.fresh
        : documentRequirements.returning;

      docs.forEach((doc) => {
        if (doc.required && (!files[doc.id] || files[doc.id].length === 0)) {
          e[doc.id] = `"${doc.name}" is required. Please upload this document before proceeding.`;
        }
      });

    } else if (currentStep === 3) {
      if (!formData.nin) {
        e.nin = FieldErrors.ninRequired();
      } else if (!/^\d{11}$/.test(formData.nin)) {
        e.nin = FieldErrors.ninInvalid();
      }

      if (!formData.bank_name) {
        e.bank_name = FieldErrors.bankRequired();
      } else if (formData.bank_name === 'Other' && !formData.bank_name_other?.trim()) {
        e.bank_name_other = FieldErrors.bankOtherRequired();
      }

      if (!formData.account_number) {
        e.account_number = FieldErrors.accountRequired();
      } else if (!/^\d{10}$/.test(formData.account_number)) {
        e.account_number = FieldErrors.accountInvalid();
      }

    } else if (currentStep === 5) {
      if (!formData.declaration) e.declaration = FieldErrors.declarationRequired();
    }

    setErrors(e);

    if (Object.keys(e).length > 0) {
      // Scroll to the first error
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }

    return Object.keys(e).length === 0;
  }, [currentStep, formData, files]);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const nextStep = useCallback(() => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ─── Submission ─────────────────────────────────────────────────────────────

  /**
   * Builds the FormData payload with auto-compressed files, runs pre-flight
   * size check, and returns the payload + total byte count.
   * Extracted so it can be called on initial submit AND on retry.
   */
  const buildPayload = useCallback(async (): Promise<{ payload: FormData; totalBytes: number }> => {
    setSubmitStatus('compressing');

    const optimizedFilesRecord: Record<string, File[]> = {};
    let totalBytes = 0;

    for (const key of Object.keys(files)) {
      try {
        const compressed = await compressFiles(files[key] || []);
        optimizedFilesRecord[key] = compressed;
        compressed.forEach((f) => { totalBytes += f.size; });
      } catch {
        // Compression failed — use originals and account for their size
        optimizedFilesRecord[key] = files[key];
        files[key].forEach((f) => { totalBytes += f.size; });
      }
    }

    const MAX_PAYLOAD = 4.2 * 1024 * 1024; // 4.2 MB pre-flight guard
    if (totalBytes > MAX_PAYLOAD) {
      throw new Error(PayloadErrors.tooLarge(formatFileSize(totalBytes), formatFileSize(MAX_PAYLOAD)));
    }

    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      payload.append(key, val === 'true' ? 'true' : val === 'false' ? 'false' : val);
    });
    Object.keys(optimizedFilesRecord).forEach((key) => {
      optimizedFilesRecord[key].forEach((file) => {
        payload.append(`doc_${key}`, file);
      });
    });

    return { payload, totalBytes };
  }, [files, formData]);

  /**
   * Dispatches the FormData to the API, parses the response safely, and throws
   * a descriptive Error on any failure. Does not set any state directly.
   */
  const dispatchSubmission = useCallback(async (payload: FormData): Promise<string> => {
    setSubmitStatus('uploading');

    // Check online before wasting time building a request
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(SubmissionErrors.offline());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75_000); // 75 s

    let res: Response;
    try {
      res = await fetch('/api/applications', {
        method: 'POST',
        body: payload,
        signal: controller.signal,
      });
    } catch (networkErr) {
      throw new Error(classifyNetworkError(networkErr));
    } finally {
      clearTimeout(timeoutId);
    }

    setSubmitStatus('saving');

    // Safe JSON parsing — avoids SyntaxError on 413 / HTML gateway pages
    const contentType = res.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      try { data = await res.json(); } catch { data = null; }
    }

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('Your uploaded documents exceed the server upload limit (4.5 MB). Image documents were automatically compressed, so please check if you have large PDF files and try reducing their quality before resubmitting.');
      }
      if (res.status === 429) throw new Error(SubmissionErrors.tooManyRequests());
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error(SubmissionErrors.serverBusy());
      }

      // Use structured errorCode from our API for precise messages
      const resolved = resolveApiError(
        data?.errorCode as ApiErrorCode | undefined,
        data?.error || '',
        data?.meta
      );

      // If the error maps to a specific field, set it inline rather than in the banner
      if (resolved.fieldKey) {
        setErrors((prev) => ({ ...prev, [resolved.fieldKey!]: resolved.message }));
        // Navigate back to the step containing that field
        const fieldStep = getStepForField(resolved.fieldKey);
        if (fieldStep !== null && fieldStep !== currentStep) {
          setCurrentStep(fieldStep);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }

      throw new Error(resolved.message);
    }

    return data?.reference_number as string;
  }, [currentStep]);

  /** Maps a field key to its form step index */
  function getStepForField(fieldKey: string): number | null {
    const stepMap: Record<string, number> = {
      full_name: 1, phone: 1, email: 1, address: 1,
      state_of_origin: 1, institution: 1, faculty: 1, course: 1, level: 1,
      jamb_number: 1, matric_number: 1, cgpa: 1, is_ibeno_origin: 1,
      nin: 3, bank_name: 3, bank_name_other: 3, account_number: 3,
    };
    return stepMap[fieldKey] ?? null;
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (isSubmitting) return; // Prevent double-submit

    setIsSubmitting(true);
    setSubmitError('');
    setRetryPayload(null);

    try {
      const { payload } = await buildPayload();
      setRetryPayload(payload);
      const refNumber = await dispatchSubmission(payload);
      setSubmitStatus('done');
      toast({
        variant: 'success',
        title: 'Application submitted successfully!',
        description: `Your reference number is ${refNumber}. You will be redirected shortly.`,
        duration: 10000,
      });
      router.push(`/success/${refNumber}`);
    } catch (err: any) {
      setSubmitStatus('error');
      setIsSubmitting(false);

      const message = err?.message || SubmissionErrors.unexpected();
      setSubmitError(message);

      toast({
        variant: 'error',
        title: 'Submission failed',
        description: message.length > 120 ? message.slice(0, 117) + '…' : message,
        duration: 0, // persistent — user must dismiss
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [validateStep, isSubmitting, buildPayload, dispatchSubmission, toast, router]);

  /** Retry using the same compressed payload (saves recompression time) */
  const handleRetry = useCallback(async () => {
    if (isSubmitting || !retryPayload) return;

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitStatus('uploading');

    try {
      const refNumber = await dispatchSubmission(retryPayload);
      setSubmitStatus('done');
      toast({ variant: 'success', title: 'Application submitted!', description: `Reference: ${refNumber}`, duration: 10000 });
      router.push(`/success/${refNumber}`);
    } catch (err: any) {
      setSubmitStatus('error');
      setIsSubmitting(false);
      const message = err?.message || SubmissionErrors.unexpected();
      setSubmitError(message);
    }
  }, [isSubmitting, retryPayload, dispatchSubmission, toast, router]);

  // ─── Submission status label ─────────────────────────────────────────────────

  const statusLabel = {
    compressing: 'Optimising Documents…',
    uploading:   'Uploading Documents…',
    saving:      'Saving Application…',
    done:        'Submission Successful!',
    error:       'Submission Failed',
    idle:        'Submitting Application…',
  }[submitStatus] ?? 'Submitting…';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <OfflineBanner />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>

        {/* Progress Bar */}
        <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200/80 px-3 sm:px-6 py-4">
          <div className="flex items-center overflow-x-auto gap-0 scrollbar-hide">
            {STEPS.map((step, idx) => (
              <div key={idx} className={`flex items-center shrink-0 text-xs sm:text-sm font-bold transition-all duration-300 ${idx === currentStep ? 'text-brand-green-700' : idx < currentStep ? 'text-brand-green-600' : 'text-slate-400'}`}>
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm text-xs sm:text-sm ${idx === currentStep ? 'bg-brand-green-700 text-white shadow-md' : idx < currentStep ? 'bg-brand-green-100 text-brand-green-700' : 'bg-slate-200 text-slate-500'}`}>
                  {idx < currentStep ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : idx + 1}
                </span>
                <span className="hidden md:inline ml-1.5 whitespace-nowrap">{step}</span>
                {idx < STEPS.length - 1 && <ChevronRight className="w-4 h-4 mx-1 sm:mx-2 text-slate-300 shrink-0" />}
              </div>
            ))}
          </div>
          <div className="mt-2 md:hidden text-center text-xs font-bold text-brand-green-700">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </div>
        </div>

        <div className="p-5 sm:p-8 md:p-12 min-h-[400px] relative">

          {/* Submission loading overlay */}
          {isSubmitting && (
            <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-3xl">
              <div className="flex flex-col items-center gap-5 text-center px-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-brand-green-50 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-brand-green-600 animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-brand-green-200 animate-ping opacity-30" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-slate-800 mb-1">{statusLabel}</p>
                  <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto">
                    {submitStatus === 'compressing'
                      ? 'Optimising your documents to ensure fast, reliable upload…'
                      : 'Please wait while we securely process your application. Do not close this page.'}
                  </p>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-brand-green-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submission error banner with retry */}
          <SubmissionErrorBanner
            message={submitError}
            onDismiss={() => setSubmitError('')}
            onRetry={retryPayload ? handleRetry : undefined}
          />

          <form onSubmit={handleSubmit} className="space-y-8" noValidate>

            {/* ── STEP 0: Student Category ── */}
            {currentStep === 0 && (
              <div className="space-y-6 sm:space-y-8 animate-slide-in-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Student Category</h2>
                <p className="text-base sm:text-lg text-slate-600 font-medium">Select your student category to view the required documents and fields.</p>

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <label className={`p-5 sm:p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${formData.student_category === 'fresh' ? 'border-brand-green-500 bg-brand-green-50 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-brand-green-300 bg-white hover:shadow-md'}`}>
                    <input type="radio" name="student_category" value="fresh" checked={formData.student_category === 'fresh'} onChange={handleInputChange} className="sr-only" />
                    <div className={`font-extrabold text-xl sm:text-2xl mb-2 sm:mb-3 ${formData.student_category === 'fresh' ? 'text-brand-green-800' : 'text-slate-800'}`}>Fresh Intake</div>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">For new students who are applying for the first time.</p>
                  </label>

                  <label className={`p-5 sm:p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${formData.student_category === 'returning' ? 'border-brand-green-500 bg-brand-green-50 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-brand-green-300 bg-white hover:shadow-md'}`}>
                    <input type="radio" name="student_category" value="returning" checked={formData.student_category === 'returning'} onChange={handleInputChange} className="sr-only" />
                    <div className={`font-extrabold text-xl sm:text-2xl mb-2 sm:mb-3 ${formData.student_category === 'returning' ? 'text-brand-green-800' : 'text-slate-800'}`}>Returning Student</div>
                    <p className="text-sm sm:text-base text-slate-600 font-medium">For students who have previously benefited or are returning students.</p>
                  </label>
                </div>
                <FieldError message={errors.student_category} />
              </div>
            )}

            {/* ── STEP 1: Applicant Details ── */}
            {currentStep === 1 && (
              <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-3 sm:pb-4">Applicant Details</h2>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Full Name */}
                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Full Name <span className="text-red-500">*</span></label>
                    <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange}
                      aria-describedby={errors.full_name ? 'err-full_name' : undefined}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.full_name ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.full_name} id="err-full_name" />
                  </div>

                  {/* Phone */}
                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Phone Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange}
                      aria-describedby={errors.phone ? 'err-phone' : undefined}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.phone ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.phone} id="err-phone" />
                  </div>

                  {/* Email */}
                  <div className="col-span-2 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange}
                      placeholder="e.g. yourname@gmail.com"
                      aria-describedby={errors.email ? 'err-email' : undefined}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.email ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.email} id="err-email" />
                  </div>

                  {/* Address */}
                  <div className="col-span-2 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Residential Address <span className="text-red-500">*</span></label>
                    <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange}
                      aria-describedby={errors.address ? 'err-address' : undefined}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.address ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.address} id="err-address" />
                  </div>

                  {/* State of Origin */}
                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">State of Origin <span className="text-red-500">*</span></label>
                    <input type="text" name="state_of_origin" value={formData.state_of_origin || ''} onChange={handleInputChange}
                      aria-describedby={errors.state_of_origin ? 'err-state_of_origin' : undefined}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.state_of_origin ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.state_of_origin} id="err-state_of_origin" />
                  </div>

                  {/* Ibeno Origin */}
                  <div className="col-span-2 bg-brand-gold-50 p-4 sm:p-6 rounded-2xl border-2 border-brand-gold-200 mt-2 transition-all hover:border-brand-gold-400">
                    <label className="block text-base sm:text-lg font-extrabold text-slate-800 mb-3 sm:mb-4">
                      Are you of Ibeno origin? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-6 sm:space-x-8">
                      <label className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group">
                        <input type="radio" name="is_ibeno_origin" value="true" checked={formData.is_ibeno_origin === 'true'} onChange={handleInputChange} className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-600 focus:ring-brand-green-600 border-slate-400" />
                        <span className="text-lg sm:text-xl text-slate-800 font-bold group-hover:text-brand-green-700 transition-colors">Yes</span>
                      </label>
                      <label className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group">
                        <input type="radio" name="is_ibeno_origin" value="false" checked={formData.is_ibeno_origin === 'false'} onChange={handleInputChange} className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 focus:ring-red-600 border-slate-400" />
                        <span className="text-lg sm:text-xl text-slate-800 font-bold group-hover:text-red-700 transition-colors">No</span>
                      </label>
                    </div>
                    {errors.is_ibeno_origin && (
                      <p role="alert" className="text-red-700 text-sm mt-3 sm:mt-4 font-bold bg-red-100 p-3 rounded-xl animate-pop">{errors.is_ibeno_origin}</p>
                    )}
                  </div>

                  {/* Academic Information */}
                  <div className="col-span-2 pt-4 sm:pt-6 mt-2 sm:mt-4 border-t border-slate-200">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-4 sm:mb-6">Academic Information</h3>
                  </div>

                  <div className="col-span-2 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Name of Tertiary Institution <span className="text-red-500">*</span></label>
                    <input type="text" name="institution" value={formData.institution || ''} onChange={handleInputChange}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.institution ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.institution} />
                  </div>

                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Faculty <span className="text-red-500">*</span></label>
                    <input type="text" name="faculty" value={formData.faculty || ''} onChange={handleInputChange}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.faculty ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.faculty} />
                  </div>

                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Department / Course of Study <span className="text-red-500">*</span></label>
                    <input type="text" name="course" value={formData.course || ''} onChange={handleInputChange}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.course ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.course} />
                  </div>

                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Current Level <span className="text-red-500">*</span></label>
                    <input type="text" name="level" value={formData.level || ''} onChange={handleInputChange}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.level ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                    <FieldError message={errors.level} />
                  </div>

                  {formData.student_category === 'returning' && (
                    <div className="col-span-2 md:col-span-1 group animate-fade-in-up">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Current Academic CGPA <span className="text-red-500">*</span></label>
                      <input type="text" name="cgpa" value={formData.cgpa || ''} onChange={handleInputChange} placeholder="e.g. 3.50"
                        className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.cgpa ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                      <FieldError message={errors.cgpa} />
                    </div>
                  )}

                  {formData.student_category === 'fresh' && (
                    <div className="col-span-2 md:col-span-1 group animate-fade-in-up">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">JAMB Registration Number <span className="text-red-500">*</span></label>
                      <input type="text" name="jamb_number" value={formData.jamb_number || ''} onChange={handleInputChange}
                        onBlur={(e) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value.trim().toUpperCase() }))}
                        className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.jamb_number ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                      <FieldError message={errors.jamb_number} />
                      <p className="text-xs text-slate-500 mt-1">Enter your JAMB number as it appears on your result slip (letters are converted to uppercase automatically).</p>
                    </div>
                  )}

                  {formData.student_category === 'returning' && (
                    <>
                      <div className="col-span-2 md:col-span-1 group animate-fade-in-up">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">Matriculation Number <span className="text-red-500">*</span></label>
                        <input type="text" name="matric_number" value={formData.matric_number || ''} onChange={handleInputChange}
                          onBlur={(e) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value.trim().toUpperCase() }))}
                          className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.matric_number ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`} />
                        <FieldError message={errors.matric_number} />
                        <p className="text-xs text-slate-500 mt-1">Enter your matriculation number as it appears on your student ID (letters are converted to uppercase automatically).</p>
                      </div>
                      <div className="col-span-2 md:col-span-1 group animate-fade-in-up">
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">JAMB Registration Number (Optional)</label>
                        <input type="text" name="jamb_number" value={formData.jamb_number || ''} onChange={handleInputChange}
                          className="w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border border-slate-300 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-400 bg-slate-50 focus:bg-white" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: Required Documents ── */}
            {currentStep === 2 && (
              <div className="space-y-6 sm:space-y-8 animate-slide-in-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-3 sm:pb-4">Required Documents</h2>
                <p className="text-base sm:text-lg text-slate-700 font-medium">
                  Please upload all required documents for your category (
                  <span className="font-bold text-brand-green-700">
                    {formData.student_category === 'fresh' ? 'Fresh Intake' : 'Returning Student'}
                  </span>).
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 font-medium">
                  <strong>Tip:</strong> Photos taken with your phone are automatically compressed to ensure fast, reliable upload. You do not need to manually resize them.
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {(formData.student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning).map((doc, idx) => {
                    const isMultiple = doc.id === 'previous_school_fees';
                    return (
                      <div key={doc.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                        <FileUpload
                          id={doc.id}
                          title={doc.name}
                          required={doc.required}
                          files={files[doc.id] || []}
                          error={errors[doc.id]}
                          multiple={isMultiple}
                          maxFiles={isMultiple ? 10 : 1}
                          onChange={(selectedFiles) => handleFileChange(doc.id, selectedFiles)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 3: Bank & Identity Details ── */}
            {currentStep === 3 && (
              <div className="space-y-6 sm:space-y-8 animate-slide-in-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-3 sm:pb-4">Bank &amp; Identity Details</h2>
                <p className="text-base sm:text-lg text-slate-600 font-medium">
                  Please enter your National Identification Number (NIN) and valid Nigerian bank account details for verification and scholarship disbursement.
                </p>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* NIN */}
                  <div className="col-span-2 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                      National Identification Number (NIN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      name="nin"
                      value={formData.nin || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData((prev: any) => ({ ...prev, nin: val }));
                        setErrors((prev) => ({ ...prev, nin: '' }));
                      }}
                      placeholder="Enter 11-digit NIN (e.g. 12345678901)"
                      aria-describedby={errors.nin ? 'err-nin' : 'hint-nin'}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white tracking-widest font-mono ${errors.nin ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p id="hint-nin" className="text-xs text-slate-500">Must be exactly 11 numeric digits — no letters or symbols.</p>
                      <span className={`text-xs font-mono font-bold ${(formData.nin || '').length === 11 ? 'text-brand-green-700' : 'text-slate-400'}`}>
                        {(formData.nin || '').length}/11
                      </span>
                    </div>
                    <FieldError message={errors.nin} id="err-nin" />
                  </div>

                  {/* Bank Name */}
                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="bank_name"
                      value={formData.bank_name || ''}
                      onChange={handleInputChange}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.bank_name ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`}
                    >
                      <option value="">-- Select Bank --</option>
                      {NIGERIAN_BANKS.map((bank) => (
                        <option key={bank} value={bank}>{bank}</option>
                      ))}
                      <option value="Other">Other (Specify below)</option>
                    </select>
                    <FieldError message={errors.bank_name} />
                  </div>

                  {/* Account Number */}
                  <div className="col-span-2 md:col-span-1 group">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                      Bank Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      name="account_number"
                      value={formData.account_number || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData((prev: any) => ({ ...prev, account_number: val }));
                        setErrors((prev) => ({ ...prev, account_number: '' }));
                      }}
                      placeholder="Enter 10-digit NUBAN (e.g. 0123456789)"
                      aria-describedby={errors.account_number ? 'err-account' : 'hint-account'}
                      className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white tracking-widest font-mono ${errors.account_number ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <p id="hint-account" className="text-xs text-slate-500">Must be exactly 10 numeric digits (your NUBAN account number).</p>
                      <span className={`text-xs font-mono font-bold ${(formData.account_number || '').length === 10 ? 'text-brand-green-700' : 'text-slate-400'}`}>
                        {(formData.account_number || '').length}/10
                      </span>
                    </div>
                    <FieldError message={errors.account_number} id="err-account" />
                  </div>

                  {/* Other Bank Name */}
                  {formData.bank_name === 'Other' && (
                    <div className="col-span-2 group animate-fade-in-up">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
                        Specify Bank Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="bank_name_other"
                        value={formData.bank_name_other || ''}
                        onChange={handleInputChange}
                        placeholder="Enter the official name of your bank"
                        className={`w-full p-3.5 sm:p-4 text-base sm:text-lg text-slate-900 border rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all bg-slate-50 focus:bg-white ${errors.bank_name_other ? 'border-red-400 bg-red-50/30' : 'border-slate-300 hover:border-brand-green-400'}`}
                      />
                      <FieldError message={errors.bank_name_other} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 4: Review ── */}
            {currentStep === 4 && (
              <div className="space-y-6 sm:space-y-8 animate-slide-in-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-3 sm:pb-4">Review Application</h2>
                <p className="text-base sm:text-lg text-slate-700 font-medium">Please carefully review your information before final submission.</p>

                <div className="bg-slate-50/50 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-6 sm:space-y-8 text-base transition-all hover:bg-slate-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-y-6 sm:gap-x-8">
                    <div>
                      <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Applicant</div>
                      <div className="font-extrabold text-lg sm:text-xl text-slate-900 break-words">{formData.full_name}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Email</div>
                      <div className="font-bold text-lg sm:text-xl text-slate-900 break-all">{formData.email}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">State of Origin</div>
                      <div className="font-extrabold text-lg sm:text-xl text-slate-900">{formData.state_of_origin}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Institution</div>
                      <div className="font-extrabold text-lg sm:text-xl text-slate-900 break-words">{formData.institution}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Student Category</div>
                      <div className="font-extrabold text-lg sm:text-xl text-brand-green-700">
                        {formData.student_category === 'fresh' ? 'Fresh Intake' : 'Returning Student / Beneficiary'}
                      </div>
                    </div>

                    {/* Bank & Identity */}
                    <div className="col-span-1 sm:col-span-2 pt-4 sm:pt-6 border-t border-slate-200">
                      <div className="text-slate-500 font-bold mb-3 sm:mb-4 uppercase tracking-wider text-xs">Bank &amp; Identity Details</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-white p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">NIN</div>
                          <div className="font-mono font-bold text-slate-900 text-base sm:text-lg tracking-wider">{formData.nin || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</div>
                          <div className="font-bold text-slate-900 text-base sm:text-lg break-words">
                            {formData.bank_name === 'Other' ? (formData.bank_name_other || 'Other') : (formData.bank_name || '-')}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</div>
                          <div className="font-mono font-bold text-slate-900 text-base sm:text-lg tracking-wider">{formData.account_number || '-'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Documents */}
                    <div className="col-span-1 sm:col-span-2 pt-2">
                      <div className="text-slate-500 font-bold mb-3 sm:mb-4 uppercase tracking-wider text-xs">Uploaded Documents</div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {(formData.student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning).map((doc) => {
                          const uploaded = files[doc.id]?.length > 0;
                          return (
                            <li key={doc.id} className="flex flex-col text-slate-800 font-bold bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex items-center">
                                {uploaded
                                  ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-500 mr-2.5 sm:mr-3 shrink-0 animate-pop" />
                                  : <span className="w-5 h-5 sm:w-6 sm:h-6 mr-2.5 sm:mr-3 shrink-0 bg-slate-200 rounded-full" />}
                                <span className="text-sm sm:text-base leading-snug">{doc.name}</span>
                              </div>
                              {uploaded && files[doc.id].length > 1 && (
                                <div className="ml-8 sm:ml-9 mt-1 text-xs sm:text-sm text-brand-green-700">{files[doc.id].length} files attached</div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: Declaration & Submit ── */}
            {currentStep === 5 && (
              <div className="space-y-6 sm:space-y-8 animate-slide-in-right">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-3 sm:pb-4">Declaration &amp; Submission</h2>

                <div className="bg-brand-gold-50 border-2 border-brand-gold-300 p-5 sm:p-8 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-6 transition-all hover:shadow-lg">
                  <p className="font-extrabold text-slate-800 text-lg sm:text-xl leading-relaxed">
                    I certify that the information and documents submitted are accurate, authentic, current, legible and properly identifiable.
                  </p>

                  <label className="flex items-start space-x-3 sm:space-x-4 cursor-pointer group bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-brand-gold-200 transition-colors hover:border-brand-gold-400">
                    <input
                      type="checkbox"
                      name="declaration"
                      checked={formData.declaration === 'true'}
                      onChange={(e) => {
                        setFormData((prev: any) => ({ ...prev, declaration: e.target.checked ? 'true' : '' }));
                        setErrors((prev) => ({ ...prev, declaration: '' }));
                      }}
                      className="mt-1 w-5 h-5 sm:w-6 sm:h-6 text-brand-green-600 rounded border-slate-300 focus:ring-brand-green-600 transition-all shrink-0"
                    />
                    <span className="text-slate-800 font-bold text-base sm:text-lg group-hover:text-brand-green-900 transition-colors leading-snug">
                      I confirm that the information and documents I have submitted are accurate and authentic.
                    </span>
                  </label>
                  {errors.declaration && (
                    <p role="alert" className="text-red-700 text-sm font-bold bg-red-100 p-3 rounded-xl animate-pop">
                      {errors.declaration}
                    </p>
                  )}

                  <p className="text-sm sm:text-base text-slate-700 font-medium">
                    I understand that submitting false or fraudulent documents may result in disqualification and may be reported to the appropriate authorities.
                  </p>
                </div>
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6 sm:pt-8 border-t border-slate-200">
              {currentStep > 0 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center px-6 py-3.5 sm:py-4 bg-white border-2 border-slate-300 text-slate-800 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2" /> Back
                </button>
              ) : <div className="hidden sm:block" />}

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full sm:w-auto group flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 bg-brand-green-700 text-white text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl hover:bg-brand-green-800 hover:-translate-y-0.5 sm:hover:-translate-y-1 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  Next <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-1.5 sm:ml-2 transform group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto group flex items-center justify-center px-8 sm:px-12 py-3.5 sm:py-4 bg-brand-green-700 text-white text-base sm:text-xl font-extrabold rounded-xl sm:rounded-2xl hover:bg-brand-green-800 hover:-translate-y-0.5 sm:hover:-translate-y-1 shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-70 disabled:hover:transform-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin mr-2 shrink-0" />
                      <span>{statusLabel}</span>
                    </>
                  ) : submitError && retryPayload ? (
                    <>
                      <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 mr-2 shrink-0" />
                      <span>Retry Submission</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
