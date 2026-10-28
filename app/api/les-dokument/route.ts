import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { tolkKundeinfo } from '@/lib/dokumentTolker';

// mammoth trenger Node (ikke Edge).
export const runtime = 'nodejs';

const MAKS_STORRELSE = 10 * 1024 * 1024; // 10 MB
const TILLATTE = ['.pdf', '.docx', '.txt', '.eml', '.htm', '.html', '.csv'];

const feil = (melding: string, status: number) => NextResponse.json({ ok: false, feil: melding }, { status });

// Tar imot et dokument, henter ut teksten og finner kundeinfo.
// Dokumentet behandles bare i minnet på serveren appen kjører på, og lagres eller sendes ikke videre.
export async function POST(req: Request) {
  let fil: FormDataEntryValue | null;
  try {
    fil = (await req.formData()).get('fil');
  } catch {
    return feil('Ugyldig opplasting.', 400);
  }

  if (!(fil instanceof File)) return feil('Fant ingen fil.', 400);
  if (fil.size > MAKS_STORRELSE) return feil('Filen er for stor (maks 10 MB).', 413);
  const endelse = fil.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  if (!TILLATTE.includes(endelse)) return feil('Filtypen støttes ikke. Bruk PDF, Word (.docx), tekst eller e-post (.eml).', 415);

  try {
    const tekst = await hentTekst(fil, endelse);
    if (!tekst.trim()) {
      return feil('Fant ingen tekst i dokumentet. Skannede bilder/PDF-er uten tekst kan ikke leses ennå.', 422);
    }
    return NextResponse.json({ ok: true, felter: tolkKundeinfo(tekst) });
  } catch (err) {
    console.error('Kunne ikke lese dokument:', err);
    return feil('Kunne ikke lese dokumentet. Er filen skadet eller passordbeskyttet?', 422);
  }
}

const hentTekst = async (fil: File, endelse: string): Promise<string> => {
  const buffer = await fil.arrayBuffer();

  if (endelse === '.pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (endelse === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return value;
  }

  const tekst = new TextDecoder('utf-8').decode(buffer);
  if (endelse === '.html' || endelse === '.htm') {
    return tekst.replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  }
  return tekst; // .txt, .eml, .csv
};
