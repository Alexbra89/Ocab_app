// 30 fiktive eksempelkunder for å prøve appen. Alle navn, adresser, telefonnumre og e-poster er oppdiktet.
// Datoene regnes ut fra dagens dato, så løpetid og varsler (2, 15 og 30 dager) alltid vises.

import { nyOppdragLinje, tomPris, type OppdragType, type Pris, type Rolle, type Sak, type Status } from './saker.ts';

export const DEMO_PREFIKS = 'demo-';

export const erDemo = (sak: Pick<Sak, 'id'>) => sak.id.startsWith(DEMO_PREFIKS);

const DAG = 24 * 60 * 60 * 1000;

// [navn, adresse, postnummer, poststed]
const KUNDER: [string, string, string, string][] = [
  ['Kari Nordmann', 'Solbakken 12B', '1405', 'Langhus'],
  ['Per Hansen', 'Storgata 45', '0182', 'Oslo'],
  ['Lise Berg', 'Kirkeveien 7', '3015', 'Drammen'],
  ['Ola Bakken', 'Fjordveien 3', '5003', 'Bergen'],
  ['Ingrid Dahl', 'Bjørkelia 22', '7010', 'Trondheim'],
  ['Morten Lien', 'Parkveien 14', '4006', 'Stavanger'],
  ['Hege Moen', 'Skogveien 9', '1530', 'Moss'],
  ['Borettslaget Furulund', 'Furulundveien 2', '0670', 'Oslo'],
  ['Anders Strand', 'Strandgata 31', '9008', 'Tromsø'],
  ['Silje Haugen', 'Haugenstien 5', '2317', 'Hamar'],
  ['Restaurant Fjordkanten', 'Bryggen 18', '5003', 'Bergen'],
  ['Tor Eide', 'Eidsvollsgata 60', '2004', 'Lillestrøm'],
  ['Marianne Vik', 'Vikaveien 11', '3256', 'Larvik'],
  ['Geir Holm', 'Holmenkollveien 88', '0391', 'Oslo'],
  ['Nina Solberg', 'Solbergliveien 4', '1182', 'Oslo'],
  ['Sameiet Elvebredden', 'Elvegata 20', '3611', 'Kongsberg'],
  ['Erik Nilsen', 'Nilsebakken 3', '4631', 'Kristiansand'],
  ['Hanne Kristiansen', 'Torggata 17', '1606', 'Fredrikstad'],
  ['Jonas Larsen', 'Larsveien 29', '3110', 'Tønsberg'],
  ['Kafé Hjørnet', 'Hjørnegata 1', '6002', 'Ålesund'],
  ['Camilla Johansen', 'Granlia 8', '2609', 'Lillehammer'],
  ['Stian Pedersen', 'Bekkeveien 15', '1440', 'Drøbak'],
  ['Maria Andersen', 'Tunveien 6', '1710', 'Sarpsborg'],
  ['Bakeriet Kornmo', 'Møllegata 23', '3510', 'Hønefoss'],
  ['Lars Karlsen', 'Fjellstien 2', '5221', 'Nesttun'],
  ['Thea Ruud', 'Ruudsvingen 10', '1352', 'Kolsås'],
  ['Henrik Aas', 'Aasveien 41', '1430', 'Ås'],
  ['Hotell Bølgen', 'Havnegata 5', '8006', 'Bodø'],
  ['Ida Myhre', 'Myrveien 19', '3050', 'Mjøndalen'],
  ['Kristoffer Tangen', 'Tangenvika 7', '1350', 'Lommedalen'],
];

const BESKRIVELSER = [
  'Mus på loftet, ønsker forebyggende tiltak.',
  'Rotter i kjeller og kum. Kunden har sett ekskrementer langs veggene.',
  'Veps under takskjegget ved inngangspartiet.',
  'Skjeggkre på bad og vaskerom.',
  'Maur i kjøkkenbenken, gjentatte problemer hver vår.',
  'Rotter rundt avfallsområdet bak restauranten.',
  'Ønsker serviceavtale med faste kontroller av feller.',
  'Mistanke om veggdyr etter utenlandsreise.',
  'Mus i garasjen og boden. Behov for sikring av ventiler.',
  'Duer på taket – ønsker tilbud på sikring.',
];

const NOTATER = [
  'Ringte kunden – befaring avtalt.',
  'Sendt tilbud på e-post.',
  'Kunden ønsker tilbakemelding innen fredag.',
  'Satt ut feller, ny kontroll om to uker.',
  'Tettet tre åpninger ved grunnmuren.',
  'Kunden har godkjent tilbudet.',
];

// [status, dager siden opprettet, dager åpen før avslutning (for avsluttede saker)]
// Åpne saker spres over alle varselnivåer; avsluttede saker spres over det siste året for statistikken.
const FORLOP: [Status, number, number?][] = [
  ['ny', 0], ['ny', 1], ['ny', 3], ['ny', 9], ['ny', 17], ['ny', 33],
  ['pagaende', 2], ['pagaende', 5], ['pagaende', 12], ['pagaende', 16], ['pagaende', 24], ['pagaende', 38], ['pagaende', 52],
  ['ferdig', 20, 6], ['ferdig', 45, 12], ['ferdig', 70, 9], ['ferdig', 95, 21], ['ferdig', 120, 14], ['ferdig', 150, 30],
  ['ferdig', 180, 8], ['ferdig', 205, 18], ['ferdig', 235, 25], ['ferdig', 265, 11], ['ferdig', 295, 16], ['ferdig', 325, 7],
  ['ferdig', 350, 20],
  ['ingen_sak', 30, 3], ['ingen_sak', 110, 10], ['ingen_sak', 190, 5], ['ingen_sak', 280, 7],
];

const BEHANDLERE = ['Alexander', 'Ståle', 'Atle', 'Silvino'];
const ROLLER: Rolle[] = ['skadedyrekspert', 'tomrer', 'prosjektleder'];
const OPPDRAGSSETT: OppdragType[][] = [
  ['befaring'], ['befaring', 'bekjempelse'], ['befaring', 'sikring'], ['bekjempelse', 'serviceavtale'],
  ['sikring'], ['befaring', 'sikring', 'bekjempelse'], ['serviceavtale'], [],
];

const lagPris = (i: number): Pris => {
  const oppdrag = OPPDRAGSSETT[i % OPPDRAGSSETT.length].map(type => {
    const linje = nyOppdragLinje(type);
    // Sikring og bekjempelse har ingen fast pris i prislisten – sett en realistisk pris.
    if (type === 'sikring') return { ...linje, pris: 4500 + (i % 5) * 1500 };
    if (type === 'bekjempelse') return { ...linje, pris: 3200 + (i % 4) * 900 };
    if (type === 'serviceavtale') return { ...linje, antall: 4 + (i % 3) * 2 };
    return linje;
  });
  return { ...tomPris(), rolle: ROLLER[i % ROLLER.length], timer: (i * 7) % 12, kjoreKm: (i * 13) % 70, oppdrag };
};

export const lagDemoSaker = (na = Date.now()): Sak[] =>
  KUNDER.map(([navn, adresse, postnummer, poststed], i) => {
    const [status, dagerSiden, varighet] = FORLOP[i];
    const opprettet = new Date(na - dagerSiden * DAG - (i % 8) * 60 * 60 * 1000).toISOString();
    const avsluttet = varighet !== undefined ? new Date(new Date(opprettet).getTime() + varighet * DAG).toISOString() : undefined;
    const fornavn = navn.split(' ')[0].toLowerCase().replace('æ', 'ae').replace('ø', 'o').replace('å', 'a');

    // Noen saker får notater (datert etter opprettelsen), så de vises i saksboksen.
    const notater = Array.from({ length: i % 3 }, (_, n) => ({
      id: `${DEMO_PREFIKS}${i + 1}-n${n}`,
      tidspunkt: new Date(Math.min(na, new Date(opprettet).getTime() + (n + 1) * DAG)).toISOString(),
      tekst: NOTATER[(i + n) % NOTATER.length],
    })).reverse();

    return {
      id: `${DEMO_PREFIKS}${i + 1}`,
      saksnummer: '',
      opprettet,
      avsluttet,
      status,
      navn,
      adresse,
      postnummer,
      poststed,
      telefon: `9${(i * 7) % 10}${i % 10} ${String(10 + ((i * 37) % 89)).padStart(2, '0')} ${String(100 + ((i * 53) % 899))}`,
      epost: `${fornavn}@eksempel.no`,
      saksbehandler: i === 29 ? '' : BEHANDLERE[i % BEHANDLERE.length],
      beskrivelse: BESKRIVELSER[i % BESKRIVELSER.length],
      notater,
      aktiviteter: [{ id: `${DEMO_PREFIKS}${i + 1}-a`, tidspunkt: opprettet, tekst: 'Sak opprettet (eksempeldata)' }],
      lukketVarsel: 0,
      pris: lagPris(i),
    };
  });
