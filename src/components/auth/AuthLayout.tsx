import { Bot } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

const features = ['RAG Pipeline', 'Real-time Chat', 'SLA Monitoring', 'Auto Classification'];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh overflow-x-hidden">
      <div className="hidden w-1/2 flex-col bg-slate-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">SupportAI</span>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <h2 className="text-4xl font-bold leading-tight text-white">
            AI-Powered Customer Support with RAG
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Intelligent ticket management, real-time chat, and company-specific AI answers.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300"
              >
                {f}
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()}{' '}
          <a
            href="https://shahoraiar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            Shahoraiar Hossain
          </a>
          . All rights reserved.
        </p>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-md min-w-0">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
              <Bot className="h-8 w-8 text-brand-600" />
              <span className="text-2xl font-bold">SupportAI</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-3 text-slate-400 sm:bg-slate-50">or continue with</span>
      </div>
    </div>
  );
}
