import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import clsx from 'clsx';

interface GoogleProfile {
  email: string;
  name: string;
  picture?: string;
}

interface GoogleAuthButtonProps {
  onSuccess: (profile: GoogleProfile) => void;
  onError?: () => void;
  label?: string;
}

function parseGoogleCredential(credential: string): GoogleProfile {
  const payload = JSON.parse(atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  return {
    email: payload.email as string,
    name: (payload.name as string) || (payload.email as string).split('@')[0],
    picture: payload.picture as string | undefined,
  };
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function DemoGoogleButton({ onSuccess, label }: { onSuccess: (profile: GoogleProfile) => void; label: string }) {
  const handleDemoGoogle = () => {
    onSuccess({
      email: 'google.demo@example.com',
      name: 'Google Demo User',
      picture: undefined,
    });
  };

  return (
    <button
      type="button"
      onClick={handleDemoGoogle}
      className={clsx(
        'flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5',
        'text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50',
      )}
    >
      <GoogleIcon className="h-5 w-5" />
      {label}
    </button>
  );
}

export function GoogleAuthButton({ onSuccess, onError, label = 'Continue with Google' }: GoogleAuthButtonProps) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) {
      onError?.();
      return;
    }
    onSuccess(parseGoogleCredential(response.credential));
  };

  if (!clientId) {
    return <DemoGoogleButton onSuccess={onSuccess} label={label} />;
  }

  return (
    <div className="flex w-full justify-center [&>div]:w-full [&>div>div]:!w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.()}
        theme="outline"
        size="large"
        text="continue_with"
        shape="rectangular"
        width="400"
      />
    </div>
  );
}
