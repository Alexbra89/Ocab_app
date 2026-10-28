// Datamodell, statusfarger, varsler, priser og lokal lagring for saker.

export type Status = 'ny' | 'pagaende' | 'ferdig' | 'ingen_sak';

export interface Notat {
  id: string;
  tidspunkt: string; // ISO-dato
  tekst: string;
}

export interface Aktivitet {
  id: string;
  tidspunkt: string; // ISO-dato
  tekst: string;
}

export interface Pris {
  prisType: 'timespris' | 'fastpris';
  rolle: 'tømrer' | 'ekspert';
  timer: number;
  fastprisSum: number;
  utstyr: number;
  kjoreKm: number;
  bompenger: number;
  rabatt: number; // prosent
}

export interface Sak {
  id: string;
  saksnummer: string; // f.eks. "2026-014" – løpenummer per år
  opprettet: string; // ISO-dato – løpetiden og varslene regnes fra denne
  avsluttet?: string; // ISO-dato – settes når saken blir Ferdig eller Ingen sak
  status: Status;
  navn: string;
  adresse: string;
  postnummer: string;
  poststed: string;
  telefon: string;
  epost: string;
  saksbehandler: string;
  beskrivelse: string;
  notater: Notat[];
  aktiviteter: Aktivitet[];
  lukketVarsel: number; // høyeste varselnivå (antall dager) som er lukket
  pris: Pris;
}

export interface FirmaInfo {
  navn: string;
  orgNr: string;
  telefon: string;
  epost: string;
  adresse: string;
}

// ===== STATUS =====
// `kort` = svak farge på hele saksboksen, `marg` = sterk farge i venstre marg.
// `diagram` er fargen i grafene – kontrollert for fargeblindhet (rødt og grønt skilles på lyshet).
export const STATUSER: Record<Status, { navn: string; kort: string; marg: string; prikk: string; pille: string; diagram: string }> = {
  ny: {
    navn: 'Ny',
    kort: 'bg-blue-50/80 ring-blue-200/70',
    marg: 'bg-blue-600',
    prikk: 'bg-blue-600',
    pille: 'bg-blue-100 text-blue-800 ring-blue-200',
    diagram: '#2563eb',
  },
  pagaende: {
    navn: 'Pågående',
    kort: 'bg-amber-50/80 ring-amber-200/70',
    marg: 'bg-amber-400',
    prikk: 'bg-amber-400',
    pille: 'bg-amber-100 text-amber-900 ring-amber-200',
    diagram: '#f59e0b',
  },
  ferdig: {
    navn: 'Ferdig',
    kort: 'bg-emerald-50/80 ring-emerald-200/70',
    marg: 'bg-emerald-600',
    prikk: 'bg-emerald-600',
    pille: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    diagram: '#10b981',
  },
  ingen_sak: {
    navn: 'Ingen sak',
    kort: 'bg-rose-50/80 ring-rose-200/70',
    marg: 'bg-rose-600',
    prikk: 'bg-rose-600',
    pille: 'bg-rose-100 text-rose-800 ring-rose-200',
    diagram: '#be123c',
  },
};

export const STATUS_REKKEFOLGE: Status[] = ['ny', 'pagaende', 'ferdig', 'ingen_sak'];

export const erApen = (sak: Sak) => sak.status === 'ny' || sak.status === 'pagaende';

export const SAKSBEHANDLERE = ['Alexander', 'Ståle', 'Atle', 'Silvino'];

// Gjør "alexander b." eller "ATLE" om til navnet slik det står i listen.
export const normaliserSaksbehandler = (navn: string) => {
  const forste = navn.trim().split(/\s+/)[0]?.toLowerCase();
  return SAKSBEHANDLERE.find(s => s.toLowerCase() === forste) || navn.trim();
};

// ===== LØPETID OG VARSLER =====
const DAG_MS = 24 * 60 * 60 * 1000;

export const dagerApen = (sak: Sak, na: number) => {
  const slutt = sak.avsluttet && !erApen(sak) ? new Date(sak.avsluttet).getTime() : na;
  return Math.max(0, Math.floor((slutt - new Date(sak.opprettet).getTime()) / DAG_MS));
};

export const dagerTekst = (dager: number) => `${dager} ${dager === 1 ? 'dag' : 'dager'}`;

export const lopetidTekst = (sak: Sak, na: number) =>
  `${erApen(sak) ? 'Åpen i' : 'Var åpen i'} ${dagerTekst(dagerApen(sak, na))}`;

export interface Varsel {
  niva: 2 | 15 | 30;
  tekst: string;
  stil: string;
}

export const VARSLER: Varsel[] = [
  { niva: 30, tekst: 'Over 30 dager uten avslutning – krever handling', stil: 'bg-red-600 text-white ring-red-700 varsel-puls' },
  { niva: 15, tekst: 'Over 15 dager – følg opp saken', stil: 'bg-yellow-300 text-yellow-950 ring-yellow-400' },
  { niva: 2, tekst: 'Over 2 dager – husk å følge opp', stil: 'bg-yellow-100 text-yellow-900 ring-yellow-200' },
];

// Gir det høyeste varselet saken har passert, med mindre det er lukket.
// Lukker man 2-dagersvarselet, kommer det tilbake når saken passerer 15 dager.
export const aktivtVarsel = (sak: Sak, na: number): Varsel | null => {
  if (!erApen(sak)) return null;
  const dager = dagerApen(sak, na);
  const varsel = VARSLER.find(v => dager >= v.niva);
  if (!varsel || varsel.niva <= sak.lukketVarsel) return null;
  return varsel;
};

// ===== PRIS =====
export const SATSER = { tømrer: 750, ekspert: 900 };
export const KM_SATS = 6.5;

export const tomPris = (): Pris => ({
  prisType: 'timespris',
  rolle: 'tømrer',
  timer: 0,
  fastprisSum: 0,
  utstyr: 0,
  kjoreKm: 0,
  bompenger: 0,
  rabatt: 0,
});

export const beregnPris = (pris: Pris) => {
  const grunnlag = pris.prisType === 'timespris' ? pris.timer * SATSER[pris.rolle] : pris.fastprisSum;
  const kjoreTillegg = pris.kjoreKm * KM_SATS;
  const sumForRabatt = grunnlag + pris.utstyr + kjoreTillegg + pris.bompenger;
  const rabattBelop = (sumForRabatt * pris.rabatt) / 100;
  const sumEksMva = sumForRabatt - rabattBelop;
  const mva = sumEksMva * 0.25;
  return { grunnlag, kjoreTillegg, sumForRabatt, rabattBelop, sumEksMva, mva, totalInklMva: sumEksMva + mva };
};

export const kroner = (belop: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(belop);

// ===== OPPRETTING =====
export const nyId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type Kundefelter = Pick<
  Sak,
  'navn' | 'adresse' | 'postnummer' | 'poststed' | 'telefon' | 'epost' | 'saksbehandler' | 'beskrivelse'
>;

export const tommeKundefelter = (): Kundefelter => ({
  navn: '',
  adresse: '',
  postnummer: '',
  poststed: '',
  telefon: '',
  epost: '',
  saksbehandler: '',
  beskrivelse: '',
});

export const nesteSaksnummer = (saker: Pick<Sak, 'saksnummer'>[], dato = new Date()) => {
  const ar = dato.getFullYear();
  const hoyeste = saker.reduce((maks, s) => {
    const [sakAr, lopenr] = (s.saksnummer || '').split('-').map(Number);
    return sakAr === ar && lopenr > maks ? lopenr : maks;
  }, 0);
  return `${ar}-${String(hoyeste + 1).padStart(3, '0')}`;
};

// Gir saksnummer til saker som mangler det (fra eldre versjoner), i rekkefølgen de ble opprettet.
export const tildelSaksnummer = (saker: Sak[]): Sak[] => {
  const ferdige = saker.filter(s => s.saksnummer);
  const nye = new Map<string, string>();
  [...saker]
    .filter(s => !s.saksnummer)
    .sort((a, b) => a.opprettet.localeCompare(b.opprettet))
    .forEach(s => {
      const nummer = nesteSaksnummer(ferdige, new Date(s.opprettet));
      nye.set(s.id, nummer);
      ferdige.push({ ...s, saksnummer: nummer });
    });
  return saker.map(s => (nye.has(s.id) ? { ...s, saksnummer: nye.get(s.id)! } : s));
};

export const lagSak = (felter: Kundefelter, saksnummer = ''): Sak => {
  const na = new Date().toISOString();
  return {
    ...felter,
    saksbehandler: normaliserSaksbehandler(felter.saksbehandler),
    saksnummer,
    id: nyId(),
    opprettet: na,
    status: 'ny',
    notater: [],
    aktiviteter: [{ id: nyId(), tidspunkt: na, tekst: 'Sak opprettet' }],
    lukketVarsel: 0,
    pris: tomPris(),
  };
};

// ===== LAGRING =====
const NOKKEL = 'ocab_saker_v2';
const GAMMEL_NOKKEL = 'ocab_v81_data';
const FIRMA_NOKKEL = 'ocab_firma_info';

export const lagreSaker = (saker: Sak[]) => localStorage.setItem(NOKKEL, JSON.stringify(saker));

export const lastSaker = (): Sak[] => {
  try {
    const lagret = localStorage.getItem(NOKKEL);
    if (lagret) return tildelSaksnummer((JSON.parse(lagret) as Sak[]).map(fyllInnManglende));
    const gammel = localStorage.getItem(GAMMEL_NOKKEL);
    if (gammel) {
      const saker = tildelSaksnummer((JSON.parse(gammel) as GammelProsjekt[]).map(fraGammelt));
      lagreSaker(saker);
      return saker;
    }
  } catch (err) {
    console.error('Kunne ikke lese lagrede saker:', err);
  }
  return [];
};

// Sørger for at saker fra eldre versjoner eller importerte filer har alle felter.
export const fyllInnManglende = ({ prosjektleder, ...sak }: Partial<Sak> & { prosjektleder?: string }): Sak => ({
  ...lagSak(tommeKundefelter()),
  ...sak,
  saksbehandler: sak.saksbehandler ?? prosjektleder ?? '',
  saksnummer: sak.saksnummer || '',
  pris: { ...tomPris(), ...(sak.pris || {}) },
  notater: sak.notater || [],
  aktiviteter: sak.aktiviteter || [],
  lukketVarsel: sak.lukketVarsel || 0,
} as Sak);

export const STANDARD_FIRMA: FirmaInfo = {
  navn: 'OCAB – Skadedyr & Forebyggende',
  orgNr: '123 456 789',
  telefon: '+47 123 45 678',
  epost: 'post@ocab.no',
  adresse: 'Gateveien 1, 0123 Oslo',
};

export const lastFirma = (): FirmaInfo => {
  try {
    const lagret = localStorage.getItem(FIRMA_NOKKEL);
    if (lagret) return { ...STANDARD_FIRMA, ...JSON.parse(lagret) };
  } catch {}
  return STANDARD_FIRMA;
};

export const lagreFirma = (firma: FirmaInfo) => localStorage.setItem(FIRMA_NOKKEL, JSON.stringify(firma));

// ===== OVERGANG FRA FORRIGE VERSJON (v8.1) =====
interface GammelProsjekt {
  id: number;
  kunde: string;
  status: string;
  opprettet?: string;
  ansvarlig?: string;
  notat?: string;
  timer?: number;
  rolle?: 'tømrer' | 'ekspert';
  prisType?: 'timespris' | 'fastpris';
  fastprisSum?: number;
  utstyr?: number;
  kjoreKm?: number;
  bompenger?: number;
  rabatt?: number;
  hurtignotater?: { id: number; tekst: string }[];
  aktiviteter?: { id: number; handling: string }[];
}

const GAMMEL_STATUS: Record<string, Status> = {
  'Befaring utført': 'ny',
  'Tilbud levert': 'pagaende',
  'Sak fakturert': 'ferdig',
};

const fraGammelt = (p: GammelProsjekt): Sak => {
  const opprettet = p.opprettet || new Date(p.id).toISOString();
  return fyllInnManglende({
    id: String(p.id),
    opprettet,
    status: GAMMEL_STATUS[p.status] || 'ny',
    navn: p.kunde || '',
    saksbehandler: p.ansvarlig && p.ansvarlig !== 'Fakturert' ? p.ansvarlig : '',
    beskrivelse: p.notat || '',
    notater: (p.hurtignotater || []).map(n => ({ id: String(n.id), tidspunkt: new Date(n.id).toISOString(), tekst: n.tekst })),
    aktiviteter: (p.aktiviteter || []).map(a => ({ id: String(a.id), tidspunkt: new Date(a.id).toISOString(), tekst: a.handling })),
    pris: {
      prisType: p.prisType || 'timespris',
      rolle: p.rolle || 'tømrer',
      timer: p.timer || 0,
      fastprisSum: p.fastprisSum || 0,
      utstyr: p.utstyr || 0,
      kjoreKm: p.kjoreKm || 0,
      bompenger: p.bompenger || 0,
      rabatt: p.rabatt || 0,
    },
  });
};
