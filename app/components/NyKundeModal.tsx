'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Ikon from './Ikon';
import { Knapp, KundeFelter, Modal } from './Skjema';
import { tommeKundefelter, type Kundefelter as KundefelterType } from '@/lib/saker';

const FELTNAVN: Record<string, string> = {
  navn: 'navn', adresse: 'adresse', postnummer: 'postnummer', poststed: 'poststed',
  telefon: 'telefon', epost: 'e-post', prosjektleder: 'prosjektleder',
};

export default function NyKundeModal({ startMedOpplasting, onLagre, onLukk }: {
  startMedOpplasting: boolean; onLagre: (felter: KundefelterType) => void; onLukk: () => void;
}) {
  const [felter, setFelter] = useState<KundefelterType>(tommeKundefelter());
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
        className={`mb-6 flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-4 transition ${drar ? 'border-slate-900 bg-slate-100' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          {leser ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Ikon navn="last_opp" className="h-5 w-5" />}
        </div>
        <div className="text-sm">
          <p className="font-medium text-slate-900">{leser ? 'Leser dokumentet…' : 'Last opp dokument'}</p>
          <p className="text-slate-500">Dra hit eller klikk. PDF, Word (.docx), tekst eller e-post (.eml).</p>
        </div>
        <input ref={filInput} type="file" className="hidden" accept=".pdf,.docx,.txt,.eml,.htm,.html,.csv"
          onChange={e => { const f = e.target.files?.[0]; if (f) lesDokument(f); e.target.value = ''; }} />
      </div>

      {melding && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm ring-1 ${melding.type === 'ok' ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-200'}`}>
          {melding.tekst}
        </div>
      )}

      <KundeFelter verdier={felter} fremhevet={fremhevet}
        onEndre={endring => { setFelter(f => ({ ...f, ...endring })); setFremhevet(h => h.filter(n => !(n in endring))); }} />
    </Modal>
  );
}
