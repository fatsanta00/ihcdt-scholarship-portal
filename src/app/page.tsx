import Link from 'next/link';
import { siteConfig } from '@/config';
import { CalendarDays, FileCheck, CheckCircle2, Award, ChevronRight } from 'lucide-react';

export default function Home() {
  const endDate = new Date(siteConfig.submissionEndDate);
  const now = new Date();
  const isClosed = now > endDate;

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-transparent">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-brand-green-200">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:py-6 md:py-8">
          <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 animate-fade-in-up">
            <div className="bg-brand-green-100 p-2.5 sm:p-3 rounded-full mb-1 sm:mb-2 animate-float">
               <Award className="w-8 h-8 sm:w-10 sm:h-10 text-brand-green-700" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-brand-green-800 tracking-tight leading-tight">
              {siteConfig.organizationName}
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
              {siteConfig.scholarshipYear} Scholarship Scheme
            </h2>
            <p className="text-xs sm:text-base md:text-lg text-brand-green-700 font-semibold tracking-wide uppercase">Online Document Submission Portal</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 md:py-20 space-y-8 sm:space-y-12 md:space-y-16">
        {/* Intro */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100/50 p-5 sm:p-8 md:p-12 text-center space-y-6 sm:space-y-8 transform transition-all duration-500 hover:shadow-2xl animate-fade-in-up">
          <p className="text-base sm:text-xl md:text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed font-medium">
            The <span className="font-bold text-brand-green-700">{siteConfig.shortOrganizationName}</span> invites students of Ibeno origin enrolled in accredited government-approved tertiary institutions to submit the required documents for assessment and validation of their eligibility for the <span className="font-bold">{siteConfig.scholarshipYear} Academic Year Scholarship Scheme</span>.
          </p>
          
          <div className="inline-block w-full sm:w-auto bg-brand-gold-50 border-2 border-brand-gold-200 rounded-2xl p-4 sm:p-6 transform transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center justify-center space-x-2.5 sm:space-x-3 text-brand-gold-700 font-bold mb-1.5 sm:mb-2">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse-slow shrink-0" />
              <span className="text-sm sm:text-lg uppercase tracking-wide">Submission Deadline</span>
            </div>
            <p className="text-brand-gold-700 font-extrabold text-xl sm:text-2xl md:text-3xl">
              {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="pt-4 sm:pt-6 border-t border-slate-100">
            <p className="text-sm sm:text-lg text-slate-500 mb-4 sm:mb-6 font-semibold uppercase tracking-wide">This application is for</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 text-slate-700 font-bold">
              <div className="flex items-center justify-center space-x-2.5 sm:space-x-3 bg-brand-green-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-brand-green-800 transition-colors hover:bg-brand-green-100">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-600 shrink-0" />
                <span className="text-base sm:text-lg">New Intakes</span>
              </div>
              <div className="flex items-center justify-center space-x-2.5 sm:space-x-3 bg-brand-green-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-brand-green-800 transition-colors hover:bg-brand-green-100">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-green-600 shrink-0" />
                <span className="text-base sm:text-lg">Returning Students / Beneficiaries</span>
              </div>
            </div>
          </div>

          <div className="pt-4 sm:pt-8">
            {isClosed ? (
              <div className="bg-red-50 text-red-700 px-6 sm:px-8 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg inline-block shadow-sm">
                The submission period for the {siteConfig.scholarshipYear} scheme has closed.
              </div>
            ) : (
              <Link 
                href="/apply"
                className="group w-full sm:w-auto inline-flex items-center justify-center bg-brand-green-700 hover:bg-brand-green-800 text-white text-lg sm:text-xl font-extrabold py-4 sm:py-5 px-8 sm:px-12 rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 sm:hover:-translate-y-1 transition-all duration-300"
              >
                Start Application
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        </div>

        {/* Requirements */}
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-slate-100 p-5 sm:p-8 md:p-10 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center mb-4 sm:mb-6 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="bg-brand-green-100 p-2.5 sm:p-3 rounded-xl mr-3 sm:mr-4 shrink-0">
                 <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-brand-green-700" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                Fresh Intake Requirements
              </h3>
            </div>
            <ul className="space-y-3 sm:space-y-4">
              {[
                'Certificate of Origin',
                'School Certificate (SSCE, WAEC or NECO)',
                'JAMB / School Admission Letter',
                'Acceptance Fee Receipt'
              ].map((item, i) => (
                <li key={i} className="flex items-start group">
                  <div className="bg-brand-green-50 p-1 rounded-lg mt-0.5 mr-2.5 sm:mr-3 group-hover:bg-brand-green-100 transition-colors shrink-0">
                     <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green-600" />
                  </div>
                  <span className="text-sm sm:text-lg text-slate-700 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-slate-100 p-5 sm:p-8 md:p-10 transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center mb-4 sm:mb-6 border-b border-slate-100 pb-3 sm:pb-4">
              <div className="bg-brand-gold-100 p-2.5 sm:p-3 rounded-xl mr-3 sm:mr-4 shrink-0">
                 <FileCheck className="w-6 h-6 sm:w-8 sm:h-8 text-brand-gold-700" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                Returning Students Requirements
              </h3>
            </div>
            <ul className="space-y-3 sm:space-y-4">
              {[
                'Certificate of Origin',
                'Previous School Fees Receipts',
                'Confirmation Letter from School Faculty or Registrar',
                'Current Academic Fee',
                'School Identification Card'
              ].map((item, i) => (
                <li key={i} className="flex items-start group">
                  <div className="bg-brand-gold-50 p-1 rounded-lg mt-0.5 mr-2.5 sm:mr-3 group-hover:bg-brand-gold-100 transition-colors shrink-0">
                     <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-gold-600" />
                  </div>
                  <span className="text-sm sm:text-lg text-slate-700 font-medium leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-gold-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-extrabold mb-4 sm:mb-6 text-white flex items-center">
               <span className="bg-slate-800 p-1.5 sm:p-2 rounded-lg mr-2.5 sm:mr-3">⚠️</span> Important Information
            </h3>
            <ul className="space-y-3 sm:space-y-4 text-sm sm:text-lg text-slate-300 ml-2 sm:ml-4">
              <li className="flex items-start before:content-['•'] before:mr-2.5 sm:before:mr-3 before:text-brand-green-400">All submitted documents must be current, authentic, legible and properly identifiable.</li>
              <li className="flex items-start before:content-['•'] before:mr-2.5 sm:before:mr-3 before:text-brand-green-400">Information provided will be used for assessment and verification of students&apos; qualification status.</li>
              <li className="flex items-start before:content-['•'] before:mr-2.5 sm:before:mr-3 before:text-brand-green-400">Failure to submit the required documents within the stipulated period may affect eligibility assessment.</li>
              <li className="flex items-start before:content-['•'] before:mr-2.5 sm:before:mr-3 before:text-red-400"><strong className="text-red-300 font-bold">Submission of false or fraudulent documents may result in disqualification and appropriate action.</strong></li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-lg border border-slate-100 p-5 sm:p-8 md:p-12 text-center animate-fade-in-up mb-8 sm:mb-16" style={{ animationDelay: '400ms' }}>
          <h3 className="text-lg sm:text-2xl font-extrabold text-brand-green-900 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            For further enquiries and submission details, please contact the {siteConfig.shortOrganizationName} Secretariat through the designated channels:
          </h3>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center items-stretch sm:items-center gap-3 sm:gap-4 text-sm sm:text-lg">
            <div className="bg-brand-green-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm border border-brand-green-100 transition-all hover:shadow-md hover:bg-brand-green-100">
               <span className="text-brand-green-800 font-medium mr-2">Email:</span> 
               <a href={`mailto:${siteConfig.contactEmail}`} className="text-brand-green-900 font-extrabold hover:underline break-all">{siteConfig.contactEmail}</a>
            </div>
            <div className="bg-brand-green-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm border border-brand-green-100 transition-all hover:shadow-md hover:bg-brand-green-100">
               <span className="text-brand-green-800 font-medium mr-2">Phone:</span> 
               <span className="text-brand-green-900 font-extrabold">{siteConfig.contactPhone}</span>
            </div>
            <div className="bg-brand-green-50 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm border border-brand-green-100 transition-all hover:shadow-md hover:bg-brand-green-100">
               <span className="text-brand-green-800 font-medium mr-2">Address:</span> 
               <span className="text-brand-green-900 font-extrabold">{siteConfig.contactAddress}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
