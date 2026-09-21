import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { adminSetAgentPassword } from '../../lib/api';
import type { User } from '../../types';

interface ChangePasswordModalProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function ChangePasswordModal({ open, user, onClose, onSuccess }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setLoading(false);
  }, [open, user?.id]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await adminSetAgentPassword(user.id, password, confirmPassword);
      onSuccess?.(data.detail || 'Password updated.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={user ? `Change password · ${user.name}` : 'Change password'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Set a new login password for <span className="font-medium text-slate-700">{user?.email}</span>.
          Use at least 8 characters — avoid common passwords or the agent&apos;s name/email.
        </p>

        <div className="space-y-1.5">
          <label htmlFor="agent-new-password" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <div className="relative">
            <input
              id="agent-new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder="At least 8 characters"
              autoFocus
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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

        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setError('');
          }}
          placeholder="Re-enter password"
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !user}>
            {loading ? 'Saving…' : 'Update password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
