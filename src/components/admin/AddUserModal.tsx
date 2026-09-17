import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { mapApiUser, registerApi } from '../../lib/api';
import type { User } from '../../types';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (user: User) => void;
}

export function AddUserModal({ open, onClose, onCreated }: AddUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter the agent full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await registerApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'agent',
      });
      onCreated(mapApiUser(data.user));
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Agent User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          placeholder="Sara Khan"
          autoFocus
        />

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError('');
          }}
          placeholder="agent@company.com"
        />

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-700">Role</span>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center">
            <Badge label="agent" />
            <span className="text-xs text-slate-500">Auto-assigned for admin-created users</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="agent-password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="agent-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              placeholder="At least 6 characters"
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

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Agent'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
