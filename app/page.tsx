'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Ikon from './components/Ikon';
import NyKundeModal from './components/NyKundeModal';
import SakModal from './components/SakModal';
import SaksKort from './components/SaksKort';
import { Felt, inputStil, Knapp, Modal } from './components/Skjema';
import { eksporterExcel, eksporterSikkerhetskopi, lastNedTilbud } from '@/lib/eksport';
import {
  aktivtVarsel, erApen, fyllInnManglende, lagreFirma, lagreSaker, lagSak, lastFirma, lastSaker, nyId,
  STATUS_REKKEFOLGE, STATUSER, STANDARD_FIRMA,
  type FirmaInfo, type Kundefelter, type Sak, type Status,
} from '@/lib/saker';

type Sortering = 'nyeste' | 'eldste';
type Filter = Status | 'alle' | 'varsler';

const logg = (sak: Sak, tekst: string): Sak => ({
  ...sak,
  aktiviteter: [{ id: nyId(), tidspunkt: new Date().toISOString(), tekst }, ...sak.aktiviteter],
});

// Endrer status og holder styr på når saken ble avsluttet, så løpetiden stopper.
const medStatus = (sak: Sak, status: Status): Sak => {
  if (sak.status === status) return sak;
  const avsluttes = status === 'ferdig' || status === 'ingen_sak';
  return logg(
    { ...sak, status, avsluttet: avsluttes ? sak.avsluttet || new Date().toISOString() : undefined },
    `Status endret fra «${STATUSER[sak.status].navn}» til «${STATUSER[status].navn}»`,
  );
};

export default function Hjem() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [firma, setFirma] = useState<FirmaInfo>(STANDARD_FIRMA);
  const [lastet, setLastet] = useState(false);
  const [na, setNa] = useState(() => Date.now());

  const [sok, setSok] = useState('');
  const [sortering, setSortering] = useState<Sortering>('nyeste');
  const [filter, setFilter] = useState<Filter>('alle');

  const [nyKunde, setNyKunde] = useState<null | 'skjema' | 'opplasting'>(null);
  const [apenSakId, setApenSakId] = useState<string | null>(null);
  const [visInnstillinger, setVisInnstillinger] = useState(false);
  const [visEksport, setVisEksport] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  // localStorage finnes bare i nettleseren, så dataene leses inn etter første visning.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaker(lastSaker());
    setFirma(lastFirma());
    setLastet(true);
    // Oppdater løpetid og varsler hvert minutt.
    const tidtaker = setInterval(() => setNa(Date.now()), 60_000);
    return () => clearInterval(tidtaker);
  }, []);

  useEffect(() => {
    if (lastet) lagreSaker(saker);
  }, [saker, lastet]);

  const oppdater = (id: string, endre: (s: Sak) => Sak) => setSaker(alle => alle.map(s => (s.id === id ? endre(s) : s)));

  const opprett = (felter: Kundefelter) => {
    setSaker(alle => [lagSak(felter), ...alle]);
    setNyKunde(null);
    setFilter('alle');
  };

  const importer = async (fil: File) => {
    try {
      const data = JSON.parse(await fil.text());
      const importerte: Sak[] = (Array.isArray(data) ? data : data.saker || []).map(fyllInnManglende);
      if (!confirm(`Importere ${importerte.length} saker? Saker med samme ID blir erstattet.`)) return;
      setSaker(alle => [...importerte, ...alle.filter(s => !importerte.some(i => i.id === s.id))]);
      if (data.firma) { setFirma(data.firma); lagreFirma(data.firma); }
    } catch {
      alert('Kunne ikke lese filen. Velg en sikkerhetskopi (.json) eksportert fra OCAB.');
    }
  };

  const antallVarsler = saker.filter(s => aktivtVarsel(s, na)).length;

  const synlige = useMemo(() => {
    const ord = sok.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return saker
      .filter(s => filter === 'alle' || (filter === 'varsler' ? aktivtVarsel(s, na) : s.status === filter))
      .filter(s => {
        const tekst = `${s.navn} ${s.adresse} ${s.postnummer} ${s.poststed}`.toLowerCase();
        return ord.every(o => tekst.includes(o));
      })
      .sort((a, b) => {
        const diff = new Date(b.opprettet).getTime() - new Date(a.opprettet).getTime();
        return sortering === 'nyeste' ? diff : -diff;
      });
  }, [saker, sok, filter, sortering, na]);

  const apenSak = saker.find(s => s.id === apenSakId);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ===== TOPP ===== */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 pb-28 text-white">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black tracking-tighter text-slate-900">OC</div>
              <div>
                <div className="text-lg font-semibold tracking-tight">OCAB <span className="font-light text-slate-400">Pro</span></div>
                <div className="text-xs text-slate-400">{firma.navn}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setNyKunde('opplasting')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20">
                <Ikon navn="last_opp" />Last opp dokument
              </button>
              <div className="relative">
                <button onClick={() => setVisEksport(!visEksport)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-medium ring-1 ring-white/15 backdrop-blur transition hover:bg-white/20">
                  <Ikon navn="last_ned" />Eksporter<Ikon navn="pil_ned" className="h-3 w-3 opacity-60" />
                </button>
                {visEksport && (<>
                  <div className="fixed inset-0 z-30" onClick={() => setVisEksport(false)} />
                  <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl bg-white p-1.5 text-slate-700 shadow-2xl ring-1 ring-slate-200">
                    <Meny ikon="dokument" tittel="Excel (.csv)" tekst={`${synlige.length} saker i visningen`}
                      onClick={() => { eksporterExcel(synlige); setVisEksport(false); }} />
                    <Meny ikon="last_ned" tittel="Sikkerhetskopi (.json)" tekst="Alle saker og innstillinger"
                      onClick={() => { eksporterSikkerhetskopi(saker, firma); setVisEksport(false); }} />
                    <div className="my-1 border-t border-slate-100" />
                    <Meny ikon="last_opp" tittel="Importer sikkerhetskopi" tekst="Hent inn saker fra .json"
                      onClick={() => { importInput.current?.click(); setVisEksport(false); }} />
                  </div>
                </>)}
                <input ref={importInput} type="file" accept=".json" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ''; }} />
              </div>
              <button onClick={() => setVisInnstillinger(true)} title="Firmainnstillinger"
                className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15 transition hover:bg-white/20">
                <Ikon navn="innstillinger" />
              </button>
              <button onClick={() => setNyKunde('skjema')}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-slate-100">
                <Ikon navn="pluss" />Legg til kunde
              </button>
            </div>
          </nav>

          <div className="mt-10">
            <p className="text-sm font-medium text-slate-400">
              {new Date(na).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Saksoversikt</h1>
            <p className="mt-2 text-slate-400">
              {saker.filter(erApen).length} åpne saker
              {antallVarsler > 0 && <> · <span className="text-amber-300">{antallVarsler} trenger oppfølging</span></>}
            </p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-20 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* ===== STATUSKORT ===== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Statistikk aktiv={filter === 'alle'} onClick={() => setFilter('alle')} tittel="Alle saker" antall={saker.length} prikk="bg-slate-900" />
          {STATUS_REKKEFOLGE.map(s => (
            <Statistikk key={s} aktiv={filter === s} onClick={() => setFilter(filter === s ? 'alle' : s)}
              tittel={STATUSER[s].navn} antall={saker.filter(x => x.status === s).length} prikk={STATUSER[s].prikk} />
          ))}
        </div>

        {/* ===== SØK, SORTERING OG VARSLER ===== */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Ikon navn="sok" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på navn eller adresse…"
              className="w-full rounded-2xl border-0 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900" />
            {sok && (
              <button onClick={() => setSok('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-900">
                <Ikon navn="lukk" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <label className="relative">
              <Ikon navn="sorter" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={sortering} onChange={e => setSortering(e.target.value as Sortering)}
                className="appearance-none rounded-2xl border-0 bg-white py-3 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900">
                <option value="nyeste">Dato: nyeste først</option>
                <option value="eldste">Dato: eldste først</option>
              </select>
              <Ikon navn="pil_ned" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </label>
            <button onClick={() => setFilter(filter === 'varsler' ? 'alle' : 'varsler')}
              className={`relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm ring-1 transition ${filter === 'varsler' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
              <Ikon navn="bjelle" />Varsler
              {antallVarsler > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{antallVarsler}</span>
              )}
            </button>
          </div>
        </div>

        {/* ===== SAKER ===== */}
        {lastet && synlige.length > 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {synlige.map(sak => (
              <SaksKort key={sak.id} sak={sak} na={na}
                onApne={() => setApenSakId(sak.id)}
                onStatus={status => oppdater(sak.id, s => medStatus(s, status))}
                onNotat={tekst => oppdater(sak.id, s => ({ ...s, notater: [{ id: nyId(), tidspunkt: new Date().toISOString(), tekst }, ...s.notater] }))}
                onLukkVarsel={niva => oppdater(sak.id, s => logg({ ...s, lukketVarsel: niva }, `Varsel (${niva} dager) lukket`))}
              />
            ))}
          </div>
        )}

        {lastet && synlige.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Ikon navn={saker.length ? 'sok' : 'dokument'} className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{saker.length ? 'Ingen saker passer søket' : 'Ingen saker ennå'}</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {saker.length ? 'Prøv et annet søk eller fjern filteret.' : 'Legg til din første kunde, eller last opp et dokument så fylles informasjonen ut for deg.'}
            </p>
            {!saker.length && (
              <div className="mt-6 flex gap-2">
                <Knapp onClick={() => setNyKunde('opplasting')}><Ikon navn="last_opp" />Last opp dokument</Knapp>
                <Knapp variant="primar" onClick={() => setNyKunde('skjema')}><Ikon navn="pluss" />Legg til kunde</Knapp>
              </div>
            )}
          </div>
        )}
      </main>

      {nyKunde && (
        <NyKundeModal startMedOpplasting={nyKunde === 'opplasting'} onLagre={opprett} onLukk={() => setNyKunde(null)} />
      )}

      {apenSak && (
        <SakModal key={apenSak.id} sak={apenSak} na={na}
          onLukk={() => setApenSakId(null)}
          onTilbud={sak => { lastNedTilbud(sak, firma); oppdater(sak.id, s => logg(s, 'Tilbud lastet ned')); }}
          onSlett={() => { setSaker(alle => alle.filter(s => s.id !== apenSak.id)); setApenSakId(null); }}
          onLagre={utkast => {
            oppdater(apenSak.id, s => {
              const medNyStatus = medStatus({ ...utkast, status: s.status, aktiviteter: s.aktiviteter }, utkast.status);
              return logg(medNyStatus, 'Sak redigert');
            });
            setApenSakId(null);
          }}
        />
      )}

      {visInnstillinger && (
        <FirmaModal firma={firma} onLukk={() => setVisInnstillinger(false)}
          onLagre={f => { setFirma(f); lagreFirma(f); setVisInnstillinger(false); }} />
      )}
    </div>
  );
}

function Statistikk({ tittel, antall, prikk, aktiv, onClick }: {
  tittel: string; antall: number; prikk: string; aktiv: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`rounded-2xl p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${aktiv ? 'bg-white ring-2 ring-slate-900' : 'bg-white ring-slate-200'}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span className={`h-2 w-2 rounded-full ${prikk}`} />{tittel}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{antall}</div>
    </button>
  );
}

function Meny({ ikon, tittel, tekst, onClick }: { ikon: 'dokument' | 'last_ned' | 'last_opp'; tittel: string; tekst: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100">
      <Ikon navn={ikon} className="mt-0.5 h-4 w-4 text-slate-400" />
      <span><span className="block text-sm font-medium text-slate-900">{tittel}</span><span className="block text-xs text-slate-500">{tekst}</span></span>
    </button>
  );
}

function FirmaModal({ firma, onLagre, onLukk }: { firma: FirmaInfo; onLagre: (f: FirmaInfo) => void; onLukk: () => void }) {
  const [utkast, setUtkast] = useState(firma);
  const felt = (navn: keyof FirmaInfo, etikett: string) => (
    <Felt etikett={etikett}>
      <input value={utkast[navn]} onChange={e => setUtkast({ ...utkast, [navn]: e.target.value })} className={inputStil} />
    </Felt>
  );
  return (
    <Modal tittel="Firmainnstillinger" undertittel="Vises på tilbudene du laster ned." onLukk={onLukk}
      bunn={<><Knapp onClick={onLukk}>Avbryt</Knapp><Knapp variant="primar" onClick={() => onLagre(utkast)}>Lagre</Knapp></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {felt('navn', 'Firmanavn')}{felt('orgNr', 'Org.nr')}{felt('telefon', 'Telefon')}{felt('epost', 'E-post')}{felt('adresse', 'Adresse')}
      </div>
    </Modal>
  );
}
