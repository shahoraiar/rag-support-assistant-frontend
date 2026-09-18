import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AuthDivider, AuthLayout } from '../../components/auth/AuthLayout';
import { GoogleAuthButton } from '../../components/auth/GoogleAuthButton';
import { useAuth } from '../../context/AuthContext';
import { demoLoginAccounts } from '../../data/mockData';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading session…
      </div>
    );
  }

  if (user) {
    const redirect = user.role === 'customer' ? '/customer' : user.role === 'agent' ? '/agent' : '/admin';
    return <Navigate to={redirect} replace />;
  }

  const redirectByRole = (role: string) => {
    navigate(role === 'customer' ? '/customer' : role === 'agent' ? '/agent' : '/admin');
  };

  const handleLogin = async (loginEmail?: string, loginPassword = 'demo1234') => {
    const e = loginEmail || email;
    const loggedIn = await login(e, loginEmail ? loginPassword : password || loginPassword);
    if (loggedIn) {
      redirectByRole(loggedIn.role);
      return;
    }
    setError('Invalid email or password. Sign up or use a demo account below.');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await handleLogin();
  };

  const handleGoogleSuccess = async (credential: string) => {
    const result = await loginWithGoogle(credential);
    if (result.success && result.user) {
      redirectByRole(result.user.role);
      return;
    }
    setError(result.error || 'Google sign-in is unavailable.');
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your SupportAI account">
      <GoogleAuthButton onSuccess={handleGoogleSuccess} label="Sign in with Google" />

      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
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
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create account
        </Link>
      </p>

      <div className="mt-8">
        <p className="mb-3 text-center text-sm font-medium text-slate-500">Quick Demo Login</p>
        <div className="space-y-2">
          {demoLoginAccounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleLogin(acc.email)}
              className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium text-slate-700">{acc.label}</span>
              <span className="truncate text-xs text-slate-400">{acc.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
