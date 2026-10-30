'use client';

import { useState } from 'react';
import Ikon from './Ikon';
import { Initialer } from './Skjema';
import Velger from './Velger';
import {
  aktivtVarsel, beregnPris, dagerApen, erApen, kroner, OPPDRAG, SAKSBEHANDLERE, STATUS_REKKEFOLGE, STATUSER,
  type Sak, type Status,
} from '@/lib/saker';

interface Props {
  sak: Sak;
  na: number;
  onApne: () => void;
  onStatus: (status: Status) => void;
  onSaksbehandler: (navn: string) => void;
  onNotat: (tekst: string) => void;
  onLukkVarsel: (niva: number) => void;
}

const kortDato = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SaksKort({ sak, na, onApne, onStatus, onSaksbehandler, onNotat, onLukkVarsel }: Props) {
  const [notat, setNotat] = useState('');
  const stil = STATUSER[sak.status];
  const varsel = aktivtVarsel(sak, na);
  const sum = beregnPris(sak.pris).totalInklMva;
  const sted = [sak.postnummer, sak.poststed].filter(Boolean).join(' ');
  const dager = dagerApen(sak, na);
  const sisteNotat = sak.notater[0];

  const lagreNotat = () => {
    if (!notat.trim()) return;
    onNotat(notat.trim());
    setNotat('');
  };

  const behandlere = [...SAKSBEHANDLERE, ...(sak.saksbehandler && !SAKSBEHANDLERE.includes(sak.saksbehandler) ? [sak.saksbehandler] : [])];

  return (
    <article className={`relative rounded-2xl has-[[data-apen]]:z-30 pl-1.5 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.6)] ring-1 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${stil.kort}`}>
      {/* Sterk statusfarge i margen */}
      <div className={`absolute inset-y-0 left-0 w-1.5 rounded-l-2xl ${stil.marg}`} />

      {varsel && (
        <div className={`flex items-center gap-2 rounded-tr-2xl px-5 py-2 text-xs font-semibold ${varsel.stil}`}>
          <Ikon navn="advarsel" className="h-4 w-4 shrink-0" />
          <span className="flex-1">{varsel.tekst}</span>
          <button onClick={() => onLukkVarsel(varsel.niva)} title="Lukk varsel" className="rounded-md p-1 transition hover:bg-black/10">
            <Ikon navn="lukk" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4 sm:px-5 lg:flex-row lg:items-center">
        {/* Kunde */}
        <button onClick={onApne} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sky-200 ring-1 ring-white/15">
              #{sak.saksnummer}
            </span>
            <h3 className="truncate text-base font-semibold tracking-tight text-white hover:text-sky-200">{sak.navn || 'Uten navn'}</h3>
            {sak.pris.oppdrag.map(o => (
              <span key={o.id} className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80 ring-1 ring-white/10 sm:inline">
                {OPPDRAG[o.type].navn}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80">
            {(sak.adresse || sted) && (
              <span className="flex min-w-0 items-center gap-1.5">
                <Ikon navn="sted" className="h-3.5 w-3.5 shrink-0 text-white/55" />
                <span className="truncate">{[sak.adresse, sted].filter(Boolean).join(', ')}</span>
              </span>
            )}
            {sak.telefon && (
              <span className="flex items-center gap-1.5"><Ikon navn="telefon" className="h-3.5 w-3.5 text-white/55" />{sak.telefon}</span>
            )}
            {sak.epost && (
              <span className="flex min-w-0 items-center gap-1.5">
                <Ikon navn="epost" className="h-3.5 w-3.5 shrink-0 text-white/55" /><span className="truncate">{sak.epost}</span>
              </span>
            )}
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Saksbehandler */}
          <div className="min-w-32">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/60">Saksbehandler</div>
            <Velger verdi={sak.saksbehandler} tomTekst="Ikke tildelt"
              valg={[...behandlere.map(n => ({ verdi: n, navn: n, merke: <Initialer navn={n} /> })), { verdi: '', navn: 'Ikke tildelt' }]}
              knappStil={sak.saksbehandler ? 'bg-white/10 text-white ring-white/15 pl-1' : 'bg-transparent text-white/65 ring-white/20'}
              onEndre={onSaksbehandler} />
          </div>

          {/* Status */}
          <div className="min-w-28">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/60">Status</div>
            <Velger verdi={sak.status} knappStil={stil.pille} onEndre={onStatus}
              valg={STATUS_REKKEFOLGE.map(s => ({ verdi: s, navn: STATUSER[s].navn, merke: <span className={`h-2 w-2 rounded-full ${STATUSER[s].prikk}`} /> }))} />
          </div>

          {/* Løpetid i dager */}
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-3.5 py-2 ring-1 ring-white/10" title={`Opprettet ${new Date(sak.opprettet).toLocaleDateString('nb-NO')}`}>
            <Ikon navn="klokke" className="h-4 w-4 text-white/55" />
            <div className="leading-tight">
              <div className="text-xl font-semibold tabular-nums text-white">{dager}</div>
              <div className="text-[11px] text-white/65">{dager === 1 ? 'dag' : 'dager'} {erApen(sak) ? 'åpen' : 'totalt'}</div>
            </div>
          </div>

          {sum > 0 && (
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-white/60">Inkl. mva</div>
              <div className="text-sm font-semibold tabular-nums text-white">{kroner(sum)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Notater */}
      <div className="flex flex-col gap-2 border-t border-white/[0.07] px-4 py-3 sm:px-5 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1 text-sm text-white/80">
          {sisteNotat ? (
            <button onClick={onApne} className="flex w-full min-w-0 items-center gap-2 text-left hover:text-white">
              <span className="shrink-0 text-xs text-white/55">{kortDato(sisteNotat.tidspunkt)}</span>
              <span className="truncate">{sisteNotat.tekst}</span>
              {sak.notater.length > 1 && <span className="shrink-0 text-xs font-medium text-sky-200">+{sak.notater.length - 1} til</span>}
            </button>
          ) : (
            <span className="text-xs text-white/55">Opprettet {new Date(sak.opprettet).toLocaleDateString('nb-NO')} · ingen notater</span>
          )}
        </div>
        <div className="flex items-center gap-2 lg:w-[28rem]">
          <div className="relative flex-1">
            <Ikon navn="notat" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
            <input value={notat} onChange={e => setNotat(e.target.value)} onKeyDown={e => e.key === 'Enter' && lagreNotat()}
              placeholder="Skriv et notat og trykk Enter…"
              className="w-full rounded-xl border-0 bg-white/[0.06] py-2 pl-9 pr-10 text-sm text-white ring-1 ring-white/15 placeholder:text-white/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ocab-400" />
            {notat && (
              <button onClick={lagreNotat} title="Lagre notat" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-ocab-500 p-1.5 text-white">
                <Ikon navn="send" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button onClick={onApne} title="Åpne og rediger saken"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white hover:text-slate-900">
            <Ikon navn="apne" className="h-3.5 w-3.5" />Åpne
          </button>
        </div>
      </div>
    </article>
  );
}
