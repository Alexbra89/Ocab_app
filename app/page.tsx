'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Ikon from './components/Ikon';
import NyKundeModal from './components/NyKundeModal';
import SakModal from './components/SakModal';
import SaksKort from './components/SaksKort';
import FirmaModal from './components/FirmaModal';
import { Initialer, Knapp } from './components/Skjema';
import GlassRamme, { MenyKnapp, SideTopp } from './components/GlassRamme';
import { erDemo, lagDemoSaker } from '@/lib/demodata';
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

  // Eksempelkunder for å prøve appen. De erstatter tidligere eksempelkunder, men rører ikke ekte saker.
  const lastInnEksempler = () => {
    setSaker(alle => tildelSaksnummer([...lagDemoSaker(), ...alle.filter(s => !erDemo(s))]));
    velgBehandler(ALLE);
    setFilter('alle');
    setSok('');
  };

  const antallEksempler = saker.filter(erDemo).length;
  const fjernEksempler = () => {
    if (confirm(`Fjerne ${antallEksempler} eksempelkunder? Dine egne saker blir ikke rørt.`)) setSaker(alle => alle.filter(s => !erDemo(s)));
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
    <GlassRamme aktiv="saker" ekstraMeny={<>
      <MenyKnapp onClick={() => setNyKunde('skjema')} ikon="pluss" navn="Legg til kunde" />
      <MenyKnapp onClick={() => setNyKunde('opplasting')} ikon="last_opp" navn="Last opp dokument" />
      <MenyKnapp onClick={() => setVisInnstillinger(true)} ikon="innstillinger" navn="Firmainnstillinger" />
    </>}>
      <SideTopp
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
              <div className="absolute right-0 z-40 mt-2 w-64 rounded-2xl bg-slate-900/95 p-1.5 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                <Meny ikon="dokument" tittel="Excel (.csv)" tekst={`${synlige.length} saker i visningen`}
                  onClick={() => { eksporterExcel(synlige); setVisEksport(false); }} />
                <Meny ikon="last_ned" tittel="Sikkerhetskopi (.json)" tekst="Alle saker og innstillinger"
                  onClick={() => { eksporterSikkerhetskopi(saker, firma); setVisEksport(false); }} />
                <div className="my-1 border-t border-white/10" />
                <Meny ikon="last_opp" tittel="Importer sikkerhetskopi" tekst="Hent inn saker fra .json"
                  onClick={() => { importInput.current?.click(); setVisEksport(false); }} />
                <div className="my-1 border-t border-white/10" />
                <Meny ikon="person" tittel="Last inn 30 eksempelkunder" tekst="Fiktive kunder for å prøve appen"
                  onClick={() => { lastInnEksempler(); setVisEksport(false); }} />
                {antallEksempler > 0 && (
                  <Meny ikon="slett" tittel="Fjern eksempelkunder" tekst={`${antallEksempler} fiktive kunder – egne saker beholdes`}
                    onClick={() => { fjernEksempler(); setVisEksport(false); }} />
                )}
              </div>
            </>)}
            <input ref={importInput} type="file" accept=".json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ''; }} />
          </div>
          <Knapp onClick={() => setVisInnstillinger(true)} title="Firmainnstillinger" aria-label="Firmainnstillinger" className="px-3 lg:hidden">
            <Ikon navn="innstillinger" />
          </Knapp>
          <Knapp variant="primar" onClick={() => setNyKunde('skjema')}><Ikon navn="pluss" />Legg til kunde</Knapp>
        </>}
      />

      <main className="mt-6">
        {lagringFeilet && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl bg-red-600/90 px-5 py-4 text-sm text-white shadow-lg ring-1 ring-red-400/50 backdrop-blur">
            <Ikon navn="advarsel" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Endringene ble ikke lagret</p>
              <p className="text-red-100">Nettleseren nekter å lagre (full lagringsplass eller privat modus). Ta en sikkerhetskopi under «Eksporter» nå.</p>
            </div>
          </div>
        )}
        {/* ===== SAKSBEHANDLERE ===== */}
        <div className="glass-inn grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" style={{ animationDelay: '60ms' }}>
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
            className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${behandler === IKKE_TILDELT ? 'bg-white text-slate-900 ring-white' : 'bg-white/10 text-white/75 ring-white/15 backdrop-blur hover:bg-white/15'}`}>
            <Ikon navn="person" className="h-3.5 w-3.5" />{ikkeTildelt} {ikkeTildelt === 1 ? 'sak' : 'saker'} uten saksbehandler
          </button>
        )}

        {/* ===== STATUSER ===== */}
        <div className="glass-inn mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" style={{ animationDelay: '120ms' }}>
          <Statusboks aktiv={filter === 'alle'} onClick={() => setFilter('alle')} tittel="Alle statuser" antall={behandlersSaker.length} prikk="bg-sky-300" />
          {STATUS_REKKEFOLGE.map(s => (
            <Statusboks key={s} aktiv={filter === s} onClick={() => setFilter(filter === s ? 'alle' : s)}
              tittel={STATUSER[s].navn} antall={behandlersSaker.filter(x => x.status === s).length} prikk={STATUSER[s].prikk} />
          ))}
        </div>

        {/* ===== SØK, SORTERING OG VARSLER ===== */}
        <div className="glass-inn mt-6 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ animationDelay: '180ms' }}>
          <div className="glass relative flex-1 rounded-2xl">
            <Ikon navn="sok" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input value={sok} onChange={e => setSok(e.target.value)} placeholder="Søk på navn, adresse eller saksnummer…"
              className="w-full rounded-2xl border-0 bg-transparent py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-ocab-400" />
            {sok && (
              <button onClick={() => setSok('')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/50 hover:text-white">
                <Ikon navn="lukk" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <label className="glass relative rounded-2xl">
              <Ikon navn="sorter" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <select value={sortering} onChange={e => setSortering(e.target.value as Sortering)}
                className="appearance-none rounded-2xl border-0 bg-transparent py-3 pl-10 pr-9 text-sm font-medium text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-ocab-400 [&_option]:bg-slate-900">
                <option value="nyeste">Dato: nyeste først</option>
                <option value="eldste">Dato: eldste først</option>
              </select>
              <Ikon navn="pil_ned" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
            </label>
            <button onClick={() => setFilter(filter === 'varsler' ? 'alle' : 'varsler')}
              className={`relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-sm ring-1 transition ${filter === 'varsler' ? 'bg-white text-slate-900 ring-white' : 'glass text-white hover:bg-white/10'}`}>
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
          <div className="glass glass-inn mt-6 flex flex-col items-center rounded-3xl px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/15">
              <Ikon navn={behandlersSaker.length ? 'sok' : 'dokument'} className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {behandlersSaker.length ? 'Ingen saker passer søket' : behandler === ALLE ? 'Ingen saker ennå' : `${behandlerNavn} har ingen saker`}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-white/55">
              {behandlersSaker.length ? 'Prøv et annet søk eller fjern filteret.' : 'Legg til en kunde, eller last opp et dokument så fylles informasjonen ut for deg.'}
            </p>
            {!behandlersSaker.length && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {!saker.length && <Knapp onClick={lastInnEksempler}><Ikon navn="person" />Last inn 30 eksempelkunder</Knapp>}
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
    </GlassRamme>
  );
}

function Behandlerboks({ navn, aktiv, onClick, apne, totalt, varsler = 0 }: {
  navn: string; aktiv: boolean; onClick: () => void; apne: number; totalt: number; varsler?: number;
}) {
  return (
    <button onClick={onClick}
      className={`glass relative flex items-center gap-3 rounded-2xl p-4 text-left transition hover:-translate-y-0.5 ${aktiv ? 'bg-linear-to-br! from-ocab-400/50 via-ocab-600/40 to-ocab-900/30 ring-1 ring-sky-300/40' : 'hover:bg-white/10'}`}>
      {navn === 'Alle'
        ? <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${aktiv ? 'bg-white text-slate-900 ring-white' : 'bg-white/10 ring-white/15'}`}><Ikon navn="person" /></span>
        : <Initialer navn={navn} aktiv={aktiv} stor />}
      <div className="min-w-0">
        <div className="truncate font-semibold">{navn}</div>
        <div className={`text-xs ${aktiv ? 'text-white/80' : 'text-white/50'}`}>{apne} åpne · {totalt} totalt</div>
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
      className={`glass flex items-center justify-between rounded-2xl px-4 py-3 text-left transition hover:bg-white/10 ${aktiv ? 'ring-2 ring-sky-300/70' : ''}`}>
      <span className="flex items-center gap-2 text-sm font-medium text-white/70">
        <span className={`h-2.5 w-2.5 rounded-full ${prikk}`} />{tittel}
      </span>
      <span className="text-2xl font-semibold tabular-nums tracking-tight">{antall}</span>
    </button>
  );
}

function Meny({ ikon, tittel, tekst, onClick }: { ikon: 'dokument' | 'last_ned' | 'last_opp' | 'person' | 'slett'; tittel: string; tekst: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/10">
      <Ikon navn={ikon} className="mt-0.5 h-4 w-4 text-sky-300" />
      <span><span className="block text-sm font-medium">{tittel}</span><span className="block text-xs text-white/50">{tekst}</span></span>
    </button>
  );
}
