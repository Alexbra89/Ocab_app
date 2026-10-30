'use client';

import { useEffect, useMemo, useState } from 'react';
import GlassRamme, { GlassKort, SideTopp } from '../components/GlassRamme';
import { GlassStolper } from '../components/GlassDiagrammer';
import { Initialer } from '../components/Skjema';
import Stolpediagram from '../components/Stolpediagram';
import { DIAGRAM_REKKEFOLGE, kroner, lastSaker, SAKSBEHANDLERE, STATUSER, type Sak } from '@/lib/saker';
import { lagStatistikk, sisteMaaneder, type Mva } from '@/lib/statistikk';

type Periode = 6 | 12 | 24;

const STATUS_SERIER = DIAGRAM_REKKEFOLGE.map(s => ({ nokkel: s, navn: STATUSER[s].navn, farge: STATUSER[s].diagram }));

// Hele kroner i oversikten – øre hører hjemme på tilbudet, ikke i statistikken.
const kr = (belop: number) => kroner(Math.round(belop));
const antall = (n: number) => String(n);

export default function StatistikkSide() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [lastet, setLastet] = useState(false);
  const [periode, setPeriode] = useState<Periode>(12);
  const [behandler, setBehandler] = useState('alle');
  const [mva, setMva] = useState<Mva>('eks');
  const [na] = useState(() => Date.now());

  // localStorage finnes bare i nettleseren, så dataene leses inn etter første visning.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaker(lastSaker());
    setLastet(true);
  }, []);

  const stat = useMemo(() => {
    const utvalg = saker.filter(s => behandler === 'alle' || s.saksbehandler === behandler);
    return lagStatistikk(utvalg, sisteMaaneder(periode, new Date(na)), mva, na);
  }, [saker, behandler, periode, mva, na]);

  const n = stat.nokkeltall;
  const mvaTekst = mva === 'inkl' ? 'inkl. mva' : 'eks. mva';
  const maksOppdrag = Math.max(1, ...stat.perOppdrag.map(o => o.sum));

  return (
    <GlassRamme aktiv="statistikk">
      <SideTopp tittel="Statistikk"
        undertittel={`${behandler === 'alle' ? 'Alle saksbehandlere' : behandler} · siste ${periode} måneder · beløp ${mvaTekst}`} />

      {/* Filtre */}
      <div className="glass glass-inn mt-6 flex flex-col gap-3 rounded-2xl p-2 lg:flex-row lg:items-center lg:justify-between" style={{ animationDelay: '60ms' }}>
        <div className="flex flex-wrap gap-1">
          {['alle', ...SAKSBEHANDLERE].map(navn => (
            <button key={navn} onClick={() => setBehandler(navn)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${behandler === navn ? 'bg-ocab-500/40 text-white ring-1 ring-sky-300/50' : 'text-white/80 hover:bg-white/10'}`}>
              {navn === 'alle' ? 'Alle' : <><Initialer navn={navn} aktiv={behandler === navn} />{navn}</>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Bryter valg={[['eks', 'Eks. mva'], ['inkl', 'Inkl. mva']]} verdi={mva} onEndre={v => setMva(v as Mva)} />
          <Bryter valg={[['6', '6 mnd'], ['12', '12 mnd'], ['24', '24 mnd']]} verdi={String(periode)} onEndre={v => setPeriode(Number(v) as Periode)} />
        </div>
      </div>

      {lastet && (
        <div className="space-y-4">
          {/* ===== SAKER ===== */}
          <Overskrift tittel="Saker" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Nokkeltall tittel="Innkommende" verdi={n.antallNye} tekst={`saker siste ${periode} mnd`} />
            <Nokkeltall tittel="Fullført" verdi={n.antallFerdige} tekst={`saker siste ${periode} mnd`} />
            <Nokkeltall tittel="Åpne nå" verdi={n.antallApne} tekst="Ny eller pågående" />
            <Nokkeltall tittel="Snitt løpetid" verdi={n.snittLopetid === null ? '–' : `${n.snittLopetid} d`}
              tekst={n.snittLopetid === null ? 'ingen fullførte saker' : 'for fullførte saker'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassKort tittel="Innkommende saker per måned" tekst="Antall nye saker etter opprettet-dato">
              <GlassStolper punkter={stat.antall.innkommende} formater={antall} navn="Innkommende" />
            </GlassKort>
            <GlassKort tittel="Fullførte saker per måned" tekst="Saker satt til «Ferdig», etter dato de ble avsluttet">
              <GlassStolper punkter={stat.antall.fullforte} formater={antall} navn="Fullført" />
            </GlassKort>
          </div>

          <GlassKort tittel="Alle statuser per måned" tekst="Sakene som kom inn hver måned, fordelt på status de har i dag">
            <Stolpediagram hoyde={260} punkter={stat.antall.perStatus} serier={STATUS_SERIER} />
          </GlassKort>

          {/* ===== ØKONOMI ===== */}
          <Overskrift tittel="Økonomi" tekst={`Summen av pris og tilbud på sakene, ${mvaTekst}.`} />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Nokkeltall tittel="Fullført verdi" verdi={kr(n.verdiFerdige)} tekst={`${n.antallFerdige} fullførte saker`} uthevet />
            <Nokkeltall tittel="Innkommende verdi" verdi={kr(n.verdiNye)} tekst={`${n.antallNye} nye saker`} />
            <Nokkeltall tittel="Åpen verdi" verdi={kr(n.verdiApne)} tekst="Ny eller pågående nå" />
            <Nokkeltall tittel="Snitt per fullført sak" verdi={n.snittFerdig === null ? '–' : kr(n.snittFerdig)} tekst={mvaTekst} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GlassKort tittel="Fullført verdi per måned" tekst="Sum for saker satt til «Ferdig», etter avsluttet-dato">
              <GlassStolper punkter={stat.verdi.fullforte} formater={kr} navn="Fullført" />
            </GlassKort>
            <GlassKort tittel="Innkommende verdi per måned" tekst="Sum for nye saker etter opprettet-dato">
              <GlassStolper punkter={stat.verdi.innkommende} formater={kr} navn="Innkommende" />
            </GlassKort>
          </div>

          <GlassKort tittel="Verdi per status per måned" tekst="Sum for sakene som kom inn hver måned, fordelt på status de har i dag">
            <Stolpediagram hoyde={260} punkter={stat.verdi.perStatus} serier={STATUS_SERIER} formater={kr} />
          </GlassKort>

          <div className="grid gap-4 lg:grid-cols-5">
            <GlassKort tittel="Per saksbehandler" tekst={`Siste ${periode} mnd, ${mvaTekst}. «Åpne» gjelder nå.`} className="lg:col-span-3">
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-white/60">
                      <th className="px-2 pb-3 font-medium">Saksbehandler</th>
                      <th className="px-2 pb-3 text-right font-medium">Nye</th>
                      <th className="px-2 pb-3 text-right font-medium">Fullført</th>
                      <th className="px-2 pb-3 text-right font-medium">Fullført verdi</th>
                      <th className="px-2 pb-3 text-right font-medium">Åpne</th>
                      <th className="px-2 pb-3 text-right font-medium">Åpen verdi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stat.perBehandler.filter(b => behandler === 'alle' || b.navn === behandler).map(b => (
                      <tr key={b.navn} className="border-t border-white/[0.07] tabular-nums transition hover:bg-white/[0.05]">
                        <td className="px-2 py-3">
                          <span className="flex items-center gap-2 font-medium"><Initialer navn={b.navn} />{b.navn}</span>
                        </td>
                        <td className="px-2 py-3 text-right text-white/75">{b.nye}</td>
                        <td className="px-2 py-3 text-right text-white/75">{b.ferdige}</td>
                        <td className="px-2 py-3 text-right font-semibold">{kr(b.verdiFerdige)}</td>
                        <td className="px-2 py-3 text-right text-white/75">{b.apne}</td>
                        <td className="px-2 py-3 text-right text-white/75">{kr(b.verdiApne)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassKort>

            <GlassKort tittel="Per oppdrag" tekst={`Nye saker siste ${periode} mnd, før rabatt, ${mvaTekst}`} className="lg:col-span-2">
              <ul className="space-y-5">
                {stat.perOppdrag.map(o => (
                  <li key={o.type}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-white/85">{o.navn} <span className="text-xs text-white/60">· {o.saker} saker</span></span>
                      <span className="font-semibold tabular-nums">{kr(o.sum)}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-gradient-to-r from-ocab-500 to-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-700"
                        style={{ width: `${(o.sum / maksOppdrag) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </GlassKort>
          </div>
        </div>
      )}
    </GlassRamme>
  );
}

function Bryter({ valg, verdi, onEndre }: { valg: [string, string][]; verdi: string; onEndre: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.06] p-1 ring-1 ring-white/10">
      {valg.map(([v, navn]) => (
        <button key={v} onClick={() => onEndre(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${verdi === v ? 'bg-white text-slate-900 shadow-sm' : 'text-white/75 hover:text-white'}`}>
          {navn}
        </button>
      ))}
    </div>
  );
}

function Overskrift({ tittel, tekst }: { tittel: string; tekst?: string }) {
  return (
    <div className="pt-6">
      <h2 className="text-lg font-semibold tracking-tight">{tittel}</h2>
      {tekst && <p className="text-sm text-white/70">{tekst}</p>}
    </div>
  );
}

function Nokkeltall({ tittel, verdi, tekst, uthevet = false }: { tittel: string; verdi: number | string; tekst: string; uthevet?: boolean }) {
  return (
    <div className={`glass glass-inn relative overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1 ${uthevet ? 'bg-linear-to-br! from-ocab-400/45 via-ocab-600/35 to-ocab-900/30' : ''}`}>
      {uthevet && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />}
      <div className="relative text-xs font-medium text-white/80">{tittel}</div>
      <div className="relative mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{verdi}</div>
      <div className="relative mt-1 text-xs text-white/70">{tekst}</div>
    </div>
  );
}
