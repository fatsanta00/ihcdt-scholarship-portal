import { db } from '@/lib/db';
import Link from 'next/link';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';
import { siteConfig } from '@/config';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const { q, status, type } = await searchParams;

  const where: any = {};
  if (q) {
    where.OR = [
      { full_name: { contains: q } },
      { reference_number: { contains: q } },
      { institution: { contains: q } },
    ];
  }
  if (status) where.status = status;
  if (type) where.student_category = type;

  const [applications, totalCount, freshCount, returningCount, verifiedCount] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { submitted_at: 'desc' },
    }),
    db.application.count(),
    db.application.count({ where: { student_category: 'Fresh Intake' } }),
    db.application.count({ where: { student_category: 'Returning Student' } }),
    db.application.count({ where: { status: 'Verified' } }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">{siteConfig.shortOrganizationName} Admin Dashboard</h1>
          <div className="flex gap-4">
             <span className="text-slate-300 font-medium text-sm py-2 bg-slate-800 px-4 rounded-full">Logged in as Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in-up">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md">
             <div className="bg-blue-50 p-4 rounded-xl text-blue-600"><FileText className="w-8 h-8" /></div>
             <div>
               <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">Total Applications</p>
               <p className="text-3xl font-extrabold text-slate-800">{totalCount}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md">
             <div className="bg-brand-green-50 p-4 rounded-xl text-brand-green-600"><Users className="w-8 h-8" /></div>
             <div>
               <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">Fresh Intakes</p>
               <p className="text-3xl font-extrabold text-slate-800">{freshCount}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md">
             <div className="bg-brand-gold-50 p-4 rounded-xl text-brand-gold-600"><Users className="w-8 h-8" /></div>
             <div>
               <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">Returning Students</p>
               <p className="text-3xl font-extrabold text-slate-800">{returningCount}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-4 transition-transform hover:-translate-y-1 hover:shadow-md">
             <div className="bg-teal-50 p-4 rounded-xl text-teal-600"><CheckCircle className="w-8 h-8" /></div>
             <div>
               <p className="text-sm text-slate-500 font-bold uppercase tracking-wide">Verified</p>
               <p className="text-3xl font-extrabold text-slate-800">{verifiedCount}</p>
             </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Recent Applications</h2>
            <form className="flex w-full md:w-auto gap-2">
              <input 
                type="text" 
                name="q" 
                placeholder="Search name, ref, inst..." 
                defaultValue={q}
                className="p-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 flex-1 md:w-64"
              />
              <select name="status" defaultValue={status} className="p-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Verified">Verified</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select name="type" defaultValue={type} className="p-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="">All Types</option>
                <option value="Fresh Intake">Fresh Intake</option>
                <option value="Returning Student">Returning</option>
              </select>
              <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-slate-900 transition-colors">
                Filter
              </button>
            </form>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-sm border-b">
                  <th className="p-4 font-semibold">Reference</th>
                  <th className="p-4 font-semibold">Applicant</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Institution</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">No applications found.</td>
                  </tr>
                ) : applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono text-sm text-slate-600">{app.reference_number}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{app.full_name}</div>
                      <div className="text-xs text-slate-500">{app.email}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{app.student_category}</td>
                    <td className="p-4 text-sm text-slate-700 truncate max-w-[200px]" title={app.institution}>{app.institution}</td>
                    <td className="p-4 text-sm text-slate-600">{app.submitted_at.toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        app.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'Under Review' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'Verified' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link href={`/admin/applications/${app.id}`} className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
