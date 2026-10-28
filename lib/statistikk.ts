// Tall og summer for statistikksiden: antall saker og verdi per måned, per status,
// per saksbehandler og per oppdragstype.

import {
  beregnPris, dagerApen, erApen, OPPDRAG, OPPDRAG_REKKEFOLGE, SAKSBEHANDLERE, STATUS_REKKEFOLGE,
  type OppdragType, type Sak,
} from './saker.ts';

export interface Punkt {
  etikett: string; // under stolpen, f.eks. "okt"
  tittel: string; // i verktøytipset, f.eks. "oktober 2026"
  verdier: Record<string, number>;
}

export interface Maaned {
  nokkel: string; // "2026-10"
  etikett: string;
  tittel: string;
}

export type Mva = 'eks' | 'inkl';

// "2026-10" i lokal tid, så en sak opprettet 1. november kl. 00.30 havner i november.
export const maanedNokkel = (dato: string | Date) => {
  const d = new Date(dato);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// De siste `antall` månedene til og med denne, eldste først.
export const sisteMaaneder = (antall: number, na = new Date()): Maaned[] =>
  Array.from({ length: antall }, (_, i) => {
    const d = new Date(na.getFullYear(), na.getMonth() - (antall - 1 - i), 1);
    const kort = d.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
    return {
      nokkel: maanedNokkel(d),
      etikett: d.getMonth() === 0 || i === 0 ? `${kort} ${String(d.getFullYear()).slice(2)}` : kort,
      tittel: d.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' }),
    };
  });

export const sakVerdi = (sak: Sak, mva: Mva) => {
  const pris = beregnPris(sak.pris);
  return mva === 'inkl' ? pris.totalInklMva : pris.sumEksMva;
};

const sum = (tall: number[]) => tall.reduce((a, b) => a + b, 0);

export const lagStatistikk = (saker: Sak[], maaneder: Maaned[], mva: Mva, na: number) => {
  const nokler = new Set(maaneder.map(m => m.nokkel));
  const iPerioden = (iso?: string) => !!iso && nokler.has(maanedNokkel(iso));
  const verdi = (s: Sak) => sakVerdi(s, mva);

  const nye = saker.filter(s => iPerioden(s.opprettet));
  const ferdige = saker.filter(s => s.status === 'ferdig' && iPerioden(s.avsluttet));
  const apne = saker.filter(erApen);

  // Én serie per måned: teller (eller summerer) sakene som hører til måneden.
  const perMaaned = (dato: (s: Sak) => string | undefined, utvalg: Sak[], mal: (s: Sak) => number): Punkt[] =>
    maaneder.map(m => ({
      etikett: m.etikett,
      tittel: m.tittel,
      verdier: { verdi: sum(utvalg.filter(s => dato(s) && maanedNokkel(dato(s)!) === m.nokkel).map(mal)) },
    }));

  // Sakene som kom inn hver måned, fordelt på status de har i dag.
  const perStatus = (mal: (s: Sak) => number): Punkt[] =>
    maaneder.map(m => ({
      etikett: m.etikett,
      tittel: m.tittel,
      verdier: Object.fromEntries(STATUS_REKKEFOLGE.map(st =>
        [st, sum(nye.filter(s => s.status === st && maanedNokkel(s.opprettet) === m.nokkel).map(mal))])),
    }));

  const ferdigeIAlt = saker.filter(s => s.status === 'ferdig');
  const behandlere = [...SAKSBEHANDLERE, ...(saker.some(s => !s.saksbehandler) ? [''] : [])];

  return {
    nokkeltall: {
      antallNye: nye.length,
      antallFerdige: ferdige.length,
      antallApne: apne.length,
      snittLopetid: ferdige.length ? Math.round(sum(ferdige.map(s => dagerApen(s, na))) / ferdige.length) : null,
      verdiNye: sum(nye.map(verdi)),
      verdiFerdige: sum(ferdige.map(verdi)),
      verdiApne: sum(apne.map(verdi)),
      snittFerdig: ferdige.length ? sum(ferdige.map(verdi)) / ferdige.length : null,
    },
    antall: {
      innkommende: perMaaned(s => s.opprettet, saker, () => 1),
      fullforte: perMaaned(s => s.avsluttet, ferdigeIAlt, () => 1),
      perStatus: perStatus(() => 1),
    },
    verdi: {
      innkommende: perMaaned(s => s.opprettet, saker, verdi),
      fullforte: perMaaned(s => s.avsluttet, ferdigeIAlt, verdi),
      perStatus: perStatus(verdi),
    },
    perBehandler: behandlere.map(navn => {
      const egne = saker.filter(s => s.saksbehandler === navn);
      const egneFerdige = ferdige.filter(s => s.saksbehandler === navn);
      return {
        navn: navn || 'Ikke tildelt',
        nye: egne.filter(s => iPerioden(s.opprettet)).length,
        ferdige: egneFerdige.length,
        apne: egne.filter(erApen).length,
        verdiFerdige: sum(egneFerdige.map(verdi)),
        verdiApne: sum(egne.filter(erApen).map(verdi)),
      };
    }),
    // Oppdragslinjer på saker som kom inn i perioden. Beløp før rabatt.
    perOppdrag: OPPDRAG_REKKEFOLGE.map((type: OppdragType) => {
      const linjer = nye.flatMap(s => s.pris.oppdrag.filter(o => o.type === type));
      return {
        type,
        navn: OPPDRAG[type].navn,
        saker: nye.filter(s => s.pris.oppdrag.some(o => o.type === type)).length,
        sum: sum(linjer.map(o => o.antall * o.pris)) * (mva === 'inkl' ? 1.25 : 1),
      };
    }),
  };
};
