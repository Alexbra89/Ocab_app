import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lagSak, nyOppdragLinje, tommeKundefelter, tomPris, type Sak } from '../lib/saker.ts';
import { lagStatistikk, maanedNokkel, sisteMaaneder } from '../lib/statistikk.ts';

const na = new Date(2026, 9, 28, 12); // 28. oktober 2026
const sak = (endring: Partial<Sak>): Sak => ({ ...lagSak(tommeKundefelter(), ''), ...endring });
const fastpris = (sum: number) => ({ ...tomPris(), prisType: 'fastpris' as const, fastprisSum: sum });

test('måneder: siste 3 måneder, eldste først, i lokal tid', () => {
  assert.deepEqual(sisteMaaneder(3, na).map(m => m.nokkel), ['2026-08', '2026-09', '2026-10']);
  assert.equal(maanedNokkel(new Date(2026, 10, 1, 0, 30)), '2026-11');
});

test('statistikk: antall og verdi per måned, status og saksbehandler', () => {
  const saker = [
    sak({ saksbehandler: 'Atle', opprettet: new Date(2026, 8, 5).toISOString(), status: 'ferdig',
      avsluttet: new Date(2026, 9, 2).toISOString(), pris: fastpris(1000) }),
    sak({ saksbehandler: 'Atle', opprettet: new Date(2026, 9, 10).toISOString(), status: 'pagaende', pris: fastpris(2000) }),
    sak({ saksbehandler: '', opprettet: new Date(2026, 9, 12).toISOString(), status: 'ny',
      pris: { ...tomPris(), oppdrag: [nyOppdragLinje('befaring')] } }),
    sak({ opprettet: new Date(2025, 0, 1).toISOString(), status: 'ferdig', avsluttet: new Date(2025, 0, 5).toISOString(), pris: fastpris(9999) }),
  ];
  const stat = lagStatistikk(saker, sisteMaaneder(3, na), 'eks', na.getTime());
  const n = stat.nokkeltall;

  assert.equal(n.antallNye, 3, 'saken fra 2025 er utenfor perioden');
  assert.equal(n.antallFerdige, 1);
  assert.equal(n.antallApne, 2);
  assert.equal(n.snittLopetid, 27);
  assert.equal(n.verdiFerdige, 1000);
  assert.equal(n.verdiApne, 2000 + 4550);

  assert.deepEqual(stat.antall.innkommende.map(p => p.verdier.verdi), [0, 1, 2]);
  assert.deepEqual(stat.verdi.fullforte.map(p => p.verdier.verdi), [0, 0, 1000]);
  assert.deepEqual(stat.antall.perStatus[2].verdier, { ny: 1, pagaende: 1, ferdig: 0, ingen_sak: 0 });

  const atle = stat.perBehandler.find(b => b.navn === 'Atle')!;
  assert.deepEqual({ ferdige: atle.ferdige, apne: atle.apne, verdiApne: atle.verdiApne }, { ferdige: 1, apne: 1, verdiApne: 2000 });
  assert.ok(stat.perBehandler.some(b => b.navn === 'Ikke tildelt'));

  const befaring = stat.perOppdrag.find(o => o.type === 'befaring')!;
  assert.deepEqual({ saker: befaring.saker, sum: befaring.sum }, { saker: 1, sum: 4550 });

  const inkl = lagStatistikk(saker, sisteMaaneder(3, na), 'inkl', na.getTime());
  assert.equal(inkl.nokkeltall.verdiFerdige, 1250);
});
