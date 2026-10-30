'use client';

// Felles ramme for alle sidene: teambildet og Ocab-logoen i bakgrunnen, glass-sidemeny til venstre
// (meny øverst på mobil) og innholdet til høyre.

import Link from 'next/link';
import type { ReactNode } from 'react';
import Ikon from './Ikon';

type Side = 'oversikt' | 'saker' | 'statistikk';

const SIDER: { side: Side; href: string; navn: string; ikon: 'rutenett' | 'dokument' | 'diagram' }[] = [
  { side: 'oversikt', href: '/oversikt', navn: 'Oversikt', ikon: 'rutenett' },
  { side: 'saker', href: '/', navn: 'Saker', ikon: 'dokument' },
  { side: 'statistikk', href: '/statistikk', navn: 'Statistikk', ikon: 'diagram' },
];

export default function GlassRamme({ aktiv, children, ekstraMeny }: {
  aktiv: Side; children: ReactNode; ekstraMeny?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/team.jpg" alt="" className="h-full w-full scale-105 object-cover object-[50%_30%] blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-950/80 to-ocab-950/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,108,183,0.35),transparent_55%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ocab-logo-hvit.png" alt="" className="absolute -bottom-[4vw] -right-[3vw] w-[70vw] max-w-[1100px] opacity-[0.06]" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="glass sticky top-4 m-4 mr-0 hidden h-[calc(100vh-2rem)] w-[72px] shrink-0 flex-col items-center gap-2 rounded-3xl py-5 lg:flex">
          <Link href="/oversikt" title="Ocab – oversikt">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ocab-logo-hvit.png" alt="Ocab" className="mb-4 w-11" />
          </Link>
          {SIDER.map(s => <MenyKnapp key={s.side} href={s.href} ikon={s.ikon} navn={s.navn} aktiv={s.side === aktiv} />)}
          <div className="my-2 h-px w-8 bg-white/15" />
          {ekstraMeny ?? <>
            <MenyKnapp href="/?ny=kunde" ikon="pluss" navn="Legg til kunde" />
            <MenyKnapp href="/?ny=dokument" ikon="last_opp" navn="Last opp dokument" />
          </>}
        </aside>

        <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {/* Meny på mobil og nettbrett */}
          <nav className="mb-5 flex items-center gap-3 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ocab-logo-hvit.png" alt="Ocab" className="w-16" />
            <div className="glass flex gap-1 rounded-2xl p-1 text-sm">
              {SIDER.map(s => (
                <Link key={s.side} href={s.href}
                  className={`rounded-xl px-3 py-1.5 transition ${s.side === aktiv ? 'bg-white font-medium text-slate-900' : 'text-white/80 hover:bg-white/10'}`}>
                  {s.navn}
                </Link>
              ))}
            </div>
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}

export function MenyKnapp({ href, onClick, ikon, navn, aktiv = false }: {
  href?: string; onClick?: () => void; ikon: Parameters<typeof Ikon>[0]['navn']; navn: string; aktiv?: boolean;
}) {
  const stil = `group relative flex h-11 w-11 items-center justify-center rounded-2xl transition ${aktiv ? 'bg-white text-slate-900 shadow-lg' : 'text-white/75 hover:bg-white/10 hover:text-white'}`;
  const innhold = <>
    <Ikon navn={ikon} className="h-5 w-5" />
    <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-slate-950/90 px-2.5 py-1 text-xs text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100">
      {navn}
    </span>
  </>;
  return href
    ? <Link href={href} title={navn} aria-label={navn} className={stil}>{innhold}</Link>
    : <button onClick={onClick} title={navn} aria-label={navn} className={stil}>{innhold}</button>;
}

// Sidetittel med valgfri undertittel og knapper til høyre.
export function SideTopp({ tittel, undertittel, handlinger }: { tittel: ReactNode; undertittel?: ReactNode; handlinger?: ReactNode }) {
  return (
    <header className="glass-inn relative z-30 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tittel}</h1>
        {undertittel && <div className="mt-1.5 text-white/75">{undertittel}</div>}
      </div>
      {handlinger && <div className="flex flex-wrap items-center gap-2">{handlinger}</div>}
    </header>
  );
}

// Glasskort med tittel – brukes på alle sidene.
export function GlassKort({ tittel, tekst, children, className = '', hoyre, forsinkelse = 0 }: {
  tittel?: string; tekst?: string; children: ReactNode; className?: string; hoyre?: ReactNode; forsinkelse?: number;
}) {
  return (
    <section className={`glass glass-inn rounded-3xl p-5 sm:p-6 ${className}`} style={{ animationDelay: `${forsinkelse}ms` }}>
      {(tittel || hoyre) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {tittel && <h2 className="text-sm font-semibold">{tittel}</h2>}
            {tekst && <p className="mt-0.5 text-xs text-white/65">{tekst}</p>}
          </div>
          {hoyre}
        </div>
      )}
      {children}
    </section>
  );
}
