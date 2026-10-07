import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, FileText, Calendar, MapPin, Phone, Mail, GraduationCap } from 'lucide-react';

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const application = await db.application.findUnique({
    where: { id },
    include: { documents: true }
  });

  if (!application) return notFound();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      <header className="bg-slate-900 text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center">
            <Link href="/admin/dashboard" className="mr-4 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            Application Details
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 mt-4 space-y-6">
        
        {/* Header Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="text-sm font-mono text-slate-500 mb-1">{application.reference_number}</div>
            <h2 className="text-2xl font-bold text-slate-800">{application.full_name}</h2>
            <div className="flex items-center text-sm text-slate-600 mt-2 gap-4">
               <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> Submitted: {application.submitted_at.toLocaleDateString()}</span>
               <span className="flex items-center bg-slate-100 px-2 py-1 rounded font-semibold">{application.student_category}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-500 mb-1">Status</span>
            <span className={`px-4 py-2 font-bold rounded-lg ${
                application.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                application.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                application.status === 'Verified' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {application.status}
            </span>
            
            <form action={async (formData) => {
              'use server';
              const newStatus = formData.get('status') as string;
              if (newStatus) {
                const { updateApplicationStatus } = await import('./actions');
                await updateApplicationStatus(application.id, newStatus);
              }
            }} className="mt-4 flex gap-2">
              <select name="status" defaultValue={application.status} className="p-2 border border-slate-300 rounded-lg text-sm focus:outline-none">
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-colors">
                Update
              </button>
            </form>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Applicant Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-800 flex items-center">
              Personal Information
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Full Name</span>
                <span className="text-slate-800 font-medium col-span-2">{application.full_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Email</span>
                <span className="text-slate-800 font-medium col-span-2">{application.email}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Phone</span>
                <span className="text-slate-800 font-medium col-span-2">{application.phone}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">State of Origin</span>
                <span className="text-slate-800 font-medium col-span-2">{application.state_of_origin}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Ibeno Origin Verified (Form)</span>
                <span className="text-slate-800 font-medium col-span-2">{application.is_ibeno_origin ? 'Yes' : 'No'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold col-span-1">Address</span>
                <span className="text-slate-800 font-medium col-span-2">{application.address}</span>
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-800 flex items-center">
              Academic Information
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Institution</span>
                <span className="text-slate-800 font-medium col-span-2">{application.institution}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Faculty</span>
                <span className="text-slate-800 font-medium col-span-2">{application.faculty}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Department</span>
                <span className="text-slate-800 font-medium col-span-2">{application.department}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Course</span>
                <span className="text-slate-800 font-medium col-span-2">{application.course}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Level</span>
                <span className="text-slate-800 font-medium col-span-2">{application.level}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-slate-50 pb-3">
                <span className="text-slate-500 font-semibold col-span-1">Matric Number</span>
                <span className="text-slate-800 font-medium col-span-2">{application.matric_number || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold col-span-1">JAMB Number</span>
                <span className="text-slate-800 font-medium col-span-2">{application.jamb_number || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-800">
            Uploaded Documents
          </div>
          <div className="p-6">
            {application.documents.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No documents uploaded.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {application.documents.map(doc => (
                  <div key={doc.id} className="border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="bg-blue-50 p-2 rounded text-blue-600 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-sm text-slate-800 truncate">{doc.document_type}</p>
                        <p className="text-xs text-slate-500 truncate">{doc.original_filename}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatSize(doc.file_size)}</p>
                      </div>
                    </div>
                    
                    <a 
                      href={`/api/admin/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors shrink-0"
                      title="Download Securely"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
