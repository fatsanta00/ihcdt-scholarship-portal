import Link from 'next/link';
import { CheckCircle, Award } from 'lucide-react';
import { siteConfig } from '@/config';

export default async function SuccessPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-center animate-pop">
        <div className="bg-gradient-to-br from-brand-green-600 to-brand-green-800 p-10 text-white flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-pulse-slow"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <CheckCircle className="w-24 h-24 text-brand-green-100 mb-6 animate-pop" style={{ animationDelay: '200ms' }} />
            <h1 className="text-3xl font-extrabold tracking-tight">Application Submitted Successfully</h1>
          </div>
        </div>
        
        <div className="p-10 space-y-8 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <p className="text-slate-600 text-lg font-medium leading-relaxed">
            Your scholarship documents have been successfully submitted for assessment and validation.
          </p>
          
          <div className="bg-brand-gold-50 p-8 rounded-2xl border border-brand-gold-200 transform transition-transform hover:scale-[1.02]">
            <p className="text-sm text-brand-gold-800 font-extrabold mb-2 uppercase tracking-widest">Your Reference Number</p>
            <p className="text-3xl font-extrabold text-slate-900 tracking-wider font-mono">{reference}</p>
          </div>
          
          <p className="text-sm text-slate-500 font-medium">
            A confirmation email has been sent to your provided email address. Please keep this reference number secure for future correspondence.
          </p>
          
          <div className="pt-6 border-t border-slate-100">
            <Link 
              href="/"
              className="inline-flex items-center justify-center bg-slate-900 text-white font-extrabold text-lg py-4 px-10 rounded-2xl hover:bg-slate-800 hover:-translate-y-1 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
