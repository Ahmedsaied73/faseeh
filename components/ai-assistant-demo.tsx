'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { subject } from '@/lib/subject-theme';
import { aiStudentService } from '@/services/aiStudentService';
import { AuthError } from '@/lib/errors';

type Entry =
  | { role: 'student' | 'assistant'; text: string }
  | { role: 'auth_required'; text: string }
  | { role: 'error'; text: string };

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function AiAssistantDemo() {
  const [log, setLog] = useState<Entry[]>(subject.assistantSeed);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  useEffect(() => {
    consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight, behavior: 'smooth' });
  }, [log, thinking]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || thinking) return;

    const currentSessionId = sessionId || generateSessionId();
    if (!sessionId) setSessionId(currentSessionId);

    setLog((l) => [...l, { role: 'student', text: q }]);
    setInput('');
    setThinking(true);

    try {
      const res = await aiStudentService.sendMessage({
        sessionId: currentSessionId,
        message: q,
      });
      setLog((l) => [...l, { role: 'assistant', text: res.reply }]);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || err instanceof AuthError) {
        setLog((l) => [
          ...l,
          { role: 'auth_required', text: 'سجّل دخول الأول عشان تكلم المساعد' },
        ]);
      } else {
        const errorMsg =
          (err as { message?: string })?.message || 'حصلت مشكلة مؤقتة، جرّب تاني بعد شوية';
        setLog((l) => [...l, { role: 'error', text: errorMsg }]);
      }
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2">
        {subject.assistantSuggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={thinking}
            onClick={() => ask(s)}
            className="rounded-full border border-brand-border bg-brand-surface px-3.5 py-1.5 text-xs font-medium text-brand-muted-strong transition hover:border-brand-primary/50 hover:text-brand-primary disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface p-1.5 pe-1.5 ps-5 shadow-sm focus-within:border-brand-primary/50"
      >
        <input
          value={input}
          maxLength={500}
          disabled={thinking}
          onChange={(e) => setInput(e.target.value)}
          placeholder={subject.assistantPlaceholder}
          className="w-full bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-muted disabled:opacity-50"
        />
        <button
          type="submit"
          aria-label="إرسال"
          disabled={thinking || !input.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-primary text-white transition hover:bg-brand-primary/90 disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="-scale-x-100" aria-hidden="true">
            <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      <div
        ref={consoleRef}
        className="mt-4 h-64 overflow-y-auto rounded-2xl bg-brand-ink p-5 text-start font-mono text-xs leading-relaxed sm:text-sm"
        dir="rtl"
      >
        {log.map((entry, i) => {
          if (entry.role === 'auth_required') {
            return (
              <p key={i} className="mb-3 text-amber-300">
                <span className="text-brand-muted">!</span> {entry.text}{' '}
                <Link href="/login" className="font-bold underline hover:text-white ms-1">
                  (تسجيل الدخول)
                </Link>
              </p>
            );
          }
          if (entry.role === 'error') {
            return (
              <p key={i} className="mb-3 text-red-400">
                <span className="text-brand-muted">!</span> {entry.text}
              </p>
            );
          }
          return (
            <p key={i} className={'mb-3 ' + (entry.role === 'student' ? 'text-white' : 'text-brand-secondary')}>
              <span className="text-brand-muted">{entry.role === 'student' ? '>' : '◆'}</span> {entry.text}
            </p>
          );
        })}
        {thinking && <p className="text-brand-muted">◆ يكتب الآن…</p>}
      </div>
    </div>
  );
}

