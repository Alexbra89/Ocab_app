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

export type Rolle = 'skadedyrekspert' | 'tomrer' | 'prosjektleder';
export type OppdragType = 'befaring' | 'sikring' | 'bekjempelse' | 'serviceavtale';

export interface OppdragLinje {
  id: string;
  type: OppdragType;
  variant: string; // f.eks. "Førstegangsbefaring"
  antall: number;
  pris: number; // eks. mva per stk
}

export interface Pris {
  prisType: 'timespris' | 'fastpris';
  rolle: Rolle;
  timer: number;
  fastprisSum: number;
  oppdrag: OppdragLinje[];
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
// Fargene er laget for mørk glass-bakgrunn.
// `kort` = svak farge på hele saksboksen, `marg` = sterk farge i venstre marg.
// `diagram` er fargen i grafene – kontrollert for fargeblindhet i rekkefølgen DIAGRAM_REKKEFOLGE.
export const STATUSER: Record<Status, { navn: string; kort: string; marg: string; prikk: string; pille: string; diagram: string }> = {
  ny: {
    navn: 'Ny',
    kort: 'bg-blue-500/[0.13] ring-blue-400/25',
    marg: 'bg-blue-500',
    prikk: 'bg-blue-400',
    pille: 'bg-blue-500/20 text-blue-100 ring-blue-400/35',
    diagram: '#3b82f6',
  },
  pagaende: {
    navn: 'Pågående',
    kort: 'bg-amber-500/[0.12] ring-amber-400/25',
    marg: 'bg-amber-400',
    prikk: 'bg-amber-400',
    pille: 'bg-amber-500/20 text-amber-100 ring-amber-400/35',
    diagram: '#d97706',
  },
  ferdig: {
    navn: 'Ferdig',
    kort: 'bg-emerald-500/[0.12] ring-emerald-400/25',
    marg: 'bg-emerald-500',
    prikk: 'bg-emerald-400',
    pille: 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/35',
    diagram: '#059669',
  },
  ingen_sak: {
    navn: 'Ingen sak',
    kort: 'bg-rose-500/[0.12] ring-rose-400/25',
    marg: 'bg-rose-500',
    prikk: 'bg-rose-400',
    pille: 'bg-rose-500/20 text-rose-100 ring-rose-400/35',
    diagram: '#e11d48',
  },
};

// Rekkefølgen i stablede grafer og smultringdiagram: grønt og rødt står ikke ved siden av hverandre.
export const DIAGRAM_REKKEFOLGE: Status[] = ['ny', 'ferdig', 'pagaende', 'ingen_sak'];

export const STATUS_REKKEFOLGE: Status[] = ['ny', 'pagaende', 'ferdig', 'ingen_sak'];

export const erApen = (sak: Sak) => sak.status === 'ny' || sak.status === 'pagaende';

export const SAKSBEHANDLERE = ['Alexander', 'Ståle', 'Atle', 'Silvino'];

// Hvilken saksbehandler som sist ble valgt i saksoversikten (huskes per nettleser).
export const VALGT_BEHANDLER_NOKKEL = 'ocab_valgt_saksbehandler';

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

const dagerTekst = (dager: number) => `${dager} ${dager === 1 ? 'dag' : 'dager'}`;

export const lopetidTekst = (sak: Sak, na: number) =>
  `${erApen(sak) ? 'Åpen i' : 'Var åpen i'} ${dagerTekst(dagerApen(sak, na))}`;

export interface Varsel {
  niva: 2 | 15 | 30;
  tekst: string;
  stil: string;
}

const VARSLER: Varsel[] = [
  { niva: 30, tekst: 'Over 30 dager uten avslutning – krever handling', stil: 'bg-red-600 text-white ring-red-700 varsel-puls' },
  { niva: 15, tekst: 'Over 15 dager – følg opp saken', stil: 'bg-yellow-400 text-yellow-950 ring-yellow-300' },
  { niva: 2, tekst: 'Over 2 dager – husk å følge opp', stil: 'bg-yellow-200/90 text-yellow-950 ring-yellow-100' },
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
// Timepriser eks. mva fra prislisten (linje 1–2). Endre her når prisene endres.
export const ROLLER: Record<Rolle, { navn: string; sats: number }> = {
  skadedyrekspert: { navn: 'Skadedyrekspert', sats: 1150 }, // «Skadedyrekspert/bekjemper»
  tomrer: { navn: 'Tømrer', sats: 900 }, // «Skadedyr håndverker»
  prosjektleder: { navn: 'Prosjektleder', sats: 1150 }, // står ikke i prislisten – juster ved behov
};
export const ROLLE_REKKEFOLGE: Rolle[] = ['skadedyrekspert', 'tomrer', 'prosjektleder'];

// Oppdragstyper med faste priser eks. mva fra prislisten (linje 3–6).
// Sikring og bekjempelse har ingen fast pris – prisen fylles inn per sak.
export const OPPDRAG: Record<OppdragType, { navn: string; varianter: { navn: string; pris: number }[] }> = {
  befaring: { navn: 'Befaring', varianter: [{ navn: 'Førstegangsbefaring', pris: 4550 }, { navn: 'Rutinebefaring', pris: 2860 }] },
  sikring: { navn: 'Sikring', varianter: [{ navn: 'Sikring', pris: 0 }] },
  bekjempelse: { navn: 'Bekjempelse', varianter: [{ navn: 'Bekjempelse', pris: 0 }] },
  serviceavtale: { navn: 'Serviceavtale', varianter: [{ navn: 'Service felle besøk', pris: 1218.75 }] },
};
export const OPPDRAG_REKKEFOLGE: OppdragType[] = ['befaring', 'sikring', 'bekjempelse', 'serviceavtale'];

export const nyOppdragLinje = (type: OppdragType): OppdragLinje => ({
  id: nyId(), type, variant: OPPDRAG[type].varianter[0].navn, antall: 1, pris: OPPDRAG[type].varianter[0].pris,
});

export const KM_SATS = 6.5;

export const tomPris = (): Pris => ({
  prisType: 'timespris',
  rolle: 'skadedyrekspert',
  timer: 0,
  fastprisSum: 0,
  oppdrag: [],
  utstyr: 0,
  kjoreKm: 0,
  bompenger: 0,
  rabatt: 0,
});

export const beregnPris = (pris: Pris) => {
  const grunnlag = pris.prisType === 'timespris' ? pris.timer * ROLLER[pris.rolle].sats : pris.fastprisSum;
  const oppdragSum = pris.oppdrag.reduce((sum, o) => sum + o.antall * o.pris, 0);
  const kjoreTillegg = pris.kjoreKm * KM_SATS;
  const sumForRabatt = grunnlag + oppdragSum + pris.utstyr + kjoreTillegg + pris.bompenger;
  const rabattBelop = (sumForRabatt * pris.rabatt) / 100;
  const sumEksMva = sumForRabatt - rabattBelop;
  const mva = sumEksMva * 0.25;
  return { grunnlag, oppdragSum, kjoreTillegg, sumForRabatt, rabattBelop, sumEksMva, mva, totalInklMva: sumEksMva + mva };
};

const helKroner = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 });
const medOre = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Viser øre bare når beløpet har det (1 218,75 kr), ellers hele kroner (4 550 kr).
export const kroner = (belop: number) => (Math.round(belop * 100) % 100 !== 0 ? medOre : helKroner).format(belop);

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

const hendelse = (tekst: string) => ({ id: nyId(), tidspunkt: new Date().toISOString(), tekst });

export const lagSak = (felter: Kundefelter, saksnummer: string): Sak => ({
  ...felter,
  saksbehandler: normaliserSaksbehandler(felter.saksbehandler),
  saksnummer,
  id: nyId(),
  opprettet: new Date().toISOString(),
  status: 'ny',
  notater: [],
  aktiviteter: [hendelse('Sak opprettet')],
  lukketVarsel: 0,
  pris: tomPris(),
});

// ===== ENDRINGER (returnerer en ny sak, så React ser endringen) =====
export const logg = (sak: Sak, tekst: string): Sak => ({ ...sak, aktiviteter: [hendelse(tekst), ...sak.aktiviteter] });

export const medNotat = (sak: Sak, tekst: string): Sak => ({ ...sak, notater: [hendelse(tekst), ...sak.notater] });

// Ferdig og Ingen sak avslutter saken, så løpetiden stopper. Gjenåpnes den, går løpetiden videre.
export const medStatus = (sak: Sak, status: Status): Sak => {
  if (sak.status === status) return sak;
  const avsluttes = status === 'ferdig' || status === 'ingen_sak';
  return logg(
    { ...sak, status, avsluttet: avsluttes ? sak.avsluttet || new Date().toISOString() : undefined },
    `Status endret fra «${STATUSER[sak.status].navn}» til «${STATUSER[status].navn}»`,
  );
};

export const medSaksbehandler = (sak: Sak, navn: string): Sak =>
  sak.saksbehandler === navn ? sak : logg({ ...sak, saksbehandler: navn },
    `Saksbehandler endret fra ${sak.saksbehandler || 'ikke tildelt'} til ${navn || 'ikke tildelt'}`);

// ===== LAGRING =====
const NOKKEL = 'ocab_saker_v2';
const GAMMEL_NOKKEL = 'ocab_v81_data';
const FIRMA_NOKKEL = 'ocab_firma_info';

// Returnerer false hvis nettleseren nekter å lagre (f.eks. full lagringsplass eller privat modus).
const lagre = (nokkel: string, verdi: unknown) => {
  try {
    localStorage.setItem(nokkel, JSON.stringify(verdi));
    return true;
  } catch (err) {
    console.error(`Kunne ikke lagre ${nokkel}:`, err);
    return false;
  }
};

export const lagreSaker = (saker: Sak[]) => lagre(NOKKEL, saker);

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
  ...tommeKundefelter(),
  id: nyId(),
  opprettet: new Date().toISOString(),
  status: 'ny',
  ...sak,
  saksbehandler: sak.saksbehandler ?? prosjektleder ?? '',
  saksnummer: sak.saksnummer || '',
  pris: medGyldigRolle({ ...tomPris(), ...sak.pris }),
  notater: sak.notater || [],
  aktiviteter: sak.aktiviteter || [],
  lukketVarsel: sak.lukketVarsel || 0,
});

// Eldre saker brukte rollene «tømrer» og «ekspert».
const medGyldigRolle = (pris: Pris): Pris => {
  const gammel: Record<string, Rolle> = { 'tømrer': 'tomrer', ekspert: 'skadedyrekspert' };
  const rolle = gammel[pris.rolle] || pris.rolle;
  return { ...pris, rolle: rolle in ROLLER ? rolle : 'skadedyrekspert', oppdrag: pris.oppdrag || [] };
};

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
  } catch (err) {
    console.error('Kunne ikke lese firmainfo:', err);
  }
  return STANDARD_FIRMA;
};

export const lagreFirma = (firma: FirmaInfo) => lagre(FIRMA_NOKKEL, firma);

// ===== OVERGANG FRA FORRIGE VERSJON (v8.1) =====
interface GammelProsjekt {
  id: number;
  kunde: string;
  status: string;
  opprettet?: string;
  ansvarlig?: string;
  notat?: string;
  timer?: number;
  rolle?: string;
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
      rolle: (p.rolle || 'skadedyrekspert') as Rolle,
      timer: p.timer || 0,
      fastprisSum: p.fastprisSum || 0,
      oppdrag: [],
      utstyr: p.utstyr || 0,
      kjoreKm: p.kjoreKm || 0,
      bompenger: p.bompenger || 0,
      rabatt: p.rabatt || 0,
    },
  });
};
