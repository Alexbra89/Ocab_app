'use client';

import { useState } from 'react';
import Ikon from './Ikon';
import { Felt, inputStil, Knapp, KundeFelter, Modal } from './Skjema';
import {
  beregnPris, kroner, lopetidTekst, nyId, SATSER, STATUS_REKKEFOLGE, STATUSER,
  type Kundefelter, type Pris, type Sak,
} from '@/lib/saker';

const tidspunkt = (iso: string) =>
  new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Viser hele saken for redigering. Endringene lagres først når man trykker «Lagre».
export default function SakModal({ sak, na, onLagre, onSlett, onTilbud, onLukk }: {
  sak: Sak; na: number; onLagre: (sak: Sak) => void; onSlett: () => void; onTilbud: (sak: Sak) => void; onLukk: () => void;
}) {
  const [utkast, setUtkast] = useState<Sak>(sak);
  const [notat, setNotat] = useState('');
  const pris = beregnPris(utkast.pris);

  const endre = (endring: Partial<Sak>) => setUtkast(u => ({ ...u, ...endring }));
  const endrePris = (endring: Partial<Pris>) => setUtkast(u => ({ ...u, pris: { ...u.pris, ...endring } }));

  const leggTilNotat = () => {
    if (!notat.trim()) return;
    endre({ notater: [{ id: nyId(), tidspunkt: new Date().toISOString(), tekst: notat.trim() }, ...utkast.notater] });
    setNotat('');
  };

  const tall = (felt: keyof Pris, etikett: string, enhet?: string) => (
    <Felt etikett={etikett}>
      <div className="relative">
        <input type="number" min={0} value={(utkast.pris[felt] as number) || ''} placeholder="0"
          onChange={e => endrePris({ [felt]: Number(e.target.value) || 0 })} className={`${inputStil} ${enhet ? 'pr-12' : ''}`} />
        {enhet && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{enhet}</span>}
      </div>
    </Felt>
  );

  return (
    <Modal bred tittel={utkast.navn || 'Uten navn'} undertittel={`Sak #${utkast.saksnummer} · ${STATUSER[utkast.status].navn} · ${lopetidTekst(utkast, na)}${utkast.saksbehandler ? ` · ${utkast.saksbehandler}` : ''}`}
      onLukk={onLukk}
      bunn={<>
        <Knapp variant="fare" className="mr-auto" onClick={() => confirm(`Slette saken «${utkast.navn}»?`) && onSlett()}>
          <Ikon navn="slett" />Slett
        </Knapp>
        <Knapp onClick={() => onTilbud(utkast)}><Ikon navn="dokument" />Last ned tilbud</Knapp>
        <Knapp variant="primar" onClick={() => onLagre(utkast)}><Ikon navn="hake" />Lagre</Knapp>
      </>}>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Seksjon tittel="Status">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_REKKEFOLGE.map(s => (
                <button key={s} onClick={() => endre({ status: s })}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${utkast.status === s ? `${STATUSER[s].pille} ring-2` : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
                  <span className={`h-2 w-2 rounded-full ${STATUSER[s].prikk}`} />{STATUSER[s].navn}
                </button>
              ))}
            </div>
            <Felt etikett="Opprettet" className="mt-4 max-w-xs">
              <input type="date" value={utkast.opprettet.slice(0, 10)} className={inputStil}
                onChange={e => e.target.value && endre({ opprettet: new Date(`${e.target.value}T${utkast.opprettet.slice(11) || '08:00:00.000Z'}`).toISOString() })} />
            </Felt>
          </Seksjon>

          <Seksjon tittel="Kunde">
            <KundeFelter verdier={utkast} onEndre={(e: Partial<Kundefelter>) => endre(e)} />
          </Seksjon>

          <Seksjon tittel="Pris og tilbud">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Felt etikett="Pristype">
                <select value={utkast.pris.prisType} onChange={e => endrePris({ prisType: e.target.value as Pris['prisType'] })} className={inputStil}>
                  <option value="timespris">Timepris</option>
                  <option value="fastpris">Fastpris</option>
                </select>
              </Felt>
              {utkast.pris.prisType === 'timespris' ? (<>
                <Felt etikett="Rolle">
                  <select value={utkast.pris.rolle} onChange={e => endrePris({ rolle: e.target.value as Pris['rolle'] })} className={inputStil}>
                    <option value="tømrer">Tømrer ({SATSER.tømrer} kr/t)</option>
                    <option value="ekspert">Ekspert ({SATSER.ekspert} kr/t)</option>
                  </select>
                </Felt>
                {tall('timer', 'Timer', 't')}
              </>) : tall('fastprisSum', 'Fastpris', 'kr')}
              {tall('utstyr', 'Utstyr', 'kr')}
              {tall('kjoreKm', 'Kjøring', 'km')}
              {tall('bompenger', 'Bompenger', 'kr')}
              {tall('rabatt', 'Rabatt', '%')}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-ocab-600 px-5 py-4 text-white">
              <div className="text-sm text-ocab-100">Totalt inkl. mva<div className="text-xs text-ocab-200">Eks. mva {kroner(pris.sumEksMva)}</div></div>
              <div className="text-2xl font-semibold tracking-tight">{kroner(pris.totalInklMva)}</div>
            </div>
          </Seksjon>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Seksjon tittel={`Notater (${utkast.notater.length})`}>
            <div className="flex gap-2">
              <textarea value={notat} onChange={e => setNotat(e.target.value)} rows={2} placeholder="Nytt notat…"
                onKeyDown={e => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && leggTilNotat()} className={inputStil} />
            </div>
            <Knapp className="mt-2 w-full" onClick={leggTilNotat} disabled={!notat.trim()}><Ikon navn="notat" />Legg til notat</Knapp>
            <ul className="mt-4 space-y-2">
              {utkast.notater.map(n => (
                <li key={n.id} className="group rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    {tidspunkt(n.tidspunkt)}
                    <button onClick={() => endre({ notater: utkast.notater.filter(x => x.id !== n.id) })}
                      className="opacity-0 transition hover:text-rose-600 group-hover:opacity-100" title="Slett notat">
                      <Ikon navn="lukk" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{n.tekst}</p>
                </li>
              ))}
              {utkast.notater.length === 0 && <li className="text-sm text-slate-400">Ingen notater ennå.</li>}
            </ul>
          </Seksjon>

          <Seksjon tittel="Aktivitet">
            <ol className="relative space-y-3 border-l border-slate-200 pl-4">
              {utkast.aktiviteter.slice(0, 15).map(a => (
                <li key={a.id} className="text-sm">
                  <span className="absolute -left-[3px] mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                  <p className="text-slate-700">{a.tekst}</p>
                  <p className="text-xs text-slate-400">{tidspunkt(a.tidspunkt)}</p>
                </li>
              ))}
              {utkast.aktiviteter.length === 0 && <li className="text-sm text-slate-400">Ingen aktivitet registrert.</li>}
            </ol>
          </Seksjon>
        </div>
      </div>
    </Modal>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{tittel}</h3>
      {children}
    </section>
  );
}
