'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';

export default function AdminLogoutButton({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      try {
        localStorage.setItem('admin_logged_out', Date.now().toString());
        localStorage.removeItem('admin_last_activity');
      } catch (e) {
        // LocalStorage might be disabled or throw in some sandboxes
      }

      router.push('/admin/login?reason=logged_out');
      router.refresh();
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      title="Log out of Admin Panel"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-red-600 hover:text-white border border-slate-700 hover:border-red-500 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60 cursor-pointer ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
          <span>Logging out...</span>
        </>
      ) : (
        <>
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </>
      )}
    </button>
  );
}
