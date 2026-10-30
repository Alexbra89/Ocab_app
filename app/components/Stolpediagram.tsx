'use client';

import { useState } from 'react';
import { kortTall, type Punkt } from '@/lib/statistikk';

export interface Serie {
  nokkel: string;
  navn: string;
  farge: string;
}

// Toppen av y-aksen: fire like trinn med pene tall (0–3–6–9–12, 0–25k–50k–75k–100k …).
const pentMaks = (maks: number) => {
  if (maks <= 0) return 4;
  const storrelse = 10 ** Math.floor(Math.log10(maks / 4));
  // Bare hele trinn, så antall saker aldri får aksetall som 2,5.
  const steg = [1, 2, 2.5, 3, 5, 10].map(f => f * storrelse).filter(Number.isInteger).find(t => t * 4 >= maks)!;
  return Math.max(4, steg * 4);
};

// Stolpediagram (stablet når det er flere serier) laget med vanlig HTML, med verktøytips og tabellvisning.
export default function Stolpediagram({ punkter, serier, hoyde = 220, formater = String }: {
  punkter: Punkt[]; serier: Serie[]; hoyde?: number; formater?: (n: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [visTabell, setVisTabell] = useState(false);
  const sum = (p: Punkt) => serier.reduce((s, x) => s + (p.verdier[x.nokkel] || 0), 0);
  const maks = pentMaks(Math.max(0, ...punkter.map(sum)));
  const linjer = [0, 0.25, 0.5, 0.75, 1].map(f => maks * f);

  return (
    <div>
      {serier.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
          {serier.map(s => (
            <span key={s.nokkel} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.farge }} />{s.navn}
            </span>
          ))}
        </div>
      )}

      {!visTabell ? (
        <div className="flex gap-3">
          {/* Y-akse */}
          <div className="relative w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-400" style={{ height: hoyde }}>
            {linjer.map(v => (
              <span key={v} className="absolute right-0 translate-y-1/2" style={{ bottom: `${(v / maks) * 100}%` }}>{kortTall(v)}</span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative" style={{ height: hoyde }}>
              {linjer.map(v => (
                <div key={v} className={`absolute inset-x-0 border-t ${v === 0 ? 'border-slate-300' : 'border-dashed border-slate-200'}`}
                  style={{ bottom: `${(v / maks) * 100}%` }} />
              ))}

              <div className="absolute inset-0 flex items-end gap-1 sm:gap-2">
                {punkter.map((p, i) => {
                  const total = sum(p);
                  const synlige = serier.filter(s => p.verdier[s.nokkel]);
                  return (
                    // Hele kolonnen er treffområdet, så det er lett å treffe små stolper.
                    <div key={p.tittel} className="relative flex h-full flex-1 cursor-default flex-col justify-end"
                      onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                      {hover === i && <div className="absolute inset-0 rounded-md bg-ocab-50/70" />}
                      {total > 0 && (
                        <div className="relative mb-1 text-center text-[11px] font-semibold tabular-nums text-slate-700">{kortTall(total)}</div>
                      )}
                      <div className="relative mx-auto flex w-full max-w-11 flex-col-reverse gap-[2px]" style={{ height: `${(total / maks) * 100}%` }}>
                        {synlige.map((s, j) => (
                          <div key={s.nokkel} style={{ flexGrow: p.verdier[s.nokkel], backgroundColor: s.farge }}
                            className={`min-h-[3px] ${j === synlige.length - 1 ? 'rounded-t-[4px]' : ''}`} />
                        ))}
                      </div>

                      {hover === i && (
                        <div className={`pointer-events-none absolute bottom-full z-10 mb-2 w-52 rounded-xl bg-slate-900 px-3 py-2.5 text-xs text-white shadow-xl ${i > punkter.length / 2 ? 'right-0' : 'left-0'}`}>
                          <div className="mb-1.5 font-semibold capitalize">{p.tittel}</div>
                          {serier.map(s => (
                            <div key={s.nokkel} className="flex items-center justify-between gap-3 py-0.5">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: s.farge }} />{s.navn}
                              </span>
                              <span className="font-semibold tabular-nums">{formater(p.verdier[s.nokkel] || 0)}</span>
                            </div>
                          ))}
                          {serier.length > 1 && (
                            <div className="mt-1 flex justify-between border-t border-white/15 pt-1 font-semibold">
                              <span>Totalt</span><span className="tabular-nums">{formater(total)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex gap-1 sm:gap-2">
              {punkter.map((p, i) => (
                <div key={p.tittel} className={`flex-1 text-center text-[11px] capitalize ${hover === i ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{p.etikett}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4 font-medium">Måned</th>
                {serier.map(s => <th key={s.nokkel} className="py-2 pr-4 text-right font-medium">{s.navn}</th>)}
                {serier.length > 1 && <th className="py-2 text-right font-medium">Totalt</th>}
              </tr>
            </thead>
            <tbody>
              {punkter.map(p => (
                <tr key={p.tittel} className="border-b border-slate-100">
                  <td className="py-2 pr-4 capitalize text-slate-700">{p.tittel}</td>
                  {serier.map(s => <td key={s.nokkel} className="py-2 pr-4 text-right tabular-nums text-slate-900">{formater(p.verdier[s.nokkel] || 0)}</td>)}
                  {serier.length > 1 && <td className="py-2 text-right font-semibold tabular-nums text-slate-900">{formater(sum(p))}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={() => setVisTabell(!visTabell)} className="mt-4 text-xs font-medium text-ocab-700 hover:text-ocab-900">
        {visTabell ? 'Vis som graf' : 'Vis som tabell'}
      </button>
    </div>
  );
}
