'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_THRESHOLD_MS = 55 * 60 * 1000;  // 55 minutes (5 min warning)
const THROTTLE_INTERVAL_MS = 10 * 1000;       // Throttle activity updates to every 10s
const STORAGE_KEY_ACTIVITY = 'admin_last_activity';
const STORAGE_KEY_LOGGED_OUT = 'admin_logged_out';

export default function AdminSessionManager() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(300);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);
  const warningActiveRef = useRef<boolean>(false);

  // Synchronize ref with state
  useEffect(() => {
    warningActiveRef.current = showWarning;
  }, [showWarning]);

  // Execute logout
  const performLogout = useCallback(async (reason: 'expired' | 'logged_out' = 'expired') => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }

    try {
      localStorage.setItem(STORAGE_KEY_LOGGED_OUT, Date.now().toString());
      localStorage.removeItem(STORAGE_KEY_ACTIVITY);
    } catch (e) {
      // ignore storage access errors
    }

    setShowWarning(false);
    router.push(`/admin/login?reason=${reason}`);
    router.refresh();
  }, [router]);

  // Handle "Stay Logged In"
  const handleStayLoggedIn = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/refresh', { method: 'POST' });
      if (!res.ok) {
        // If refresh fails because session already died on server
        await performLogout('expired');
        return;
      }

      const now = Date.now();
      lastActivityRef.current = now;
      lastWriteRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVITY, now.toString());
      } catch (e) {}

      setShowWarning(false);
    } catch (err) {
      console.error('Session refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Record user activity
  const recordActivity = useCallback(() => {
    // If the warning dialog is open, do not auto-dismiss without explicit user action
    if (warningActiveRef.current) return;

    const now = Date.now();
    lastActivityRef.current = now;

    // Throttle writes to localStorage to prevent performance degradation
    if (now - lastWriteRef.current > THROTTLE_INTERVAL_MS) {
      lastWriteRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVITY, now.toString());
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    // Initialize activity timestamp
    const now = Date.now();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      const storedTime = stored ? parseInt(stored, 10) : NaN;
      if (!isNaN(storedTime) && storedTime > now - INACTIVITY_TIMEOUT_MS) {
        lastActivityRef.current = storedTime;
      } else {
        lastActivityRef.current = now;
        localStorage.setItem(STORAGE_KEY_ACTIVITY, now.toString());
      }
    } catch (e) {
      lastActivityRef.current = now;
    }

    // Attach activity listeners to window
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LOGGED_OUT && e.newValue) {
        // Another tab logged out
        router.push('/admin/login?reason=logged_out');
      } else if (e.key === STORAGE_KEY_ACTIVITY && e.newValue) {
        // Another tab had activity
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = Math.max(lastActivityRef.current, remoteTime);
          if (warningActiveRef.current) {
            setShowWarning(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Heartbeat check every 1 second
    const interval = setInterval(() => {
      // Check latest activity from storage in case another tab updated it
      let effectiveActivity = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY);
        if (stored) {
          const storedTime = parseInt(stored, 10);
          if (!isNaN(storedTime) && storedTime > effectiveActivity) {
            effectiveActivity = storedTime;
            lastActivityRef.current = storedTime;
          }
        }
      } catch (e) {}

      const elapsed = Date.now() - effectiveActivity;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Inactivity limit reached -> Auto logout
        performLogout('expired');
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        // Within the 5-minute warning window
        const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
        setShowWarning(true);
      } else {
        if (warningActiveRef.current) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [performLogout, recordActivity, router]);

  if (!showWarning) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedCountdown = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-900">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <div className="p-3 bg-amber-100 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Session Expiring Soon</h3>
            <p className="text-xs text-slate-500">Inactivity Timeout Warning</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          You have been inactive for an extended period. For security purposes, your admin session will expire in:
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center mb-6">
          <div className="text-3xl font-extrabold font-mono text-amber-700 tracking-wider">
            {formattedCountdown}
          </div>
          <div className="text-xs text-amber-600 font-medium mt-1">minutes remaining before automatic logout</div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStayLoggedIn}
            disabled={isRefreshing}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isRefreshing ? 'Extending...' : 'Stay Logged In'}
          </button>
          <button
            onClick={() => performLogout('logged_out')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
