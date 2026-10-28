import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aktivtVarsel, beregnPris, dagerApen, fyllInnManglende, kroner, lagSak, medSaksbehandler, medStatus,
  nesteSaksnummer, nyOppdragLinje, normaliserSaksbehandler, tildelSaksnummer, tomPris, tommeKundefelter, type Sak,
} from '../lib/saker.ts';

const DAG = 24 * 60 * 60 * 1000;
const sak = (endring: Partial<Sak> = {}): Sak => ({ ...lagSak(tommeKundefelter(), '2026-001'), ...endring });
const dagerSiden = (dager: number) => new Date(Date.now() - dager * DAG - 60_000).toISOString();

test('pris: timer, oppdrag, tillegg, rabatt og mva', () => {
  const pris = {
    ...tomPris(),
    rolle: 'tomrer' as const,
    timer: 3,
    oppdrag: [nyOppdragLinje('befaring'), { ...nyOppdragLinje('serviceavtale'), antall: 2 }],
    utstyr: 500,
    kjoreKm: 10,
    rabatt: 10,
  };
  const b = beregnPris(pris);
  assert.equal(b.grunnlag, 2700); // 3 t × 900
  assert.equal(b.oppdragSum, 4550 + 2 * 1218.75);
  assert.equal(b.kjoreTillegg, 65);
  assert.equal(b.sumForRabatt, 2700 + 6987.5 + 500 + 65);
  assert.equal(b.sumEksMva, b.sumForRabatt * 0.9);
  assert.equal(b.totalInklMva, b.sumEksMva * 1.25);
});

test('pris: fastpris erstatter timer', () => {
  const b = beregnPris({ ...tomPris(), prisType: 'fastpris', fastprisSum: 8000, timer: 99 });
  assert.equal(b.grunnlag, 8000);
});

test('kroner: øre bare når beløpet har det', () => {
  assert.match(kroner(4550), /^4\s550\skr$/);
  assert.match(kroner(1218.75), /^1\s218,75\skr$/);
});

test('saksnummer: løpenummer per år', () => {
  const ar = new Date().getFullYear();
  assert.equal(nesteSaksnummer([]), `${ar}-001`);
  assert.equal(nesteSaksnummer([{ saksnummer: `${ar}-009` }, { saksnummer: `${ar - 1}-120` }]), `${ar}-010`);
});

test('saksnummer: eldre saker uten nummer får nummer i opprettet-rekkefølge', () => {
  const saker = tildelSaksnummer([
    sak({ id: 'b', saksnummer: '', opprettet: '2025-03-01T10:00:00Z' }),
    sak({ id: 'a', saksnummer: '', opprettet: '2025-01-01T10:00:00Z' }),
    sak({ id: 'c', saksnummer: '2026-004', opprettet: '2026-02-01T10:00:00Z' }),
  ]);
  assert.deepEqual(saker.map(s => s.saksnummer), ['2025-002', '2025-001', '2026-004']);
});

test('status: avslutning stopper løpetiden, gjenåpning fjerner avsluttet', () => {
  const apen = sak({ opprettet: dagerSiden(10) });
  const ferdig = medStatus(apen, 'ferdig');
  assert.ok(ferdig.avsluttet);
  assert.equal(dagerApen(ferdig, Date.now() + 30 * DAG), 10);
  assert.equal(medStatus(ferdig, 'pagaende').avsluttet, undefined);
  assert.equal(ferdig.aktiviteter[0].tekst, 'Status endret fra «Ny» til «Ferdig»');
  assert.equal(medStatus(apen, 'ny'), apen, 'samme status gir samme sak');
});

test('saksbehandler: bytte logges', () => {
  const s = medSaksbehandler(sak({ saksbehandler: 'Atle' }), 'Silvino');
  assert.equal(s.saksbehandler, 'Silvino');
  assert.match(s.aktiviteter[0].tekst, /Atle til Silvino/);
  assert.equal(normaliserSaksbehandler('  atle b. '), 'Atle');
  assert.equal(normaliserSaksbehandler('Ukjent Person'), 'Ukjent Person');
});

test('varsler: 2, 15 og 30 dager, og lukket varsel kommer tilbake på neste nivå', () => {
  const na = Date.now();
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(1) }), na), null);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(3) }), na)?.niva, 2);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(16) }), na)?.niva, 15);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(31) }), na)?.niva, 30);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(16), lukketVarsel: 15 }), na), null);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(16), lukketVarsel: 2 }), na)?.niva, 15);
  assert.equal(aktivtVarsel(sak({ opprettet: dagerSiden(40), status: 'ferdig' }), na), null, 'avsluttede saker varsles ikke');
});

test('overgang: eldre saker får gyldige felter og nye rollenavn', () => {
  const gammel = fyllInnManglende({
    id: 'x', navn: 'Kari', prosjektleder: 'Ståle',
    pris: { rolle: 'ekspert', timer: 2 } as unknown as Sak['pris'],
  });
  assert.equal(gammel.saksbehandler, 'Ståle');
  assert.equal(gammel.pris.rolle, 'skadedyrekspert');
  assert.deepEqual(gammel.pris.oppdrag, []);
  assert.equal(gammel.lukketVarsel, 0);
  assert.equal('prosjektleder' in gammel, false);
});
