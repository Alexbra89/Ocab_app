'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Ikon from './Ikon';
import { Knapp, KundeFelter, Modal } from './Skjema';
import { normaliserSaksbehandler, tommeKundefelter, type Kundefelter as KundefelterType } from '@/lib/saker';

const FELTNAVN: Record<string, string> = {
  navn: 'navn', adresse: 'adresse', postnummer: 'postnummer', poststed: 'poststed',
  telefon: 'telefon', epost: 'e-post', saksbehandler: 'saksbehandler',
};

export default function NyKundeModal({ startMedOpplasting, saksbehandler, onLagre, onLukk }: {
  startMedOpplasting: boolean; saksbehandler: string; onLagre: (felter: KundefelterType) => void; onLukk: () => void;
}) {
  // Står du i en saksbehandlers liste, blir den nye saken hans/hennes med en gang.
  const [felter, setFelter] = useState<KundefelterType>({ ...tommeKundefelter(), saksbehandler });
  const [fremhevet, setFremhevet] = useState<string[]>([]);
  const [leser, setLeser] = useState(false);
  const [melding, setMelding] = useState<{ type: 'ok' | 'feil'; tekst: string } | null>(null);
  const [drar, setDrar] = useState(false);
  const filInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (startMedOpplasting) filInput.current?.click();
  }, [startMedOpplasting]);

  const lesDokument = useCallback(async (fil: File) => {
    setLeser(true);
    setMelding(null);
    try {
      const data = new FormData();
      data.append('fil', fil);
      const svar = await (await fetch('/api/les-dokument', { method: 'POST', body: data })).json();
      if (!svar.ok) throw new Error(svar.feil);
      const funnet = svar.felter as Partial<KundefelterType>;
      if (funnet.saksbehandler) funnet.saksbehandler = normaliserSaksbehandler(funnet.saksbehandler);
      const navn = Object.keys(funnet);
      setFelter(f => ({ ...f, ...funnet }));
      setFremhevet(navn);
      setMelding(navn.length
        ? { type: 'ok', tekst: `Hentet ${navn.map(n => FELTNAVN[n] || n).join(', ')} fra «${fil.name}». Sjekk at alt stemmer.` }
        : { type: 'feil', tekst: `Fant ingen kundeinfo i «${fil.name}». Fyll inn feltene selv.` });
    } catch (err) {
      setMelding({ type: 'feil', tekst: err instanceof Error && err.message ? err.message : 'Kunne ikke lese dokumentet.' });
    } finally {
      setLeser(false);
    }
  }, []);

  const lagre = () => {
    if (!felter.navn.trim() && !felter.adresse.trim()) {
      setMelding({ type: 'feil', tekst: 'Fyll inn minst navn eller adresse.' });
      return;
    }
    onLagre(felter);
  };

  return (
    <Modal tittel="Legg til kunde" undertittel="Fyll inn selv, eller last opp et dokument så hentes informasjonen automatisk."
      onLukk={onLukk}
      bunn={<><Knapp onClick={onLukk}>Avbryt</Knapp><Knapp variant="primar" onClick={lagre}><Ikon navn="pluss" />Opprett sak</Knapp></>}>

      <div
        onDragOver={e => { e.preventDefault(); setDrar(true); }}
        onDragLeave={() => setDrar(false)}
        onDrop={e => { e.preventDefault(); setDrar(false); const f = e.dataTransfer.files[0]; if (f) lesDokument(f); }}
        onClick={() => filInput.current?.click()}
        className={`mb-6 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 transition ${drar ? 'border-sky-300 bg-ocab-500/20' : 'border-white/20 bg-white/[0.04] hover:border-sky-300/60 hover:bg-white/[0.07]'}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-ocab-400 to-ocab-600 text-white ring-1 ring-white/20">
          {leser ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Ikon navn="last_opp" className="h-5 w-5" />}
        </div>
        <div className="text-sm">
          <p className="font-medium text-white">{leser ? 'Leser dokumentet…' : 'Last opp dokument'}</p>
          <p className="text-white/70">Dra hit eller klikk. PDF, Word (.docx), tekst eller e-post (.eml).</p>
        </div>
        <input ref={filInput} type="file" className="hidden" accept=".pdf,.docx,.txt,.eml,.htm,.html,.csv"
          onChange={e => { const f = e.target.files?.[0]; if (f) lesDokument(f); e.target.value = ''; }} />
      </div>

      {melding && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ${melding.type === 'ok' ? 'bg-emerald-400/15 text-emerald-100 ring-emerald-400/40' : 'bg-amber-400/15 text-amber-100 ring-amber-400/40'}`}>
          {melding.tekst}
        </div>
      )}

      <KundeFelter verdier={felter} fremhevet={fremhevet}
        onEndre={endring => { setFelter(f => ({ ...f, ...endring })); setFremhevet(h => h.filter(n => !(n in endring))); }} />
    </Modal>
  );
}
