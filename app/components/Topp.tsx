'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const SIDER = [
  { href: '/', navn: 'Saker' },
  { href: '/statistikk', navn: 'Statistikk' },
];

// Hvit toppmeny med Ocab-logo og navigasjon, og et blått felt under med sidetittel.
export default function Topp({ tittel, undertittel, handlinger }: { tittel: string; undertittel?: ReactNode; handlinger?: ReactNode }) {
  const sti = usePathname();

  return (
    <header>
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="shrink-0" title="Ocab – til saksoversikten">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ocab-logo.png" alt="Ocab – Saving value, helping people" className="h-12 w-auto" />
            </Link>
            <nav className="flex gap-1">
              {SIDER.map(s => (
                <Link key={s.href} href={s.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${sti === s.href ? 'bg-ocab-50 text-ocab-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  {s.navn}
                </Link>
              ))}
            </nav>
          </div>
          {handlinger && <div className="flex flex-wrap items-center gap-2">{handlinger}</div>}
        </div>
      </div>

      <div className="relative overflow-hidden bg-gradient-to-br from-ocab-600 via-ocab-700 to-ocab-900 pb-28 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-ocab-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tittel}</h1>
          {undertittel && <div className="mt-2 text-ocab-100">{undertittel}</div>}
        </div>
      </div>
    </header>
  );
}
