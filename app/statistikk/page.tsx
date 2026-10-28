'use client';

import { useEffect, useMemo, useState } from 'react';
import { Initialer } from '../components/Skjema';
import Stolpediagram from '../components/Stolpediagram';
import Topp from '../components/Topp';
import { kroner, lastSaker, SAKSBEHANDLERE, STATUS_REKKEFOLGE, STATUSER, type Sak } from '@/lib/saker';
import { lagStatistikk, sisteMaaneder, type Mva } from '@/lib/statistikk';

type Periode = 6 | 12 | 24;

const STATUS_SERIER = STATUS_REKKEFOLGE.map(s => ({ nokkel: s, navn: STATUSER[s].navn, farge: STATUSER[s].diagram }));
const OCAB_BLA = '#006cb7';

// Hele kroner i oversikten – øre hører hjemme på tilbudet, ikke i statistikken.
const kr = (belop: number) => kroner(Math.round(belop));

export default function StatistikkSide() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [periode, setPeriode] = useState<Periode>(12);
  const [behandler, setBehandler] = useState('alle');
  const [mva, setMva] = useState<Mva>('eks');
  const [na] = useState(() => Date.now());

  // localStorage finnes bare i nettleseren, så dataene leses inn etter første visning.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaker(lastSaker());
  }, []);

  const stat = useMemo(() => {
    const utvalg = saker.filter(s => behandler === 'alle' || s.saksbehandler === behandler);
    return lagStatistikk(utvalg, sisteMaaneder(periode, new Date(na)), mva, na);
  }, [saker, behandler, periode, mva, na]);

  const n = stat.nokkeltall;
  const mvaTekst = mva === 'inkl' ? 'inkl. mva' : 'eks. mva';
  const maksOppdrag = Math.max(1, ...stat.perOppdrag.map(o => o.sum));

  return (
    <div className="min-h-screen bg-slate-100">
      <Topp tittel="Statistikk"
        undertittel={`${behandler === 'alle' ? 'Alle saksbehandlere' : behandler} · siste ${periode} måneder · beløp ${mvaTekst}`} />

      <main className="relative mx-auto -mt-20 max-w-7xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        {/* Filtre */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {['alle', ...SAKSBEHANDLERE].map(navn => (
              <button key={navn} onClick={() => setBehandler(navn)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${behandler === navn ? 'bg-ocab-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {navn === 'alle' ? 'Alle' : <><Initialer navn={navn} aktiv={behandler === navn} />{navn}</>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Bryter valg={[['eks', 'Eks. mva'], ['inkl', 'Inkl. mva']]} verdi={mva} onEndre={v => setMva(v as Mva)} />
            <Bryter valg={[['6', '6 mnd'], ['12', '12 mnd'], ['24', '24 mnd']]} verdi={String(periode)} onEndre={v => setPeriode(Number(v) as Periode)} />
          </div>
        </div>

        {/* ===== SAKER ===== */}
        <Overskrift tittel="Saker" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall tittel="Innkommende" verdi={n.antallNye} tekst={`saker siste ${periode} mnd`} />
          <Nokkeltall tittel="Fullført" verdi={n.antallFerdige} tekst={`saker siste ${periode} mnd`} />
          <Nokkeltall tittel="Åpne nå" verdi={n.antallApne} tekst="Ny eller pågående" />
          <Nokkeltall tittel="Snitt løpetid" verdi={n.snittLopetid ?? '–'} tekst={n.snittLopetid === null ? 'ingen fullførte saker' : 'dager for fullførte saker'} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Kort tittel="Innkommende saker per måned" tekst="Antall nye saker etter opprettet-dato.">
            <Stolpediagram punkter={stat.antall.innkommende} serier={[{ nokkel: 'verdi', navn: 'Innkommende', farge: OCAB_BLA }]} />
          </Kort>
          <Kort tittel="Fullførte saker per måned" tekst="Saker satt til «Ferdig», etter dato de ble avsluttet.">
            <Stolpediagram punkter={stat.antall.fullforte} serier={[{ nokkel: 'verdi', navn: 'Fullført', farge: STATUSER.ferdig.diagram }]} />
          </Kort>
        </div>

        <Kort tittel="Alle statuser per måned" tekst="Sakene som kom inn hver måned, fordelt på status de har i dag.">
          <Stolpediagram hoyde={260} punkter={stat.antall.perStatus} serier={STATUS_SERIER} />
        </Kort>

        {/* ===== ØKONOMI ===== */}
        <Overskrift tittel="Økonomi" tekst={`Summen av pris og tilbud på sakene, ${mvaTekst}.`} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall tittel="Fullført verdi" verdi={kr(n.verdiFerdige)} tekst={`${n.antallFerdige} fullførte saker`} uthevet />
          <Nokkeltall tittel="Innkommende verdi" verdi={kr(n.verdiNye)} tekst={`${n.antallNye} nye saker`} />
          <Nokkeltall tittel="Åpen verdi" verdi={kr(n.verdiApne)} tekst="Ny eller pågående nå" />
          <Nokkeltall tittel="Snitt per fullført sak" verdi={n.snittFerdig === null ? '–' : kr(n.snittFerdig)} tekst={mvaTekst} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Kort tittel="Fullført verdi per måned" tekst="Sum for saker satt til «Ferdig», etter avsluttet-dato.">
            <Stolpediagram punkter={stat.verdi.fullforte} formater={kr}
              serier={[{ nokkel: 'verdi', navn: 'Fullført', farge: STATUSER.ferdig.diagram }]} />
          </Kort>
          <Kort tittel="Innkommende verdi per måned" tekst="Sum for nye saker etter opprettet-dato.">
            <Stolpediagram punkter={stat.verdi.innkommende} formater={kr}
              serier={[{ nokkel: 'verdi', navn: 'Innkommende', farge: OCAB_BLA }]} />
          </Kort>
        </div>

        <Kort tittel="Verdi per status per måned" tekst="Sum for sakene som kom inn hver måned, fordelt på status de har i dag.">
          <Stolpediagram hoyde={260} punkter={stat.verdi.perStatus} serier={STATUS_SERIER} formater={kr} />
        </Kort>

        <div className="grid gap-6 lg:grid-cols-5">
          <Kort tittel="Per saksbehandler" tekst={`Siste ${periode} mnd, ${mvaTekst}. «Åpne» gjelder nå.`} className="lg:col-span-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Saksbehandler</th>
                    <th className="py-2 pr-4 text-right font-medium">Nye</th>
                    <th className="py-2 pr-4 text-right font-medium">Fullført</th>
                    <th className="py-2 pr-4 text-right font-medium">Fullført verdi</th>
                    <th className="py-2 pr-4 text-right font-medium">Åpne</th>
                    <th className="py-2 text-right font-medium">Åpen verdi</th>
                  </tr>
                </thead>
                <tbody>
                  {stat.perBehandler.filter(b => behandler === 'alle' || b.navn === behandler).map(b => (
                    <tr key={b.navn} className="border-b border-slate-100 tabular-nums">
                      <td className="py-2.5 pr-4">
                        <span className="flex items-center gap-2 font-medium text-slate-800"><Initialer navn={b.navn} />{b.navn}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-right text-slate-700">{b.nye}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-700">{b.ferdige}</td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-slate-900">{kr(b.verdiFerdige)}</td>
                      <td className="py-2.5 pr-4 text-right text-slate-700">{b.apne}</td>
                      <td className="py-2.5 text-right text-slate-700">{kr(b.verdiApne)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kort>

          <Kort tittel="Per oppdrag" tekst={`Nye saker siste ${periode} mnd, før rabatt, ${mvaTekst}.`} className="lg:col-span-2">
            <ul className="space-y-4">
              {stat.perOppdrag.map(o => (
                <li key={o.type}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">{o.navn}</span>
                    <span className="tabular-nums text-slate-900"><span className="mr-2 text-xs text-slate-500">{o.saker} saker</span>{kr(o.sum)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-ocab-600" style={{ width: `${(o.sum / maksOppdrag) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Kort>
        </div>
      </main>
    </div>
  );
}

function Bryter({ valg, verdi, onEndre }: { valg: [string, string][]; verdi: string; onEndre: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
      {valg.map(([v, navn]) => (
        <button key={v} onClick={() => onEndre(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${verdi === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
          {navn}
        </button>
      ))}
    </div>
  );
}

function Overskrift({ tittel, tekst }: { tittel: string; tekst?: string }) {
  return (
    <div className="pt-4">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{tittel}</h2>
      {tekst && <p className="text-sm text-slate-500">{tekst}</p>}
    </div>
  );
}

function Nokkeltall({ tittel, verdi, tekst, uthevet = false }: { tittel: string; verdi: number | string; tekst: string; uthevet?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ring-1 ${uthevet ? 'bg-ocab-600 text-white ring-ocab-600' : 'bg-white ring-slate-200'}`}>
      <div className={`text-xs font-medium uppercase tracking-wide ${uthevet ? 'text-ocab-100' : 'text-slate-500'}`}>{tittel}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${uthevet ? '' : 'text-slate-900'}`}>{verdi}</div>
      <div className={`mt-1 text-xs ${uthevet ? 'text-ocab-100' : 'text-slate-500'}`}>{tekst}</div>
    </div>
  );
}

function Kort({ tittel, tekst, children, className = '' }: { tittel: string; tekst: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 ${className}`}>
      <h3 className="text-base font-semibold text-slate-900">{tittel}</h3>
      <p className="mb-6 mt-0.5 text-sm text-slate-500">{tekst}</p>
      {children}
    </section>
  );
}
