import { NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';
import { tolkKundeinfo } from '@/lib/dokumentTolker';

// Tar imot et dokument, henter ut teksten og finner kundeinfo.
// Kjører på din egen maskin (localhost) – dokumentet sendes ikke videre noe sted.
export async function POST(req: Request) {
  try {
    const skjema = await req.formData();
    const fil = skjema.get('fil');
    if (!(fil instanceof File)) {
      return NextResponse.json({ ok: false, feil: 'Fant ingen fil.' }, { status: 400 });
    }

    const tekst = await hentTekst(fil);
    if (!tekst.trim()) {
      return NextResponse.json({
        ok: false,
        feil: 'Fant ingen tekst i dokumentet. Skannede bilder/PDF-er uten tekst kan ikke leses ennå.',
      });
    }

    return NextResponse.json({ ok: true, felter: tolkKundeinfo(tekst), tekst: tekst.slice(0, 4000) });
  } catch (err) {
    console.error('Kunne ikke lese dokument:', err);
    return NextResponse.json({ ok: false, feil: 'Kunne ikke lese dokumentet.' }, { status: 500 });
  }
}

const hentTekst = async (fil: File): Promise<string> => {
  const navn = fil.name.toLowerCase();
  const buffer = await fil.arrayBuffer();

  if (navn.endsWith('.pdf') || fil.type === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (navn.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return value;
  }

  const tekst = new TextDecoder('utf-8').decode(buffer);
  if (navn.endsWith('.html') || navn.endsWith('.htm')) {
    return tekst.replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  }
  return tekst; // .txt, .eml, .csv o.l.
};
