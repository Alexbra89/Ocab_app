'use client';

// Grafer i glass-stil for oversiktssiden (mørk bakgrunn). Alle har verktøytips ved hover.

import { useState } from 'react';
import { kortTall, type Punkt } from '@/lib/statistikk';

// Toppen av y-aksen med fire pene trinn.
const pentMaks = (maks: number) => {
  if (maks <= 0) return 4;
  const storrelse = 10 ** Math.floor(Math.log10(maks / 4));
  const steg = [1, 2, 2.5, 3, 5, 10].map(f => f * storrelse).filter(Number.isInteger).find(t => t * 4 >= maks)!;
  return Math.max(4, steg * 4);
};

const Tips = ({ tittel, rader, side }: { tittel: string; rader: [string, string, string?][]; side: 'venstre' | 'hoyre' }) => (
  <div className={`pointer-events-none absolute bottom-full z-20 mb-3 w-48 rounded-xl bg-slate-950/90 px-3 py-2.5 text-xs text-white shadow-2xl ring-1 ring-white/15 backdrop-blur ${side === 'hoyre' ? 'right-0' : 'left-0'}`}>
    <div className="mb-1 font-semibold capitalize">{tittel}</div>
    {rader.map(([navn, verdi, farge]) => (
      <div key={navn} className="flex items-center justify-between gap-3 py-0.5">
        <span className="flex items-center gap-1.5 text-white/60">
          {farge && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: farge }} />}{navn}
        </span>
        <span className="font-semibold tabular-nums">{verdi}</span>
      </div>
    ))}
  </div>
);

const Rutenett = ({ maks, hoyde }: { maks: number; hoyde: number }) => (
  <div className="pointer-events-none absolute inset-0" style={{ height: hoyde }}>
    {[0, 0.25, 0.5, 0.75, 1].map(f => (
      <div key={f} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${f * 100}%`, transform: 'translateY(50%)' }}>
        <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-white/40">{kortTall(maks * f)}</span>
        <span className={`h-px flex-1 ${f === 0 ? 'bg-white/20' : 'bg-white/[0.07]'}`} />
      </div>
    ))}
  </div>
);

// Smale, avrundede glass-stolper. Siste måned (eller den man holder over) lyser opp.
export function GlassStolper({ punkter, formater, navn, hoyde = 230 }: {
  punkter: Punkt[]; formater: (n: number) => string; navn: string; hoyde?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const maks = pentMaks(Math.max(0, ...punkter.map(p => p.verdier.verdi || 0)));
  const aktiv = hover ?? punkter.length - 1;

  return (
    <div>
      <div className="relative" style={{ height: hoyde }}>
        <Rutenett maks={maks} hoyde={hoyde} />
        <div className="absolute inset-0 left-11 flex items-end">
          {punkter.map((p, i) => {
            const verdi = p.verdier.verdi || 0;
            const lyser = i === aktiv;
            return (
              <div key={p.tittel} className="relative flex h-full flex-1 flex-col items-center justify-end"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                {lyser && verdi > 0 && (
                  <div className="mb-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-900 shadow-lg">
                    {kortTall(verdi)}
                  </div>
                )}
                <div className={`w-2.5 rounded-full transition-all duration-300 sm:w-3.5 ${lyser
                  ? 'bg-gradient-to-t from-ocab-600 via-ocab-400 to-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.55)]'
                  : 'bg-gradient-to-t from-white/[0.06] to-white/30 ring-1 ring-white/10'}`}
                  style={{ height: `max(${(verdi / maks) * 100}%, 4px)` }} />
                {hover === i && <Tips tittel={p.tittel} rader={[[navn, formater(verdi)]]} side={i > punkter.length / 2 ? 'hoyre' : 'venstre'} />}
              </div>
            );
          })}
        </div>
      </div>
      <Maanedsrad punkter={punkter} aktiv={aktiv} innrykk />
    </div>
  );
}

// Bare månedsnavnet under grafene – årstallet står i verktøytipset.
const kortMaaned = (etikett: string) => etikett.split(' ')[0];

const Maanedsrad = ({ punkter, aktiv, innrykk = false }: { punkter: Punkt[]; aktiv: number | null; innrykk?: boolean }) => (
  <div className={`mt-2 flex ${innrykk ? 'pl-11' : ''}`}>
    {punkter.map((p, i) => (
      <div key={p.tittel} className={`flex-1 text-center text-[10px] capitalize ${i === aktiv ? 'font-semibold text-white' : 'text-white/45'} ${i % 2 && i !== aktiv ? 'max-sm:invisible' : ''}`}>
        {kortMaaned(p.etikett)}
      </div>
    ))}
  </div>
);

// Myk kurve gjennom punktene (vannrette tangenter, så den aldri skyter over).
const glattSti = (pkt: [number, number][]) =>
  pkt.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [x0, y0] = pkt[i - 1];
    const mx = (x0 + x) / 2;
    return `${d} C${mx},${y0} ${mx},${y} ${x},${y}`;
  }, '');

export interface Linje { nokkel: string; navn: string; farge: string }

// Linjediagram med fylt område under hver linje, og trådkors med verdier ved hover.
export function GlassLinjer({ punkter, linjer, hoyde = 210 }: { punkter: Punkt[]; linjer: Linje[]; hoyde?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const maks = pentMaks(Math.max(0, ...punkter.flatMap(p => linjer.map(l => p.verdier[l.nokkel] || 0))));
  const x = (i: number) => (punkter.length > 1 ? (i / (punkter.length - 1)) * 100 : 50);
  const y = (v: number) => 100 - (v / maks) * 100;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        {linjer.map(l => (
          <span key={l.nokkel} className="flex items-center gap-2 text-xs text-white/70">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: l.farge }} />{l.navn}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height: hoyde }}>
        <Rutenett maks={maks} hoyde={hoyde} />
        <div className="absolute inset-0 left-11">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              {linjer.map(l => (
                <linearGradient key={l.nokkel} id={`fyll-${l.nokkel}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={l.farge} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={l.farge} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {linjer.map(l => {
              const sti = glattSti(punkter.map((p, i) => [x(i), y(p.verdier[l.nokkel] || 0)]));
              return (
                <g key={l.nokkel}>
                  <path d={`${sti} L100,100 L0,100 Z`} fill={`url(#fyll-${l.nokkel})`} />
                  <path d={sti} fill="none" stroke={l.farge} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                </g>
              );
            })}
          </svg>

          {/* Treffområder, trådkors og punkter som HTML, så de ikke strekkes med SVG-en */}
          <div className="absolute inset-0 flex">
            {punkter.map((p, i) => (
              <div key={p.tittel} className="relative h-full flex-1" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}
          </div>
          {hover !== null && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-white/25" style={{ left: `${x(hover)}%` }} />
              {linjer.map(l => (
                <span key={l.nokkel} className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-slate-950"
                  style={{ left: `${x(hover)}%`, bottom: `${100 - y(punkter[hover].verdier[l.nokkel] || 0)}%`, backgroundColor: l.farge }} />
              ))}
              <div className="pointer-events-none absolute top-0" style={{ left: `${x(hover)}%` }}>
                <div className="relative">
                  <Tips tittel={punkter[hover].tittel} side={hover > punkter.length / 2 ? 'hoyre' : 'venstre'}
                    rader={linjer.map(l => [l.navn, String(punkter[hover].verdier[l.nokkel] || 0), l.farge])} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between pl-11 text-[10px] capitalize text-white/45">
        {punkter.map((p, i) => (
          <span key={p.tittel} className={`w-0 text-center ${i === hover ? 'font-semibold text-white' : ''} ${i % 2 && i !== hover ? 'max-sm:invisible' : ''}`}>
            <span className="inline-block -translate-x-1/2 whitespace-nowrap">{kortMaaned(p.etikett)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export interface Bit { nokkel: string; navn: string; verdi: number; farge: string }

// Smultringdiagram med 2 px mellomrom mellom bitene. Midten viser biten man holder over.
export function GlassSmultring({ biter, enhet = 'saker' }: { biter: Bit[]; enhet?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = biter.reduce((s, b) => s + b.verdi, 0);
  const r = 62;
  const omkrets = 2 * Math.PI * r;
  const mellomrom = total && biter.filter(b => b.verdi).length > 1 ? 3 : 0;
  const lengder = biter.map(b => (total ? (b.verdi / total) * omkrets : 0));
  const starter = lengder.map((_, i) => lengder.slice(0, i).reduce((a, l) => a + l, 0));
  const valgt = biter.find(b => b.nokkel === hover);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="16" />
          {biter.map((b, i) => b.verdi > 0 && (
              <circle key={b.nokkel} cx="80" cy="80" r={r} fill="none" stroke={b.farge} strokeLinecap="butt"
                strokeWidth={hover === b.nokkel ? 20 : 16} className="cursor-pointer transition-all duration-200"
                strokeDasharray={`${Math.max(0, lengder[i] - mellomrom)} ${omkrets}`} strokeDashoffset={-starter[i]}
                opacity={hover && hover !== b.nokkel ? 0.35 : 1}
                onMouseEnter={() => setHover(b.nokkel)} onMouseLeave={() => setHover(null)} />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-semibold tabular-nums">{valgt ? valgt.verdi : total}</span>
          <span className="text-xs text-white/55">{valgt ? valgt.navn : enhet}</span>
        </div>
      </div>
      <ul className="w-full space-y-2">
        {biter.map(b => (
          <li key={b.nokkel} onMouseEnter={() => setHover(b.nokkel)} onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition ${hover === b.nokkel ? 'bg-white/10' : ''}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.farge }} />
            <span className="flex-1 text-white/80">{b.navn}</span>
            <span className="font-semibold tabular-nums">{b.verdi}</span>
            <span className="w-10 text-right text-xs tabular-nums text-white/45">{total ? Math.round((b.verdi / total) * 100) : 0} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Halvsirkel-måler for en andel mellom 0 og 1.
export function GlassMaler({ andel, tekst }: { andel: number | null; tekst: string }) {
  const verdi = andel ?? 0;
  const r = 80;
  const lengde = Math.PI * r;
  const vinkel = Math.PI * (1 - verdi);
  const knott = { x: 100 + r * Math.cos(vinkel), y: 100 - r * Math.sin(vinkel) };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[240px]">
        <svg viewBox="0 0 200 112" className="w-full overflow-visible">
          <defs>
            <linearGradient id="maler-farge" x1="0" x2="1">
              <stop offset="0%" stopColor="#0b78c2" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="14" strokeLinecap="round" />
          {andel !== null && (
            <>
              <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#maler-farge)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${verdi * lengde} ${lengde}`} className="transition-all duration-700" />
              <circle cx={knott.x} cy={knott.y} r="9" fill="white" className="drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            </>
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <div className="text-4xl font-semibold tabular-nums tracking-tight">{andel === null ? '–' : `${Math.round(verdi * 100)} %`}</div>
        </div>
      </div>
      <p className="mt-2 max-w-[16rem] text-center text-xs text-white/55">{tekst}</p>
    </div>
  );
}
