'use client';

// Felles byggeklosser for skjemaer og vinduer.

import { useEffect, type ReactNode } from 'react';
import Ikon from './Ikon';
import { SAKSBEHANDLERE, type Kundefelter } from '@/lib/saker';

export const inputStil =
  'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocab-600';

export function Felt({ etikett, children, className = '' }: { etikett: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">{etikett}</span>
      {children}
    </label>
  );
}

export function Knapp({ children, variant = 'sekundar', className = '', ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primar' | 'sekundar' | 'fare' }) {
  const stiler = {
    primar: 'bg-ocab-600 text-white shadow-sm hover:bg-ocab-700',
    sekundar: 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900',
    fare: 'bg-white text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50',
  };
  return (
    <button {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${stiler[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ tittel, undertittel, onLukk, children, bunn, bred = false }: {
  tittel: string; undertittel?: string; onLukk: () => void; children: ReactNode; bunn?: ReactNode; bred?: boolean;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onLukk();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onLukk]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={e => e.target === e.currentTarget && onLukk()}>
      <div className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200 sm:rounded-3xl ${bred ? 'sm:max-w-6xl' : 'sm:max-w-2xl'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">{tittel}</h2>
            {undertittel && <p className="mt-0.5 text-sm text-slate-500">{undertittel}</p>}
          </div>
          <button onClick={onLukk} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900" title="Lukk">
            <Ikon navn="lukk" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {bunn && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">{bunn}</div>}
      </div>
    </div>
  );
}

export function Initialer({ navn, aktiv = false, stor = false }: { navn: string; aktiv?: boolean; stor?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${stor ? 'h-10 w-10 text-sm' : 'h-6 w-6 text-[10px]'} ${aktiv ? 'bg-white/20 text-white' : 'bg-ocab-100 text-ocab-700'}`}>
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
        className={fremhevet.includes(navn) ? inputStil.replace('bg-white', 'bg-emerald-50').replace('ring-slate-200', 'ring-emerald-300') : inputStil} />
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
                ? 'bg-ocab-600 text-white ring-ocab-600'
                : fremhevet.includes('saksbehandler') ? 'bg-emerald-50 text-slate-700 ring-emerald-300' : 'bg-white text-slate-700 ring-slate-200 hover:bg-ocab-50'}`}>
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
