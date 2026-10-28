'use client';

import { useEffect, useMemo, useState } from 'react';
import Ikon from '../components/Ikon';
import { Initialer } from '../components/Skjema';
import Stolpediagram, { type Punkt } from '../components/Stolpediagram';
import Topp from '../components/Topp';
import { dagerApen, erApen, lastSaker, SAKSBEHANDLERE, STATUS_REKKEFOLGE, STATUSER, type Sak } from '@/lib/saker';

type Periode = 6 | 12 | 24;

// "2026-10" i lokal tid, så en sak opprettet 1. november kl. 00.30 havner i november.
const maanedNokkel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// De siste `antall` månedene, eldste først.
const sisteMaaneder = (antall: number) => {
  const na = new Date();
  return Array.from({ length: antall }, (_, i) => {
    const d = new Date(na.getFullYear(), na.getMonth() - (antall - 1 - i), 1);
    const nokkel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const kort = d.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
    return {
      nokkel,
      etikett: d.getMonth() === 0 || i === 0 ? `${kort} ${String(d.getFullYear()).slice(2)}` : kort,
      tittel: d.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }),
    };
  });
};

export default function Statistikk() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [periode, setPeriode] = useState<Periode>(12);
  const [behandler, setBehandler] = useState<string>('alle');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaker(lastSaker());
  }, []);

  const utvalg = useMemo(() => saker.filter(s => behandler === 'alle' || s.saksbehandler === behandler), [saker, behandler]);
  const maaneder = useMemo(() => sisteMaaneder(periode), [periode]);
  const iPerioden = (iso?: string) => !!iso && maaneder.some(m => m.nokkel === maanedNokkel(iso));

  const telle = (hent: (s: Sak) => string | undefined, serie: string, filter: (s: Sak) => boolean = () => true): Punkt[] =>
    maaneder.map(m => ({
      etikett: m.etikett,
      tittel: m.tittel,
      verdier: { [serie]: utvalg.filter(s => filter(s) && hent(s) && maanedNokkel(hent(s)!) === m.nokkel).length },
    }));

  const innkommende = telle(s => s.opprettet, 'antall');
  const fullforte = telle(s => s.avsluttet, 'antall', s => s.status === 'ferdig');
  const perStatus: Punkt[] = maaneder.map(m => ({
    etikett: m.etikett,
    tittel: m.tittel,
    verdier: Object.fromEntries(STATUS_REKKEFOLGE.map(st =>
      [st, utvalg.filter(s => s.status === st && maanedNokkel(s.opprettet) === m.nokkel).length])),
  }));

  const [na] = useState(() => Date.now());
  const nyePeriode = utvalg.filter(s => iPerioden(s.opprettet)).length;
  const ferdigePeriode = utvalg.filter(s => s.status === 'ferdig' && iPerioden(s.avsluttet));
  const snittLopetid = ferdigePeriode.length
    ? Math.round(ferdigePeriode.reduce((sum, s) => sum + dagerApen(s, na), 0) / ferdigePeriode.length) : null;

  return (
    <div className="min-h-screen bg-slate-100">
      <Topp tittel="Statistikk"
        undertittel={`${behandler === 'alle' ? 'Alle saksbehandlere' : behandler} · siste ${periode} måneder`} />

      <main className="relative mx-auto -mt-20 max-w-7xl space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        {/* Filtre */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {['alle', ...SAKSBEHANDLERE].map(n => (
              <button key={n} onClick={() => setBehandler(n)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition ${behandler === n ? 'bg-ocab-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {n === 'alle' ? 'Alle' : <><Initialer navn={n} aktiv={behandler === n} />{n}</>}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {([6, 12, 24] as Periode[]).map(p => (
              <button key={p} onClick={() => setPeriode(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${periode === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                {p} mnd
              </button>
            ))}
          </div>
        </div>

        {/* Nøkkeltall */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Nokkeltall tittel="Innkommende" verdi={nyePeriode} tekst={`saker siste ${periode} mnd`} />
          <Nokkeltall tittel="Fullført" verdi={ferdigePeriode.length} tekst={`saker siste ${periode} mnd`} />
          <Nokkeltall tittel="Åpne nå" verdi={utvalg.filter(erApen).length} tekst="Ny eller pågående" />
          <Nokkeltall tittel="Snitt løpetid" verdi={snittLopetid ?? '–'} tekst={snittLopetid === null ? 'ingen fullførte saker' : 'dager for fullførte saker'} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Kort tittel="Innkommende saker per måned" tekst="Antall nye saker etter opprettet-dato.">
            <Stolpediagram punkter={innkommende} serier={[{ nokkel: 'antall', navn: 'Innkommende', farge: '#006cb7' }]} />
          </Kort>
          <Kort tittel="Fullførte saker per måned" tekst="Saker satt til «Ferdig», etter dato de ble avsluttet.">
            <Stolpediagram punkter={fullforte} serier={[{ nokkel: 'antall', navn: 'Fullført', farge: STATUSER.ferdig.diagram }]} />
          </Kort>
        </div>

        <Kort tittel="Alle statuser per måned" tekst="Sakene som kom inn hver måned, fordelt på status de har i dag.">
          <Stolpediagram hoyde={260} punkter={perStatus}
            serier={STATUS_REKKEFOLGE.map(s => ({ nokkel: s, navn: STATUSER[s].navn, farge: STATUSER[s].diagram }))} />
        </Kort>

        <div className="flex items-start gap-3 rounded-2xl bg-ocab-50 px-5 py-4 text-sm text-ocab-900 ring-1 ring-ocab-100">
          <Ikon navn="klokke" className="mt-0.5 h-4 w-4 shrink-0" />
          Økonomi (omsetning, tilbudsverdi og fakturert per måned) kommer her senere.
        </div>
      </main>
    </div>
  );
}

function Nokkeltall({ tittel, verdi, tekst }: { tittel: string; verdi: number | string; tekst: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tittel}</div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{verdi}</div>
      <div className="mt-1 text-xs text-slate-500">{tekst}</div>
    </div>
  );
}

function Kort({ tittel, tekst, children }: { tittel: string; tekst: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{tittel}</h2>
      <p className="mb-6 mt-0.5 text-sm text-slate-500">{tekst}</p>
      {children}
    </section>
  );
}
