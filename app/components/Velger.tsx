'use client';

import { useState, type ReactNode } from 'react';
import Ikon from './Ikon';
import { useKlikkUtenfor } from './useKlikkUtenfor';

interface Valg<T extends string> {
  verdi: T;
  navn: string;
  merke?: ReactNode; // f.eks. fargeprikk eller initialer foran navnet
}

// Liten nedtrekksmeny brukt for status og saksbehandler i saksboksen.
export default function Velger<T extends string>({ verdi, valg, onEndre, knappStil, tomTekst = 'Velg' }: {
  verdi: T; valg: Valg<T>[]; onEndre: (v: T) => void; knappStil: string; tomTekst?: string;
}) {
  const [apen, setApen] = useState(false);
  const ref = useKlikkUtenfor<HTMLDivElement>(apen, () => setApen(false));
  const valgt = valg.find(v => v.verdi === verdi);

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setApen(!apen)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition hover:brightness-95 ${knappStil}`}>
        {valgt?.merke}
        {valgt?.navn || tomTekst}
        <Ikon navn="pil_ned" className="h-3 w-3 opacity-60" />
      </button>
      {apen && (
        <div className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
          {valg.map(v => (
            <button key={v.verdi} onClick={() => { onEndre(v.verdi); setApen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-ocab-50">
              {v.merke}
              <span className="flex-1">{v.navn}</span>
              {v.verdi === verdi && <Ikon navn="hake" className="h-3.5 w-3.5 text-ocab-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
