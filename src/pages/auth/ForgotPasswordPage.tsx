import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import { requestPasswordResetApi } from '../../lib/api';

const COOLDOWN_MS = 2 * 60 * 1000;
const COOLDOWN_STORAGE_KEY = 'supportai_password_reset_cooldown_until';

function readCooldownRemaining(): number {
  const raw = sessionStorage.getItem(COOLDOWN_STORAGE_KEY);
  if (!raw) return 0;
  const until = Number(raw);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - Date.now());
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(() => readCooldownRemaining());

  useEffect(() => {
    const id = window.setInterval(() => {
      const remaining = readCooldownRemaining();
      setCooldownMs(remaining);
      if (remaining <= 0) {
        sessionStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_MS;
    sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(until));
    setCooldownMs(COOLDOWN_MS);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading || cooldownMs > 0) return;

    setError('');
    setSuccess('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const data = await requestPasswordResetApi(email.trim());
      setSuccess(data.detail);
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const onCooldown = cooldownMs > 0;
  const formLocked = loading || onCooldown;

  return (
    <AuthLayout title="Forgot password" subtitle="We'll email you a link to reset it">
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
        )}

        {onCooldown && (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm text-slate-600">
            You can request another link in{' '}
            <span className="font-semibold tabular-nums text-slate-800">
              {formatCountdown(cooldownMs)}
            </span>
          </p>
        )}

        <Button type="submit" className="w-full" disabled={formLocked}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
