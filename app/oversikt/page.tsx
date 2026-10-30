'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Ikon from '../components/Ikon';
import { GlassLinjer, GlassMaler, GlassSmultring, GlassStolper } from './diagrammer';
import {
  aktivtVarsel, beregnPris, dagerApen, erApen, kroner, lastSaker, SAKSBEHANDLERE, STATUSER, VALGT_BEHANDLER_NOKKEL,
  type Sak, type Status,
} from '@/lib/saker';
import { endring, lagOversikt } from '@/lib/statistikk';

// Statusfarger for mørk bakgrunn – kontrollert for fargeblindhet i rekkefølgen Ny, Ferdig, Pågående, Ingen sak.
const MORK: Record<Status, { farge: string; pille: string }> = {
  ny: { farge: '#3b82f6', pille: 'bg-blue-500/20 text-blue-100 ring-blue-400/30' },
  ferdig: { farge: '#059669', pille: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/30' },
  pagaende: { farge: '#d97706', pille: 'bg-amber-500/20 text-amber-100 ring-amber-400/30' },
  ingen_sak: { farge: '#e11d48', pille: 'bg-rose-500/20 text-rose-100 ring-rose-400/30' },
};
const SMULTRING_REKKEFOLGE: Status[] = ['ny', 'ferdig', 'pagaende', 'ingen_sak'];

const hilsen = (time: number) => (time < 10 ? 'God morgen' : time < 17 ? 'God dag' : 'God kveld');
const hel = (n: number) => kroner(Math.round(n));

export default function Oversikt() {
  const router = useRouter();
  const [saker, setSaker] = useState<Sak[]>([]);
  const [lastet, setLastet] = useState(false);
  const [navn, setNavn] = useState('');
  const [sok, setSok] = useState('');
  const [na, setNa] = useState(() => Date.now());

  // localStorage finnes bare i nettleseren, så dataene leses inn etter første visning.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaker(lastSaker());
    try {
      const valgt = localStorage.getItem(VALGT_BEHANDLER_NOKKEL) || '';
      setNavn(SAKSBEHANDLERE.includes(valgt) ? valgt : '');
    } catch {}
    setLastet(true);
    const tidtaker = setInterval(() => setNa(Date.now()), 60_000);
    return () => clearInterval(tidtaker);
  }, []);

  const o = useMemo(() => lagOversikt(saker, na), [saker, na]);
  const apne = saker.filter(erApen);
  const varsler = apne.filter(s => aktivtVarsel(s, na));
  const kritiske = varsler.filter(s => aktivtVarsel(s, na)?.niva === 30).length;
  const snittLopetid = o.stat.nokkeltall.snittLopetid;
  const tid = new Date(na);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Bakgrunn: teambildet, mørklagt, med Ocab-logoen svakt over */}
      <div className="pointer-events-none fixed inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/team.jpg" alt="" className="h-full w-full scale-105 object-cover object-[50%_30%] blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/65 to-ocab-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,108,183,0.35),transparent_55%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ocab-logo-hvit.png" alt="" className="absolute -bottom-[4vw] -right-[3vw] w-[70vw] max-w-[1100px] opacity-[0.06]" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Sidemeny */}
        <aside className="glass sticky top-4 m-4 mr-0 hidden h-[calc(100vh-2rem)] w-[72px] shrink-0 flex-col items-center gap-2 rounded-3xl py-5 lg:flex">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ocab-logo-hvit.png" alt="Ocab" className="mb-4 w-11" />
          <Rail href="/oversikt" ikon="rutenett" navn="Oversikt" aktiv />
          <Rail href="/" ikon="dokument" navn="Saker" />
          <Rail href="/statistikk" ikon="diagram" navn="Statistikk" />
          <div className="my-2 h-px w-8 bg-white/15" />
          <Rail href="/?ny=kunde" ikon="pluss" navn="Legg til kunde" />
          <Rail href="/?ny=dokument" ikon="last_opp" navn="Last opp dokument" />
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {/* Toppfelt */}
          <header className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ocab-logo-hvit.png" alt="Ocab" className="w-16" />
              <nav className="flex gap-1 text-sm">
                <Link href="/" className="rounded-lg px-2.5 py-1.5 text-white/70 hover:bg-white/10">Saker</Link>
                <Link href="/statistikk" className="rounded-lg px-2.5 py-1.5 text-white/70 hover:bg-white/10">Statistikk</Link>
              </nav>
            </div>
            <form className="glass order-last flex min-w-0 flex-1 basis-full items-center gap-2 rounded-2xl px-4 py-2.5 sm:order-none sm:basis-auto"
              onSubmit={e => { e.preventDefault(); router.push(`/?sok=${encodeURIComponent(sok)}`); }}>
              <Ikon navn="sok" className="h-4 w-4 text-white/50" />
              <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på kunde, adresse eller saksnummer…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none" />
              <kbd className="hidden rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 sm:block">Enter</kbd>
            </form>
            {/* Klokke og dato tegnes først i nettleseren, så de ikke avviker fra serverens versjon */}
            <div className="glass ml-auto min-w-[88px] rounded-2xl px-3.5 py-2 text-right text-xs leading-tight sm:ml-0">
              <div className="font-semibold tabular-nums">{lastet ? tid.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : '–'}</div>
              <div className="capitalize text-white/55">{lastet ? tid.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' }) : '\u00a0'}</div>
            </div>
            <Link href="/?ny=kunde"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-ocab-400 to-ocab-600 px-4 py-2.5 text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(0,108,183,0.8)] ring-1 ring-white/20 transition hover:brightness-110">
              <Ikon navn="pluss" />Ny kunde
            </Link>
          </header>

          {/* Hilsen */}
          <div className="glass-inn mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {lastet ? hilsen(tid.getHours()) : 'Hei'}, {navn || 'Ocab-teamet'} <span className="inline-block origin-[70%_70%] animate-[wave_2s_ease-in-out_1]">👋</span>
              </h1>
              <p className="mt-1.5 text-white/60">{lastet ? `Dette skjer i sakene dine i ${tid.toLocaleDateString('nb-NO', { month: 'long' })}.` : '\u00a0'}</p>
            </div>
            {kritiske > 0 && (
              <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3.5 py-1.5 text-sm font-medium text-red-100 ring-1 ring-red-400/40 hover:bg-red-500/30">
                <span className="relative flex h-2 w-2"><span className="absolute h-full w-full animate-ping rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-red-500" /></span>
                {kritiske} {kritiske === 1 ? 'sak' : 'saker'} over 30 dager
              </Link>
            )}
          </div>

          {lastet && (
            <>
              {/* Nøkkeltall */}
              <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Nokkeltall forsinkelse={0} uthevet tittel="Fullført verdi" verdi={hel(o.verdiDenne)} tekst="denne måneden, eks. mva"
                  endring={endring(o.verdiDenne, o.verdiForrige)} />
                <Nokkeltall forsinkelse={60} tittel="Nye saker" verdi={String(o.nyeDenne)} tekst="denne måneden"
                  endring={endring(o.nyeDenne, o.nyeForrige)} />
                <Nokkeltall forsinkelse={120} tittel="Åpne saker" verdi={String(apne.length)}
                  tekst={varsler.length ? `${varsler.length} trenger oppfølging` : 'ingen trenger oppfølging'} />
                <Nokkeltall forsinkelse={180} tittel="Snitt løpetid" verdi={snittLopetid === null ? '–' : `${snittLopetid} d`}
                  tekst="for fullførte saker siste 12 mnd" />
              </section>

              {/* Hovedgrafer */}
              <section className="mt-4 grid gap-4 xl:grid-cols-3">
                <Kort tittel="Fullført verdi per måned" tekst="Saker satt til «Ferdig», eks. mva" className="xl:col-span-2" forsinkelse={120}
                  hoyre={<Link href="/statistikk" className="text-xs text-white/60 hover:text-white">Se statistikk →</Link>}>
                  <GlassStolper punkter={o.stat.verdi.fullforte} formater={hel} />
                </Kort>
                <Kort tittel="Saker per status" tekst="Alle saker akkurat nå" forsinkelse={180}>
                  <GlassSmultring biter={SMULTRING_REKKEFOLGE.map(s => ({ nokkel: s, navn: STATUSER[s].navn, verdi: o.statusFordeling[s], farge: MORK[s].farge }))} />
                </Kort>
              </section>

              <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <Kort tittel="Innkommende og fullførte saker" tekst="Antall per måned, siste 12 mnd" className="lg:col-span-2 xl:col-span-1" forsinkelse={200}>
                  <GlassLinjer punkter={o.stat.antall.innkommende.map((p, i) => ({
                    ...p, verdier: { inn: p.verdier.verdi, ferdig: o.stat.antall.fullforte[i].verdier.verdi },
                  }))} linjer={[
                    { nokkel: 'inn', navn: 'Innkommende', farge: '#3b82f6' },
                    { nokkel: 'ferdig', navn: 'Fullført', farge: '#10b981' },
                  ]} />
                </Kort>
                <Kort tittel="Fullføringsgrad" tekst="Siste 12 måneder" forsinkelse={240}>
                  <div className="pt-4">
                    <GlassMaler andel={o.fullforingsgrad}
                      tekst={o.antallAvsluttet ? `av ${o.antallAvsluttet} avsluttede saker endte som «Ferdig»` : 'Ingen avsluttede saker ennå'} />
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <Minitall tittel="Fullført denne mnd" verdi={o.ferdigeDenne} />
                    <Minitall tittel="Ingen sak totalt" verdi={o.statusFordeling.ingen_sak} />
                  </div>
                </Kort>
                <Kort tittel="Oppdrag" tekst="Nye saker siste 12 mnd, eks. mva" forsinkelse={280}>
                  <OppdragListe oppdrag={o.stat.perOppdrag} />
                </Kort>
              </section>

              {/* Siste saker og teamet */}
              <section className="mt-4 grid gap-4 xl:grid-cols-3">
                <Kort tittel="Siste saker" tekst={`${saker.length} saker totalt`} className="xl:col-span-2" forsinkelse={320}
                  hoyre={<Link href="/" className="text-xs text-white/60 hover:text-white">Alle saker →</Link>}>
                  <SisteSaker saker={o.sisteSaker} na={na} />
                </Kort>
                <Team saker={saker} na={na} />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function Rail({ href, ikon, navn, aktiv = false }: { href: string; ikon: Parameters<typeof Ikon>[0]['navn']; navn: string; aktiv?: boolean }) {
  return (
    <Link href={href} title={navn} aria-label={navn}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition ${aktiv ? 'bg-white text-slate-900 shadow-lg' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
      <Ikon navn={ikon} className="h-5 w-5" />
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-lg bg-slate-950/90 px-2.5 py-1 text-xs text-white opacity-0 ring-1 ring-white/10 transition group-hover:opacity-100">
        {navn}
      </span>
    </Link>
  );
}

function Kort({ tittel, tekst, children, className = '', hoyre, forsinkelse = 0 }: {
  tittel: string; tekst?: string; children: ReactNode; className?: string; hoyre?: ReactNode; forsinkelse?: number;
}) {
  return (
    <div className={`glass glass-inn rounded-3xl p-5 sm:p-6 ${className}`} style={{ animationDelay: `${forsinkelse}ms` }}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{tittel}</h2>
          {tekst && <p className="mt-0.5 text-xs text-white/50">{tekst}</p>}
        </div>
        {hoyre}
      </div>
      {children}
    </div>
  );
}

function Nokkeltall({ tittel, verdi, tekst, endring, uthevet = false, forsinkelse }: {
  tittel: string; verdi: string; tekst: string; endring?: number | null; uthevet?: boolean; forsinkelse: number;
}) {
  return (
    <div style={{ animationDelay: `${forsinkelse}ms` }}
      className={`glass glass-inn group relative overflow-hidden rounded-3xl p-5 transition duration-300 hover:-translate-y-1 ${uthevet ? 'bg-linear-to-br! from-ocab-400/45 via-ocab-600/35 to-ocab-900/30' : ''}`}>
      {uthevet && <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />}
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium text-white/70">{tittel}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 ring-1 ring-white/15 transition group-hover:bg-white group-hover:text-slate-900">
          <Ikon navn="pil_hoyre" className="h-3.5 w-3.5 -rotate-45" />
        </span>
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{verdi}</span>
        {endring !== undefined && endring !== null && (
          <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${endring >= 0 ? 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30' : 'bg-rose-400/15 text-rose-200 ring-rose-300/30'}`}>
            <Ikon navn={endring >= 0 ? 'trend_opp' : 'trend_ned'} className="h-3 w-3" />
            {endring >= 0 ? '+' : ''}{Math.round(endring)} %
          </span>
        )}
      </div>
      <p className="relative mt-1 text-xs text-white/55">{tekst}{endring !== undefined && endring !== null ? ' · mot forrige mnd' : ''}</p>
    </div>
  );
}

function Minitall({ tittel, verdi }: { tittel: string; verdi: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
      <div className="text-[11px] text-white/50">{tittel}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums">{verdi}</div>
    </div>
  );
}

function OppdragListe({ oppdrag }: { oppdrag: { type: string; navn: string; saker: number; sum: number }[] }) {
  const maks = Math.max(1, ...oppdrag.map(o => o.sum));
  return (
    <ul className="space-y-5">
      {oppdrag.map(o => (
        <li key={o.type}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-white/85">{o.navn} <span className="text-xs text-white/45">· {o.saker} saker</span></span>
            <span className="font-semibold tabular-nums">{hel(o.sum)}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div className="h-1.5 rounded-full bg-gradient-to-r from-ocab-500 to-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-all duration-700"
              style={{ width: `${(o.sum / maks) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// Løpetiden som en tynn linje som fylles opp mot 30 dager, med varselfarge.
const lopetidFarge = (dager: number, apen: boolean) =>
  !apen ? 'bg-white/30' : dager >= 30 ? 'bg-red-500' : dager >= 15 ? 'bg-yellow-400' : dager >= 2 ? 'bg-yellow-200' : 'bg-sky-400';

function SisteSaker({ saker, na }: { saker: Sak[]; na: number }) {
  if (!saker.length) {
    return (
      <div className="flex flex-col items-center py-10 text-center text-sm text-white/60">
        Ingen saker ennå.
        <Link href="/?ny=kunde" className="mt-3 rounded-xl bg-white/10 px-4 py-2 font-medium text-white ring-1 ring-white/15 hover:bg-white/20">Legg til første kunde</Link>
      </div>
    );
  }
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-white/45">
            <th className="px-2 pb-3 font-medium">Kunde</th>
            <th className="px-2 pb-3 font-medium">Saksbehandler</th>
            <th className="px-2 pb-3 font-medium">Status</th>
            <th className="px-2 pb-3 font-medium">Løpetid</th>
            <th className="px-2 pb-3 text-right font-medium">Verdi</th>
          </tr>
        </thead>
        <tbody>
          {saker.map(s => {
            const dager = dagerApen(s, na);
            return (
              <tr key={s.id} className="border-t border-white/[0.07] transition hover:bg-white/[0.05]">
                <td className="px-2 py-3">
                  <Link href={`/?sak=${encodeURIComponent(s.id)}`} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ocab-400 to-ocab-700 text-xs font-semibold ring-1 ring-white/20">
                      {(s.navn || '?').split(/\s+/).map(d => d[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium hover:underline">{s.navn || 'Uten navn'}</span>
                      <span className="block truncate text-xs text-white/50">#{s.saksnummer}{s.poststed ? ` · ${s.poststed}` : ''}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-2 py-3 text-white/75">{s.saksbehandler || '–'}</td>
                <td className="px-2 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${MORK[s.status].pille}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: MORK[s.status].farge }} />{STATUSER[s.status].navn}
                  </span>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-20 rounded-full bg-white/10">
                      <div className={`h-1.5 rounded-full ${lopetidFarge(dager, erApen(s))}`} style={{ width: `${Math.min(100, Math.max(4, (dager / 30) * 100))}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-white/70">{dager} d</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-right font-medium tabular-nums">{hel(beregnPris(s.pris).sumEksMva)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Team({ saker, na }: { saker: Sak[]; na: number }) {
  return (
    <div className="glass glass-inn overflow-hidden rounded-3xl" style={{ animationDelay: '360ms' }}>
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/team.jpg" alt="Ocab-teamet" className="h-full w-full object-cover object-[50%_25%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
        <div className="absolute bottom-3 left-5">
          <div className="text-sm font-semibold">Ocab-teamet</div>
          <div className="text-xs text-white/60">Saving value, helping people</div>
        </div>
      </div>
      <ul className="divide-y divide-white/[0.07] px-5 py-2">
        {SAKSBEHANDLERE.map(navn => {
          const egne = saker.filter(s => s.saksbehandler === navn && erApen(s));
          const varsler = egne.filter(s => aktivtVarsel(s, na)).length;
          return (
            <li key={navn} className="flex items-center gap-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold ring-1 ring-white/15">
                {navn.slice(0, 2).toUpperCase()}
              </span>
              <span className="flex-1 text-sm">{navn}</span>
              {varsler > 0 && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-200 ring-1 ring-amber-300/30">{varsler} varsler</span>}
              <span className="text-xs tabular-nums text-white/60">{egne.length} åpne</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
