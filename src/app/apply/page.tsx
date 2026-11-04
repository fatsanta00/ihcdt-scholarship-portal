import ApplicationForm from '@/components/ApplicationForm';
import { siteConfig } from '@/config';

export const metadata = {
  title: `Apply - ${siteConfig.shortOrganizationName} Scholarship`,
};

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-transparent font-sans py-6 sm:py-10 md:py-16 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto mb-6 sm:mb-10 text-center animate-fade-in-up">
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-brand-green-800 mb-2 sm:mb-3 tracking-tight">Scholarship Application</h1>
        <p className="text-base sm:text-lg md:text-xl text-slate-600 font-medium">{siteConfig.scholarshipYear} Academic Year</p>
      </div>
      
      <ApplicationForm />
    </div>
  );
}
