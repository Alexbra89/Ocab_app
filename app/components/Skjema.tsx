'use client';

// Felles byggeklosser for skjemaer og vinduer, i mørk glass-stil.

import { useEffect, useRef, type ReactNode } from 'react';
import Ikon from './Ikon';
import { SAKSBEHANDLERE, type Kundefelter } from '@/lib/saker';

export const inputStil =
  'w-full rounded-xl border-0 bg-white/[0.06] px-3 py-2.5 text-sm text-white ring-1 ring-white/15 [color-scheme:dark] placeholder:text-white/35 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ocab-400 [&_option]:bg-slate-900 [&_option]:text-white';

const fremhevetStil = inputStil.replace('bg-white/[0.06]', 'bg-emerald-400/15').replace('ring-white/15', 'ring-emerald-400/50');

export function Felt({ etikett, children, className = '' }: { etikett: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/50">{etikett}</span>
      {children}
    </label>
  );
}

export function Knapp({ children, variant = 'sekundar', className = '', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primar' | 'sekundar' | 'fare' }) {
  const stiler = {
    primar: 'bg-gradient-to-b from-ocab-400 to-ocab-600 text-white shadow-[0_8px_24px_-8px_rgba(0,108,183,0.9)] ring-1 ring-white/20 hover:brightness-110',
    sekundar: 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/15',
    fare: 'bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/20',
  };
  return (
    <button {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 ${stiler[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ tittel, undertittel, onLukk, children, bunn, bred = false }: {
  tittel: string; undertittel?: string; onLukk: () => void; children: ReactNode; bunn?: ReactNode; bred?: boolean;
}) {
  const lukk = useRef(onLukk);
  useEffect(() => {
    lukk.current = onLukk;
  });

  // Esc lukker vinduet, og siden bak låses mens vinduet er åpent.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && lukk.current();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={e => e.target === e.currentTarget && onLukk()}>
      <div className={`glass-inn flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-900/85 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur-2xl sm:rounded-3xl ${bred ? 'sm:max-w-6xl' : 'sm:max-w-2xl'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight">{tittel}</h2>
            {undertittel && <p className="mt-0.5 text-sm text-white/55">{undertittel}</p>}
          </div>
          <button onClick={onLukk} className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white" title="Lukk">
            <Ikon navn="lukk" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {bunn && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-6 py-4">{bunn}</div>}
      </div>
    </div>
  );
}

export function Initialer({ navn, aktiv = false, stor = false }: { navn: string; aktiv?: boolean; stor?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ${stor ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-[10px]'} ${aktiv ? 'bg-white text-slate-900 ring-white' : 'bg-white/10 text-white ring-white/15'}`}>
      {navn.slice(0, 2).toUpperCase()}
    </span>
  );
}

// Kundefeltene brukes både når en ny kunde legges til og når en sak redigeres.
export function KundeFelter({ verdier, onEndre, fremhevet = [] }: {
  verdier: Kundefelter; onEndre: (felter: Partial<Kundefelter>) => void; fremhevet?: string[];
}) {
  const felt = (navn: keyof Kundefelter, etikett: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, className = '') => (
    <Felt etikett={etikett} className={className}>
      <input {...props} value={verdier[navn]} onChange={e => onEndre({ [navn]: e.target.value })}
        className={fremhevet.includes(navn) ? fremhevetStil : inputStil} />
    </Felt>
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      {felt('navn', 'Navn', { placeholder: 'Ola Nordmann', autoFocus: true }, 'sm:col-span-6')}
      {felt('adresse', 'Adresse', { placeholder: 'Storgata 1' }, 'sm:col-span-6')}
      {felt('postnummer', 'Postnummer', { placeholder: '0123', inputMode: 'numeric', maxLength: 4 }, 'sm:col-span-2')}
      {felt('poststed', 'Poststed', { placeholder: 'Oslo' }, 'sm:col-span-4')}
      {felt('telefon', 'Telefon', { placeholder: '900 00 000', type: 'tel' }, 'sm:col-span-3')}
      {felt('epost', 'E-post', { placeholder: 'ola@eksempel.no', type: 'email' }, 'sm:col-span-3')}
      <Felt etikett="Saksbehandler" className="sm:col-span-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[...SAKSBEHANDLERE, ...(verdier.saksbehandler && !SAKSBEHANDLERE.includes(verdier.saksbehandler) ? [verdier.saksbehandler] : [])].map(navn => (
            <button key={navn} type="button" onClick={() => onEndre({ saksbehandler: verdier.saksbehandler === navn ? '' : navn })}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${verdier.saksbehandler === navn
                ? 'bg-ocab-500/40 text-white ring-ocab-300/60'
                : fremhevet.includes('saksbehandler') ? 'bg-emerald-400/15 text-white ring-emerald-400/50' : 'bg-white/[0.06] text-white/80 ring-white/15 hover:bg-white/10'}`}>
              <Initialer navn={navn} aktiv={verdier.saksbehandler === navn} />{navn}
            </button>
          ))}
        </div>
      </Felt>
      <Felt etikett="Beskrivelse" className="sm:col-span-6">
        <textarea value={verdier.beskrivelse} onChange={e => onEndre({ beskrivelse: e.target.value })} rows={3}
          placeholder="Hva gjelder saken?" className={inputStil} />
      </Felt>
    </div>
  );
}
