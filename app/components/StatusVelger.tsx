'use client';

import { useEffect, useRef, useState } from 'react';
import Ikon from './Ikon';
import { STATUS_REKKEFOLGE, STATUSER, type Status } from '@/lib/saker';

export default function StatusVelger({ status, onEndre }: { status: Status; onEndre: (s: Status) => void }) {
  const [apen, setApen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apen) return;
    const lukk = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setApen(false);
    document.addEventListener('mousedown', lukk);
    return () => document.removeEventListener('mousedown', lukk);
  }, [apen]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setApen(!apen)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition hover:brightness-95 ${STATUSER[status].pille}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${STATUSER[status].prikk}`} />
        {STATUSER[status].navn}
        <Ikon navn="pil_ned" className="h-3 w-3 opacity-60" />
      </button>
      {apen && (
        <div className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200">
          {STATUS_REKKEFOLGE.map(s => (
            <button key={s} onClick={() => { onEndre(s); setApen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
              <span className={`h-2 w-2 rounded-full ${STATUSER[s].prikk}`} />
              <span className="flex-1">{STATUSER[s].navn}</span>
              {s === status && <Ikon navn="hake" className="h-3.5 w-3.5 text-slate-900" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
