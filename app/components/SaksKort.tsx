'use client';

import { useState } from 'react';
import Ikon from './Ikon';
import StatusVelger from './StatusVelger';
import { aktivtVarsel, beregnPris, kroner, lopetidTekst, STATUSER, type Sak, type Status } from '@/lib/saker';

interface Props {
  sak: Sak;
  na: number;
  onApne: () => void;
  onStatus: (status: Status) => void;
  onNotat: (tekst: string) => void;
  onLukkVarsel: (niva: number) => void;
}

const kortDato = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SaksKort({ sak, na, onApne, onStatus, onNotat, onLukkVarsel }: Props) {
  const [notat, setNotat] = useState('');
  const stil = STATUSER[sak.status];
  const varsel = aktivtVarsel(sak, na);
  const sum = beregnPris(sak.pris).totalInklMva;
  const sted = [sak.postnummer, sak.poststed].filter(Boolean).join(' ');

  const lagreNotat = () => {
    if (!notat.trim()) return;
    onNotat(notat.trim());
    setNotat('');
  };

  return (
    <article className={`group relative flex flex-col rounded-2xl pl-1.5 shadow-sm ring-1 transition hover:shadow-lg hover:-translate-y-0.5 ${stil.kort}`}>
      {/* Sterk statusfarge i margen */}
      <div className={`absolute inset-y-0 left-0 w-1.5 rounded-l-2xl ${stil.marg}`} />

      {varsel && (
        <div className={`flex items-center gap-2 rounded-tr-2xl px-4 py-2 text-xs font-semibold ${varsel.stil}`}>
          <Ikon navn="advarsel" className="h-4 w-4 shrink-0" />
          <span className="flex-1">{varsel.tekst}</span>
          <button onClick={() => onLukkVarsel(varsel.niva)} title="Lukk varsel"
            className="rounded-md p-1 transition hover:bg-black/10">
            <Ikon navn="lukk" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <header className="flex items-start justify-between gap-3">
          <button onClick={onApne} className="min-w-0 text-left">
            <h3 className="truncate text-base font-semibold tracking-tight text-slate-900 group-hover:text-slate-700">
              {sak.navn || 'Uten navn'}
            </h3>
            {(sak.adresse || sted) && (
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
                <Ikon navn="sted" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {[sak.adresse, sted].filter(Boolean).join(', ')}
              </p>
            )}
          </button>
          <StatusVelger status={sak.status} onEndre={onStatus} />
        </header>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
          {sak.telefon && (
            <a href={`tel:${sak.telefon.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-slate-900">
              <Ikon navn="telefon" className="h-3.5 w-3.5 text-slate-400" />{sak.telefon}
            </a>
          )}
          {sak.epost && (
            <a href={`mailto:${sak.epost}`} className="flex min-w-0 items-center gap-1.5 hover:text-slate-900">
              <Ikon navn="epost" className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{sak.epost}</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
            <Ikon navn="klokke" className="h-3.5 w-3.5 text-slate-400" />{lopetidTekst(sak, na)}
          </span>
          {sak.prosjektleder && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
              <Ikon navn="person" className="h-3.5 w-3.5 text-slate-400" />{sak.prosjektleder}
            </span>
          )}
          <span className="text-slate-500">Opprettet {new Date(sak.opprettet).toLocaleDateString('nb-NO')}</span>
          {sum > 0 && <span className="ml-auto font-semibold text-slate-900">{kroner(sum)}</span>}
        </div>

        {sak.notater.length > 0 && (
          <ul className="space-y-1.5">
            {sak.notater.slice(0, 2).map(n => (
              <li key={n.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200/70">
                <span className="mr-2 text-xs text-slate-400">{kortDato(n.tidspunkt)}</span>{n.tekst}
              </li>
            ))}
            {sak.notater.length > 2 && (
              <li>
                <button onClick={onApne} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                  + {sak.notater.length - 2} eldre notater
                </button>
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Ikon navn="notat" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={notat}
              onChange={e => setNotat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lagreNotat()}
              placeholder="Skriv et notat og trykk Enter…"
              className="w-full rounded-xl border-0 bg-white/90 py-2 pl-9 pr-10 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {notat && (
              <button onClick={lagreNotat} title="Lagre notat"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-slate-900 p-1.5 text-white">
                <Ikon navn="send" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button onClick={onApne} title="Åpne og rediger saken"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-900 hover:text-white hover:ring-slate-900">
            <Ikon navn="apne" className="h-3.5 w-3.5" />Åpne
          </button>
        </div>
      </div>
    </article>
  );
}
