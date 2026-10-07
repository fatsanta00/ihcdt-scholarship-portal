'use client';

import { useState } from 'react';
import { siteConfig, documentRequirements } from '@/config';
import FileUpload from './FileUpload';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = [
  'Applicant Details',
  'Student Category',
  'Required Documents',
  'Review',
  'Submit'
];

export default function ApplicationForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({ is_ibeno_origin: '' });
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleFileChange = (docId: string, file: File | null) => {
    if (file) {
      setFiles({ ...files, [docId]: file });
      setErrors({ ...errors, [docId]: '' });
    } else {
      const newFiles = { ...files };
      delete newFiles[docId];
      setFiles(newFiles);
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (currentStep === 0) {
      const requiredFields = ['full_name', 'address', 'state_of_origin', 'phone', 'email', 'institution', 'faculty', 'department', 'course', 'level'];
      requiredFields.forEach(field => {
        if (!formData[field]) newErrors[field] = 'This field is required';
      });
      if (formData.is_ibeno_origin === 'false') {
        newErrors.is_ibeno_origin = 'This scholarship is specifically intended for students of Ibeno origin.';
      } else if (!formData.is_ibeno_origin) {
        newErrors.is_ibeno_origin = 'Please confirm if you are of Ibeno origin';
      }
    } else if (currentStep === 1) {
      if (!formData.student_category) newErrors.student_category = 'Please select a student category';
    } else if (currentStep === 2) {
      const docs = formData.student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning;
      docs.forEach(doc => {
        if (doc.required && !files[doc.id]) {
          newErrors[doc.id] = 'This document is required';
        }
      });
    } else if (currentStep === 4) {
       if (!formData.declaration) newErrors.declaration = 'You must agree to the declaration to submit';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key] === 'true' ? 'true' : formData[key] === 'false' ? 'false' : formData[key]);
      });
      
      Object.keys(files).forEach(key => {
        submitData.append(`doc_${key}`, files[key]);
      });

      const res = await fetch('/api/applications', {
        method: 'POST',
        body: submitData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      router.push(`/success/${data.reference_number}`);
    } catch (err: any) {
      setErrors({ submit: err.message });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white/90 backdrop-blur-md rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      {/* Progress Bar */}
      <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200/80 px-6 py-5 flex flex-wrap justify-between items-center gap-2">
        {STEPS.map((step, idx) => (
          <div key={idx} className={`flex items-center text-sm font-bold transition-all duration-300 ${idx === currentStep ? 'text-brand-green-700 transform scale-105' : idx < currentStep ? 'text-brand-green-600' : 'text-slate-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 transition-all duration-300 shadow-sm ${idx === currentStep ? 'bg-brand-green-700 text-white shadow-md' : idx < currentStep ? 'bg-brand-green-100' : 'bg-slate-200 text-slate-500'}`}>
              {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
            </span>
            <span className="hidden sm:inline">{step}</span>
            {idx < STEPS.length - 1 && <ChevronRight className="w-5 h-5 mx-2 text-slate-300" />}
          </div>
        ))}
      </div>

      <div className="p-8 md:p-12 min-h-[400px]">
        {errors.submit && (
          <div className="mb-8 p-5 bg-red-50 text-red-700 border border-red-200 rounded-2xl flex items-start animate-pop">
            <AlertCircle className="w-6 h-6 mr-3 shrink-0 mt-0.5" />
            <span className="text-lg font-medium">{errors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STEP 0: Details */}
          {currentStep === 0 && (
            <div className="space-y-8 animate-fade-in-up">
              <h2 className="text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Applicant Details</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Full Name</label>
                  <input type="text" name="full_name" value={formData.full_name || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.full_name && <p className="text-red-500 text-sm mt-1 font-medium">{errors.full_name}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.phone && <p className="text-red-500 text-sm mt-1 font-medium">{errors.phone}</p>}
                </div>
                <div className="col-span-2 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Email Address</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.email && <p className="text-red-500 text-sm mt-1 font-medium">{errors.email}</p>}
                </div>
                <div className="col-span-2 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Residential Address</label>
                  <input type="text" name="address" value={formData.address || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.address && <p className="text-red-500 text-sm mt-1 font-medium">{errors.address}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">State of Origin</label>
                  <input type="text" name="state_of_origin" value={formData.state_of_origin || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.state_of_origin && <p className="text-red-500 text-sm mt-1 font-medium">{errors.state_of_origin}</p>}
                </div>
                
                {/* Ibeno Origin Check */}
                <div className="col-span-2 bg-brand-gold-50 p-6 rounded-2xl border-2 border-brand-gold-100 mt-2 transition-all hover:border-brand-gold-300">
                   <label className="block text-lg font-extrabold text-slate-800 mb-4">Are you of Ibeno origin? <span className="text-red-500">*</span></label>
                   <div className="flex space-x-8">
                     <label className="flex items-center space-x-3 cursor-pointer group">
                       <input type="radio" name="is_ibeno_origin" value="true" checked={formData.is_ibeno_origin === 'true'} onChange={handleInputChange} className="w-6 h-6 text-brand-green-600 focus:ring-brand-green-600" />
                       <span className="text-xl text-slate-700 font-bold group-hover:text-brand-green-700 transition-colors">Yes</span>
                     </label>
                     <label className="flex items-center space-x-3 cursor-pointer group">
                       <input type="radio" name="is_ibeno_origin" value="false" checked={formData.is_ibeno_origin === 'false'} onChange={handleInputChange} className="w-6 h-6 text-red-600 focus:ring-red-600" />
                       <span className="text-xl text-slate-700 font-bold group-hover:text-red-700 transition-colors">No</span>
                     </label>
                   </div>
                   {errors.is_ibeno_origin && <p className="text-red-700 text-sm mt-4 font-bold bg-red-100 p-3 rounded-xl animate-pop">{errors.is_ibeno_origin}</p>}
                </div>

                <div className="col-span-2 pt-6 mt-4 border-t border-slate-100">
                  <h3 className="text-2xl font-extrabold text-slate-800 mb-6">Academic Information</h3>
                </div>
                
                <div className="col-span-2 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Name of Tertiary Institution</label>
                  <input type="text" name="institution" value={formData.institution || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.institution && <p className="text-red-500 text-sm mt-1 font-medium">{errors.institution}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Faculty</label>
                  <input type="text" name="faculty" value={formData.faculty || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.faculty && <p className="text-red-500 text-sm mt-1 font-medium">{errors.faculty}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Department</label>
                  <input type="text" name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.department && <p className="text-red-500 text-sm mt-1 font-medium">{errors.department}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Course of Study</label>
                  <input type="text" name="course" value={formData.course || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.course && <p className="text-red-500 text-sm mt-1 font-medium">{errors.course}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Current Level</label>
                  <input type="text" name="level" value={formData.level || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                  {errors.level && <p className="text-red-500 text-sm mt-1 font-medium">{errors.level}</p>}
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">Matriculation/Registration Number</label>
                  <input type="text" name="matric_number" value={formData.matric_number || ''} onChange={handleInputChange} className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                </div>
                <div className="col-span-2 md:col-span-1 group">
                  <label className="block text-sm font-bold text-slate-700 mb-2 transition-colors group-hover:text-brand-green-700">JAMB Registration Number</label>
                  <input type="text" name="jamb_number" value={formData.jamb_number || ''} onChange={handleInputChange} placeholder="Required for fresh intakes" className="w-full p-4 text-lg border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-green-500 outline-none transition-all hover:border-brand-green-300 bg-slate-50 focus:bg-white" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Category */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-slide-in-right">
              <h2 className="text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Student Category</h2>
              <p className="text-lg text-slate-600 font-medium">Select your student category to view the required documents.</p>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <label className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${formData.student_category === 'fresh' ? 'border-brand-green-500 bg-brand-green-50 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-brand-green-300 bg-white hover:shadow-md'}`}>
                  <input type="radio" name="student_category" value="fresh" checked={formData.student_category === 'fresh'} onChange={handleInputChange} className="sr-only" />
                  <div className={`font-extrabold text-2xl mb-3 ${formData.student_category === 'fresh' ? 'text-brand-green-800' : 'text-slate-800'}`}>Fresh Intake</div>
                  <p className="text-base text-slate-600 font-medium">For new students who are applying for the first time.</p>
                </label>
                
                <label className={`p-8 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${formData.student_category === 'returning' ? 'border-brand-green-500 bg-brand-green-50 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-brand-green-300 bg-white hover:shadow-md'}`}>
                  <input type="radio" name="student_category" value="returning" checked={formData.student_category === 'returning'} onChange={handleInputChange} className="sr-only" />
                  <div className={`font-extrabold text-2xl mb-3 ${formData.student_category === 'returning' ? 'text-brand-green-800' : 'text-slate-800'}`}>Returning Student</div>
                  <p className="text-base text-slate-600 font-medium">For students who have previously benefited or are returning students.</p>
                </label>
              </div>
              {errors.student_category && <p className="text-red-600 text-sm font-bold mt-2 animate-pop">{errors.student_category}</p>}
            </div>
          )}

          {/* STEP 2: Documents */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-slide-in-right">
              <h2 className="text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Required Documents</h2>
              <p className="text-lg text-slate-600 font-medium">Please upload all the required documents for your category (<span className="font-bold text-brand-green-700">{formData.student_category === 'fresh' ? 'Fresh Intake' : 'Returning Student'}</span>).</p>
              
              <div className="space-y-6">
                {(formData.student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning).map((doc, idx) => (
                  <div key={doc.id} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <FileUpload 
                      id={doc.id}
                      title={doc.name}
                      required={doc.required}
                      file={files[doc.id] || null}
                      error={errors[doc.id]}
                      onChange={(file) => handleFileChange(doc.id, file)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-slide-in-right">
              <h2 className="text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Review Application</h2>
              <p className="text-lg text-slate-600 font-medium">Please review your information before final submission.</p>
              
              <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 text-base transition-all hover:bg-slate-50">
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Applicant</div>
                    <div className="font-extrabold text-xl text-slate-900">{formData.full_name}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">State of Origin</div>
                    <div className="font-extrabold text-xl text-slate-900">{formData.state_of_origin}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Institution</div>
                    <div className="font-extrabold text-xl text-slate-900">{formData.institution}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-bold mb-1 uppercase tracking-wider text-xs">Student Category</div>
                    <div className="font-extrabold text-xl text-brand-green-700">{formData.student_category === 'fresh' ? 'Fresh Intake' : 'Returning Student / Beneficiary'}</div>
                  </div>
                  <div className="col-span-2 mt-4 pt-6 border-t border-slate-200">
                    <div className="text-slate-500 font-bold mb-4 uppercase tracking-wider text-xs">Uploaded Documents</div>
                    <ul className="grid sm:grid-cols-2 gap-4">
                      {(formData.student_category === 'fresh' ? documentRequirements.fresh : documentRequirements.returning).map(doc => (
                        <li key={doc.id} className="flex items-center text-slate-700 font-bold bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                           {files[doc.id] ? <CheckCircle2 className="w-6 h-6 text-brand-green-500 mr-3 shrink-0 animate-pop" /> : <span className="w-6 h-6 mr-3 shrink-0 bg-slate-100 rounded-full"></span>}
                           {doc.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Submit */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-slide-in-right">
              <h2 className="text-3xl font-extrabold text-slate-800 border-b border-slate-100 pb-4">Declaration & Submission</h2>
              
              <div className="bg-brand-gold-50 border-2 border-brand-gold-200 p-8 rounded-3xl space-y-6 transition-all hover:shadow-lg">
                <p className="font-extrabold text-slate-800 text-xl leading-relaxed">I certify that the information and documents submitted are accurate, authentic, current, legible and properly identifiable.</p>
                
                <label className="flex items-start space-x-4 cursor-pointer group bg-white p-4 rounded-2xl border border-brand-gold-100 transition-colors hover:border-brand-gold-300">
                  <input type="checkbox" name="declaration" checked={formData.declaration === 'true'} onChange={(e) => {
                    setFormData({...formData, declaration: e.target.checked ? 'true' : ''});
                    setErrors({...errors, declaration: ''});
                  }} className="mt-1 w-6 h-6 text-brand-green-600 rounded border-slate-300 focus:ring-brand-green-600 transition-all" />
                  <span className="text-slate-800 font-bold text-lg group-hover:text-brand-green-800 transition-colors">I confirm that the information and documents I have submitted are accurate and authentic.</span>
                </label>
                {errors.declaration && <p className="text-red-600 text-sm font-bold bg-red-100 p-3 rounded-xl animate-pop">{errors.declaration}</p>}
                
                <p className="text-base text-slate-600 font-medium">I understand that submitting false or fraudulent documents may result in disqualification and may be reported to the appropriate authorities.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-8 border-t border-slate-100">
            {currentStep > 0 ? (
              <button type="button" onClick={prevStep} disabled={isSubmitting} className="flex items-center px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 text-lg font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 disabled:opacity-50">
                <ChevronLeft className="w-6 h-6 mr-2" /> Back
              </button>
            ) : <div></div>}
            
            {currentStep < STEPS.length - 1 ? (
              <button type="button" onClick={nextStep} className="group flex items-center px-10 py-4 bg-brand-green-700 text-white text-lg font-bold rounded-2xl hover:bg-brand-green-800 hover:-translate-y-1 shadow-lg hover:shadow-xl transition-all duration-300">
                Next <ChevronRight className="w-6 h-6 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </button>
            ) : (
              <button type="submit" disabled={isSubmitting} className="group flex items-center px-12 py-4 bg-brand-green-700 text-white text-xl font-extrabold rounded-2xl hover:bg-brand-green-800 hover:-translate-y-1 shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-70 disabled:hover:transform-none">
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
