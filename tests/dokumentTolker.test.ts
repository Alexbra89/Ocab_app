import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolkKundeinfo } from '../lib/dokumentTolker.ts';

test('merkede felter, med adresse delt opp', () => {
  const felter = tolkKundeinfo(`BEFARINGSSKJEMA

Kunde: Kari Nordmann
Adresse: Solbakken 12B, 1405 Langhus
Telefon: +47 912 34 567
E-post: kari.nordmann@gmail.com
Prosjektleder: Ståle`);
  assert.deepEqual(felter, {
    navn: 'Kari Nordmann', adresse: 'Solbakken 12B', postnummer: '1405', poststed: 'Langhus',
    telefon: '912 34 567', epost: 'kari.nordmann@gmail.com', saksbehandler: 'Ståle',
  });
});

test('e-post uten etiketter: avsender, signatur og mobilnummer', () => {
  const felter = tolkKundeinfo(`From: Per Hansen <per.hansen@firma.no>
Subject: Forespørsel om befaring

Mvh
Per Hansen
Storgata 45
0182 Oslo
Mob: 98765432`);
  assert.equal(felter.navn, 'Per Hansen');
  assert.equal(felter.epost, 'per.hansen@firma.no');
  assert.equal(felter.telefon, '987 65 432');
  assert.equal(felter.adresse, 'Storgata 45');
  assert.equal(felter.postnummer, '0182');
  assert.equal(felter.poststed, 'Oslo');
});

test('etikett og verdi på hver sin linje (tabeller fra PDF)', () => {
  const felter = tolkKundeinfo('Kundenavn\nLise Berg\nTelefon\n22 33 44 55');
  assert.equal(felter.navn, 'Lise Berg');
  assert.equal(felter.telefon, '22 33 44 55');
});

test('tomme felter tas ikke med, og setninger tolkes ikke som navn', () => {
  const felter = tolkKundeinfo('Kunden ønsker befaring snarest mulig.');
  assert.deepEqual(felter, {});
});
