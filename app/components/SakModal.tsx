'use client';

import { useState } from 'react';
import Ikon from './Ikon';
import { Felt, inputStil, Knapp, KundeFelter, Modal } from './Skjema';
import { useKlikkUtenfor } from './useKlikkUtenfor';
import {
  beregnPris, kroner, lopetidTekst, medNotat, nyOppdragLinje, OPPDRAG, OPPDRAG_REKKEFOLGE, ROLLE_REKKEFOLGE, ROLLER,
  STATUS_REKKEFOLGE, STATUSER, type Kundefelter, type OppdragLinje, type OppdragType, type Pris, type Sak,
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
  const endreOppdrag = (id: string, endring: Partial<OppdragLinje>) =>
    endrePris({ oppdrag: utkast.pris.oppdrag.map(o => (o.id === id ? { ...o, ...endring } : o)) });
  const valgteOppdrag = utkast.pris.oppdrag.map(o => o.type);
  const vekslOppdrag = (type: OppdragType) => endrePris({
    oppdrag: valgteOppdrag.includes(type)
      ? utkast.pris.oppdrag.filter(o => o.type !== type)
      : [...utkast.pris.oppdrag, nyOppdragLinje(type)].sort((a, b) => OPPDRAG_REKKEFOLGE.indexOf(a.type) - OPPDRAG_REKKEFOLGE.indexOf(b.type)),
  });

  const leggTilNotat = () => {
    if (!notat.trim()) return;
    setUtkast(u => medNotat(u, notat.trim()));
    setNotat('');
  };

  const tall = (felt: keyof Pris, etikett: string, enhet?: string) => (
    <Felt etikett={etikett}>
      <div className="relative">
        <input type="number" min={0} value={(utkast.pris[felt] as number) || ''} placeholder="0"
          onChange={e => endrePris({ [felt]: Number(e.target.value) || 0 })} className={`${inputStil} ${enhet ? 'pr-12' : ''}`} />
        {enhet && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/55">{enhet}</span>}
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
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${utkast.status === s ? `${STATUSER[s].pille} ring-2` : 'bg-white/[0.06] text-white/80 ring-white/15 hover:bg-white/10'}`}>
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
            {/* Arbeid */}
            <Undertittel>Arbeid</Undertittel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Felt etikett="Pristype">
                <select value={utkast.pris.prisType} onChange={e => endrePris({ prisType: e.target.value as Pris['prisType'] })} className={inputStil}>
                  <option value="timespris">Timepris</option>
                  <option value="fastpris">Fastpris</option>
                </select>
              </Felt>
              {utkast.pris.prisType === 'timespris' ? (<>
                <Felt etikett="Rolle">
                  <select value={utkast.pris.rolle} onChange={e => endrePris({ rolle: e.target.value as Pris['rolle'] })} className={inputStil}>
                    {ROLLE_REKKEFOLGE.map(r => <option key={r} value={r}>{ROLLER[r].navn}</option>)}
                  </select>
                </Felt>
                {tall('timer', `Timer à ${ROLLER[utkast.pris.rolle].sats} kr`, 't')}
              </>) : <div className="sm:col-span-2">{tall('fastprisSum', 'Fastpris', 'kr')}</div>}
              <Sumboks etikett="Sum arbeid" belop={pris.grunnlag} />
            </div>

            {/* Oppdrag */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Undertittel>Oppdrag</Undertittel>
              <OppdragVelger valgte={valgteOppdrag} onVeksle={vekslOppdrag} />
            </div>
            {utkast.pris.oppdrag.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/20 px-4 py-3 text-sm text-white/70">
                Ingen oppdrag valgt. Velg Befaring, Sikring, Bekjempelse eller Serviceavtale – kunden kan ha flere.
              </p>
            ) : (
              <div className="space-y-2">
                {utkast.pris.oppdrag.map(o => {
                  const typ = OPPDRAG[o.type];
                  return (
                    <div key={o.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10 xl:grid-cols-[1.6fr_0.7fr_1fr_1fr_auto]">
                      <Felt etikett={typ.navn} className="col-span-4 xl:col-span-1">
                        {typ.varianter.length > 1 ? (
                          <select value={o.variant} className={inputStil}
                            onChange={e => endreOppdrag(o.id, { variant: e.target.value, pris: typ.varianter.find(v => v.navn === e.target.value)!.pris })}>
                            {typ.varianter.map(v => <option key={v.navn} value={v.navn}>{v.navn}</option>)}
                          </select>
                        ) : (
                          <input value={o.variant} onChange={e => endreOppdrag(o.id, { variant: e.target.value })} className={inputStil} />
                        )}
                      </Felt>
                      <Felt etikett="Antall">
                        <input type="number" min={0} value={o.antall || ''} placeholder="0" className={inputStil}
                          onChange={e => endreOppdrag(o.id, { antall: Number(e.target.value) || 0 })} />
                      </Felt>
                      <Felt etikett="Pris per stk">
                        <div className="relative">
                          <input type="number" min={0} step="0.01" value={o.pris || ''} placeholder="Fyll inn" className={`${inputStil} pr-9`}
                            onChange={e => endreOppdrag(o.id, { pris: Number(e.target.value) || 0 })} />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/55">kr</span>
                        </div>
                      </Felt>
                      <Sumboks etikett="Sum" belop={o.antall * o.pris} />
                      <button onClick={() => vekslOppdrag(o.type)} title={`Fjern ${typ.navn.toLowerCase()}`}
                        className="mb-1.5 justify-self-end rounded-lg p-2 text-white/60 hover:bg-rose-500/15 hover:text-rose-300">
                        <Ikon navn="slett" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex justify-end pr-1 text-sm text-white/75">
                  Sum oppdrag:&nbsp;<span className="font-semibold tabular-nums text-white">{kroner(pris.oppdragSum)}</span>
                </div>
              </div>
            )}

            {/* Tillegg */}
            <Undertittel className="mt-6">Tillegg</Undertittel>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {tall('utstyr', 'Utstyr', 'kr')}
              {tall('kjoreKm', 'Kjøring', 'km')}
              {tall('bompenger', 'Bompenger', 'kr')}
              {tall('rabatt', 'Rabatt', '%')}
            </div>

            {/* Sum */}
            <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-white/15">
              <div className="bg-white/[0.06] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-sky-200">Sum</div>
              <dl className="space-y-1.5 bg-white/[0.03] px-5 py-4 text-sm">
                <Sumlinje navn="Arbeid" belop={pris.grunnlag} />
                <Sumlinje navn="Oppdrag" belop={pris.oppdragSum} />
                <Sumlinje navn="Utstyr" belop={utkast.pris.utstyr} />
                <Sumlinje navn="Kjøring" belop={pris.kjoreTillegg} />
                <Sumlinje navn="Bompenger" belop={utkast.pris.bompenger} />
                {pris.rabattBelop > 0 && <Sumlinje navn={`Rabatt ${utkast.pris.rabatt} %`} belop={-pris.rabattBelop} />}
                <div className="!mt-3 border-t border-white/10 pt-3"><Sumlinje navn="Sum eks. mva" belop={pris.sumEksMva} sterk /></div>
                <Sumlinje navn="MVA 25 %" belop={pris.mva} />
              </dl>
              <div className="flex items-center justify-between bg-gradient-to-r from-ocab-600 to-ocab-500 px-5 py-4 text-white">
                <span className="text-sm text-ocab-100">Totalt inkl. mva</span>
                <span className="text-2xl font-semibold tabular-nums tracking-tight">{kroner(pris.totalInklMva)}</span>
              </div>
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
                <li key={n.id} className="group rounded-xl bg-white/[0.05] px-3 py-2.5 text-sm ring-1 ring-white/10">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    {tidspunkt(n.tidspunkt)}
                    <button onClick={() => endre({ notater: utkast.notater.filter(x => x.id !== n.id) })}
                      className="opacity-0 transition hover:text-rose-300 group-hover:opacity-100" title="Slett notat">
                      <Ikon navn="lukk" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-white/85">{n.tekst}</p>
                </li>
              ))}
              {utkast.notater.length === 0 && <li className="text-sm text-white/55">Ingen notater ennå.</li>}
            </ul>
          </Seksjon>

          <Seksjon tittel="Aktivitet">
            <ol className="relative space-y-3 border-l border-white/15 pl-4">
              {utkast.aktiviteter.slice(0, 15).map(a => (
                <li key={a.id} className="text-sm">
                  <span className="absolute -left-[3px] mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-300" />
                  <p className="text-white/85">{a.tekst}</p>
                  <p className="text-xs text-white/55">{tidspunkt(a.tidspunkt)}</p>
                </li>
              ))}
              {utkast.aktiviteter.length === 0 && <li className="text-sm text-white/55">Ingen aktivitet registrert.</li>}
            </ol>
          </Seksjon>
        </div>
      </div>
    </Modal>
  );
}

function Seksjon({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
      <h3 className="mb-4 text-sm font-semibold text-white">{tittel}</h3>
      {children}
    </section>
  );
}

function Undertittel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h4 className={`mb-3 text-xs font-semibold uppercase tracking-wide text-sky-200 ${className}`}>{children}</h4>;
}

function Sumboks({ etikett, belop }: { etikett: string; belop: number }) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/65">{etikett}</span>
      <div className="rounded-xl bg-ocab-500/20 px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-white ring-1 ring-ocab-300/30">
        {kroner(belop)}
      </div>
    </div>
  );
}

function Sumlinje({ navn, belop, sterk = false }: { navn: string; belop: number; sterk?: boolean }) {
  return (
    <div className={`flex justify-between ${sterk ? 'font-semibold text-white' : 'text-white/80'} ${belop === 0 && !sterk ? 'opacity-50' : ''}`}>
      <dt>{navn}</dt><dd className="tabular-nums">{kroner(belop)}</dd>
    </div>
  );
}

// Nedtrekksmeny med avkrysning – en kunde kan ha flere oppdrag samtidig.
function OppdragVelger({ valgte, onVeksle }: { valgte: OppdragType[]; onVeksle: (t: OppdragType) => void }) {
  const [apen, setApen] = useState(false);
  const ref = useKlikkUtenfor<HTMLDivElement>(apen, () => setApen(false));

  return (
    <div ref={ref} className="relative mb-3">
      <button onClick={() => setApen(!apen)}
        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15">
        <Ikon navn="pluss" className="h-3.5 w-3.5" />
        {valgte.length ? `${valgte.length} valgt` : 'Velg oppdrag'}
        <Ikon navn="pil_ned" className="h-3 w-3 opacity-60" />
      </button>
      {apen && (
        <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl bg-slate-900 p-1 shadow-2xl ring-1 ring-white/20">
          {OPPDRAG_REKKEFOLGE.map(t => {
            const valgt = valgte.includes(t);
            return (
              <button key={t} onClick={() => onVeksle(t)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-white/85 hover:bg-white/10">
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${valgt ? 'border-ocab-400 bg-ocab-500 text-white' : 'border-white/30'}`}>
                  {valgt && <Ikon navn="hake" className="h-3 w-3" />}
                </span>
                <span className="flex-1">{OPPDRAG[t].navn}</span>
                <span className="text-xs text-white/55">
                  {OPPDRAG[t].varianter[0].pris ? kroner(OPPDRAG[t].varianter[0].pris) : 'etter avtale'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
