'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Ikon from './components/Ikon';
import NyKundeModal from './components/NyKundeModal';
import SakModal from './components/SakModal';
import SaksKort from './components/SaksKort';
import FirmaModal from './components/FirmaModal';
import { Initialer, Knapp } from './components/Skjema';
import Topp from './components/Topp';
import { eksporterExcel, eksporterSikkerhetskopi, lastNedTilbud } from '@/lib/eksport';
import {
  aktivtVarsel, erApen, fyllInnManglende, lagreFirma, lagreSaker, lagSak, lastFirma, lastSaker, logg, medNotat,
  medSaksbehandler, medStatus, nesteSaksnummer, SAKSBEHANDLERE, STATUS_REKKEFOLGE, STATUSER, STANDARD_FIRMA,
  tildelSaksnummer, VALGT_BEHANDLER_NOKKEL, type FirmaInfo, type Kundefelter, type Sak, type Status,
} from '@/lib/saker';

type Sortering = 'nyeste' | 'eldste';
type Filter = Status | 'alle' | 'varsler';
const ALLE = '__alle__';
const IKKE_TILDELT = '__ingen__';

export default function Hjem() {
  const [saker, setSaker] = useState<Sak[]>([]);
  const [firma, setFirma] = useState<FirmaInfo>(STANDARD_FIRMA);
  const [lastet, setLastet] = useState(false);
  const [lagringFeilet, setLagringFeilet] = useState(false);
  const [na, setNa] = useState(() => Date.now());

  const [behandler, setBehandler] = useState(ALLE);
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
    try { setBehandler(localStorage.getItem(VALGT_BEHANDLER_NOKKEL) || ALLE); } catch {}
    setLastet(true);

    // Lenker fra oversiktssiden: /?sok=…, /?ny=kunde|dokument og /?sak=<id>.
    const lenke = new URLSearchParams(window.location.search);
    if (lenke.get('sok')) setSok(lenke.get('sok')!);
    if (lenke.get('ny')) setNyKunde(lenke.get('ny') === 'dokument' ? 'opplasting' : 'skjema');
    if (lenke.get('sak')) setApenSakId(lenke.get('sak'));
    if (lenke.size) window.history.replaceState(null, '', '/');
    // Oppdater løpetid og varsler hvert minutt.
    const tidtaker = setInterval(() => setNa(Date.now()), 60_000);
    return () => clearInterval(tidtaker);
  }, []);

  useEffect(() => {
    // Lagrer til nettleseren ved hver endring, og viser et varsel hvis det ikke gikk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastet) setLagringFeilet(!lagreSaker(saker));
  }, [saker, lastet]);

  const velgBehandler = (navn: string) => {
    setBehandler(navn);
    try { localStorage.setItem(VALGT_BEHANDLER_NOKKEL, navn); } catch {}
  };

  const oppdater = (id: string, endre: (s: Sak) => Sak) => setSaker(alle => alle.map(s => (s.id === id ? endre(s) : s)));

  const opprett = (felter: Kundefelter) => {
    setSaker(alle => [lagSak(felter, nesteSaksnummer(alle)), ...alle]);
    setNyKunde(null);
    setFilter('alle');
  };

  const importer = async (fil: File) => {
    try {
      const data = JSON.parse(await fil.text());
      const importerte: Sak[] = (Array.isArray(data) ? data : data.saker || []).map(fyllInnManglende);
      if (!confirm(`Importere ${importerte.length} saker? Saker med samme ID blir erstattet.`)) return;
      setSaker(alle => tildelSaksnummer([...importerte, ...alle.filter(s => !importerte.some(i => i.id === s.id))]));
      if (data.firma) { setFirma(data.firma); lagreFirma(data.firma); }
    } catch {
      alert('Kunne ikke lese filen. Velg en sikkerhetskopi (.json) eksportert fra Ocab.');
    }
  };

  // Saker for valgt saksbehandler – statusboksene og listen viser bare disse.
  const behandlersSaker = useMemo(() => saker.filter(s =>
    behandler === ALLE || (behandler === IKKE_TILDELT ? !s.saksbehandler : s.saksbehandler === behandler)), [saker, behandler]);

  const antallVarsler = behandlersSaker.filter(s => aktivtVarsel(s, na)).length;
  const ikkeTildelt = saker.filter(s => !s.saksbehandler).length;

  const synlige = useMemo(() => {
    const ord = sok.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return behandlersSaker
      .filter(s => filter === 'alle' || (filter === 'varsler' ? aktivtVarsel(s, na) : s.status === filter))
      .filter(s => {
        const tekst = `${s.navn} ${s.adresse} ${s.postnummer} ${s.poststed} ${s.saksnummer}`.toLowerCase();
        return ord.every(o => tekst.includes(o));
      })
      .sort((a, b) => {
        const diff = new Date(b.opprettet).getTime() - new Date(a.opprettet).getTime();
        return sortering === 'nyeste' ? diff : -diff;
      });
  }, [behandlersSaker, sok, filter, sortering, na]);

  const apenSak = saker.find(s => s.id === apenSakId);
  const behandlerNavn = behandler === ALLE ? 'Alle saksbehandlere' : behandler === IKKE_TILDELT ? 'Ikke tildelt' : behandler;
  const nyttForvalg = behandler === ALLE || behandler === IKKE_TILDELT ? '' : behandler;

  return (
    <div className="min-h-screen bg-slate-100">
      <Topp
        tittel={behandler === ALLE ? 'Saksoversikt' : `${behandlerNavn} sine saker`}
        undertittel={<>
          {lastet && <>{new Date(na).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}{' · '}</>}{behandlersSaker.filter(erApen).length} åpne saker
          {antallVarsler > 0 && <> · <span className="font-semibold text-amber-200">{antallVarsler} trenger oppfølging</span></>}
        </>}
        handlinger={<>
          <Knapp onClick={() => setNyKunde('opplasting')}><Ikon navn="last_opp" />Last opp dokument</Knapp>
          <div className="relative">
            <Knapp onClick={() => setVisEksport(!visEksport)}>
              <Ikon navn="last_ned" />Eksporter<Ikon navn="pil_ned" className="h-3 w-3 opacity-60" />
            </Knapp>
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
            className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50">
            <Ikon navn="innstillinger" />
          </button>
          <Knapp variant="primar" onClick={() => setNyKunde('skjema')}><Ikon navn="pluss" />Legg til kunde</Knapp>
        </>}
      />

      <main className="relative mx-auto -mt-20 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {lagringFeilet && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl bg-red-600 px-5 py-4 text-sm text-white shadow-lg">
            <Ikon navn="advarsel" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Endringene ble ikke lagret</p>
              <p className="text-red-100">Nettleseren nekter å lagre (full lagringsplass eller privat modus). Ta en sikkerhetskopi under «Eksporter» nå.</p>
            </div>
          </div>
        )}
        {/* ===== SAKSBEHANDLERE ===== */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Behandlerboks navn="Alle" aktiv={behandler === ALLE} onClick={() => velgBehandler(ALLE)}
            apne={saker.filter(erApen).length} totalt={saker.length} />
          {SAKSBEHANDLERE.map(navn => {
            const egne = saker.filter(s => s.saksbehandler === navn);
            return (
              <Behandlerboks key={navn} navn={navn} aktiv={behandler === navn} onClick={() => velgBehandler(behandler === navn ? ALLE : navn)}
                apne={egne.filter(erApen).length} totalt={egne.length} varsler={egne.filter(s => aktivtVarsel(s, na)).length} />
            );
          })}
        </div>
        {ikkeTildelt > 0 && (
          <button onClick={() => velgBehandler(behandler === IKKE_TILDELT ? ALLE : IKKE_TILDELT)}
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${behandler === IKKE_TILDELT ? 'bg-ocab-600 text-white ring-ocab-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'}`}>
            <Ikon navn="person" className="h-3.5 w-3.5" />{ikkeTildelt} {ikkeTildelt === 1 ? 'sak' : 'saker'} uten saksbehandler
          </button>
        )}

        {/* ===== STATUSER ===== */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Statusboks aktiv={filter === 'alle'} onClick={() => setFilter('alle')} tittel="Alle statuser" antall={behandlersSaker.length} prikk="bg-ocab-600" />
          {STATUS_REKKEFOLGE.map(s => (
            <Statusboks key={s} aktiv={filter === s} onClick={() => setFilter(filter === s ? 'alle' : s)}
              tittel={STATUSER[s].navn} antall={behandlersSaker.filter(x => x.status === s).length} prikk={STATUSER[s].prikk} />
          ))}
        </div>

        {/* ===== SØK, SORTERING OG VARSLER ===== */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Ikon navn="sok" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på navn, adresse eller saksnummer…"
              className="w-full rounded-2xl border-0 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocab-600" />
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
                className="appearance-none rounded-2xl border-0 bg-white py-3 pl-10 pr-9 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-ocab-600">
                <option value="nyeste">Dato: nyeste først</option>
                <option value="eldste">Dato: eldste først</option>
              </select>
              <Ikon navn="pil_ned" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </label>
            <button onClick={() => setFilter(filter === 'varsler' ? 'alle' : 'varsler')}
              className={`relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm ring-1 transition ${filter === 'varsler' ? 'bg-ocab-600 text-white ring-ocab-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
              <Ikon navn="bjelle" />Varsler
              {antallVarsler > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{antallVarsler}</span>
              )}
            </button>
          </div>
        </div>

        {/* ===== SAKER ===== */}
        {lastet && synlige.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {synlige.map(sak => (
              <SaksKort key={sak.id} sak={sak} na={na}
                onApne={() => setApenSakId(sak.id)}
                onStatus={status => oppdater(sak.id, s => medStatus(s, status))}
                onSaksbehandler={navn => oppdater(sak.id, s => medSaksbehandler(s, navn))}
                onNotat={tekst => oppdater(sak.id, s => medNotat(s, tekst))}
                onLukkVarsel={niva => oppdater(sak.id, s => logg({ ...s, lukketVarsel: niva }, `Varsel (${niva} dager) lukket`))}
              />
            ))}
          </div>
        )}

        {lastet && synlige.length === 0 && (
          <div className="mt-6 flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocab-50 text-ocab-600">
              <Ikon navn={behandlersSaker.length ? 'sok' : 'dokument'} className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {behandlersSaker.length ? 'Ingen saker passer søket' : behandler === ALLE ? 'Ingen saker ennå' : `${behandlerNavn} har ingen saker`}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {behandlersSaker.length ? 'Prøv et annet søk eller fjern filteret.' : 'Legg til en kunde, eller last opp et dokument så fylles informasjonen ut for deg.'}
            </p>
            {!behandlersSaker.length && (
              <div className="mt-6 flex gap-2">
                <Knapp onClick={() => setNyKunde('opplasting')}><Ikon navn="last_opp" />Last opp dokument</Knapp>
                <Knapp variant="primar" onClick={() => setNyKunde('skjema')}><Ikon navn="pluss" />Legg til kunde</Knapp>
              </div>
            )}
          </div>
        )}
      </main>

      {nyKunde && (
        <NyKundeModal startMedOpplasting={nyKunde === 'opplasting'} saksbehandler={nyttForvalg}
          onLagre={opprett} onLukk={() => setNyKunde(null)} />
      )}

      {apenSak && (
        <SakModal key={apenSak.id} sak={apenSak} na={na}
          onLukk={() => setApenSakId(null)}
          onTilbud={sak => { lastNedTilbud(sak, firma); oppdater(sak.id, s => logg(s, 'Tilbud lastet ned')); }}
          onSlett={() => { setSaker(alle => alle.filter(s => s.id !== apenSak.id)); setApenSakId(null); }}
          onLagre={utkast => {
            oppdater(apenSak.id, s => {
              const forrige = { ...utkast, status: s.status, saksbehandler: s.saksbehandler, aktiviteter: s.aktiviteter };
              return logg(medSaksbehandler(medStatus(forrige, utkast.status), utkast.saksbehandler), 'Sak redigert');
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

function Behandlerboks({ navn, aktiv, onClick, apne, totalt, varsler = 0 }: {
  navn: string; aktiv: boolean; onClick: () => void; apne: number; totalt: number; varsler?: number;
}) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center gap-3 rounded-2xl p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${aktiv ? 'bg-ocab-600 text-white ring-ocab-600 shadow-ocab-900/20' : 'bg-white text-slate-900 ring-slate-200'}`}>
      {navn === 'Alle'
        ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${aktiv ? 'bg-white/20' : 'bg-ocab-100 text-ocab-700'}`}><Ikon navn="person" /></span>
        : <Initialer navn={navn} aktiv={aktiv} stor />}
      <div className="min-w-0">
        <div className="truncate font-semibold">{navn}</div>
        <div className={`text-xs ${aktiv ? 'text-ocab-100' : 'text-slate-500'}`}>{apne} åpne · {totalt} totalt</div>
      </div>
      {varsler > 0 && (
        <span className="absolute right-3 top-3 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white" title={`${varsler} varsler`}>
          {varsler}
        </span>
      )}
    </button>
  );
}

function Statusboks({ tittel, antall, prikk, aktiv, onClick }: {
  tittel: string; antall: number; prikk: string; aktiv: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition hover:shadow-md ${aktiv ? 'ring-2 ring-ocab-600' : 'ring-1 ring-slate-200'}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <span className={`h-2.5 w-2.5 rounded-full ${prikk}`} />{tittel}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{antall}</span>
    </button>
  );
}

function Meny({ ikon, tittel, tekst, onClick }: { ikon: 'dokument' | 'last_ned' | 'last_opp'; tittel: string; tekst: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ocab-50">
      <Ikon navn={ikon} className="mt-0.5 h-4 w-4 text-ocab-600" />
      <span><span className="block text-sm font-medium text-slate-900">{tittel}</span><span className="block text-xs text-slate-500">{tekst}</span></span>
    </button>
  );
}
