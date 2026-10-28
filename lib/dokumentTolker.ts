// Finner kundeinfo i teksten fra et opplastet dokument (befaringsskjema, e-post, ordre o.l.).
// Leter først etter merkede felter ("Navn: ...", "Telefon: ..."), og faller så tilbake
// på mønstre som e-postadresser, norske telefonnumre og "1234 Poststed".

import type { Kundefelter } from './saker';

const ETIKETTER: Record<keyof Omit<Kundefelter, 'beskrivelse'>, string[]> = {
  navn: ['kundenavn', 'kunde', 'navn', 'kontaktperson', 'oppdragsgiver', 'bestiller', 'tiltakshaver', 'eier', 'name', 'fra', 'from'],
  adresse: ['adresse', 'gateadresse', 'besøksadresse', 'oppdragsadresse', 'leveringsadresse', 'adr', 'address'],
  postnummer: ['postnummer', 'postnr', 'post nr'],
  poststed: ['poststed', 'sted', 'by'],
  telefon: ['telefon', 'tlf', 'mobil', 'mob', 'telefonnummer', 'phone'],
  epost: ['e-post', 'epost', 'e-mail', 'email', 'mail'],
  saksbehandler: ['saksbehandler', 'prosjektleder', 'ansvarlig', 'prosjektansvarlig', 'vår kontakt', 'vår ref', 'project manager'],
};

const EPOST = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TELEFON = /(?:\+47|0047)?[\s-]?(?:[2-9]\d{7}|[2-9]\d(?:[\s-]?\d{2}){3}|[2-9]\d{2}[\s-]?\d{2}[\s-]?\d{3})\b/;
const POSTNR_STED = /\b(\d{4})\s+([A-ZÆØÅ][A-Za-zÆØÅæøå.-]+(?:\s+[A-ZÆØÅ][A-Za-zÆØÅæøå.-]+)*)/;
const GATE = /[A-ZÆØÅ][A-Za-zÆØÅæøå.'-]*(?:\s+[A-Za-zÆØÅæøå.'-]+)*?\s+\d+\s?[A-Za-z]?\b/;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const rydd = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s:;,.-]+|[\s:;,]+$/g, '').trim();

// Finner verdien etter en etikett: "Navn: Ola" på samme linje, eller etiketten alene på en linje og verdien på neste.
const finnEtikett = (linjer: string[], etiketter: string[]): string => {
  for (const etikett of etiketter) {
    const re = new RegExp(`^\\s*${escape(etikett)}\\s*[:.\\-–]?\\s*(.*)$`, 'i');
    for (let i = 0; i < linjer.length; i++) {
      const treff = linjer[i].match(re);
      if (!treff) continue;
      const verdi = rydd(treff[1]);
      // Krev skilletegn hvis verdien står på samme linje, så "Kunden ønsker ..." ikke tolkes som navn.
      const harSkille = new RegExp(`^\\s*${escape(etikett)}\\s*[:\\-–]`, 'i').test(linjer[i]);
      if (verdi && harSkille) return verdi;
      if (!verdi && linjer[i + 1]?.trim()) return rydd(linjer[i + 1]);
    }
  }
  return '';
};

export const tolkKundeinfo = (tekst: string): Partial<Kundefelter> => {
  const linjer = tekst.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const funnet: Partial<Kundefelter> = {};

  for (const felt of Object.keys(ETIKETTER) as (keyof typeof ETIKETTER)[]) {
    const verdi = finnEtikett(linjer, ETIKETTER[felt]);
    if (verdi) funnet[felt] = verdi;
  }

  // Rens og kontroller merkede verdier, og fall tilbake på mønstre i hele teksten.
  const epost = (funnet.epost || '').match(EPOST)?.[0] || tekst.match(EPOST)?.[0];
  funnet.epost = epost || '';

  const telefonKilde = funnet.telefon || tekst.replace(EPOST, ' ');
  const telefon = telefonKilde.match(TELEFON)?.[0];
  funnet.telefon = telefon ? formaterTelefon(telefon) : '';

  // "Storgata 1, 0123 Oslo" i adressefeltet deles opp i adresse, postnummer og poststed.
  if (funnet.adresse) {
    const delt = funnet.adresse.match(/^(.*?)[,\s]+(\d{4})\s+(.+)$/);
    if (delt) {
      funnet.adresse = rydd(delt[1]);
      funnet.postnummer ||= delt[2];
      funnet.poststed ||= rydd(delt[3]);
    }
  }

  if (funnet.postnummer) funnet.postnummer = funnet.postnummer.match(/\d{4}/)?.[0] || '';

  if (!funnet.postnummer || !funnet.adresse) {
    for (let i = 0; i < linjer.length; i++) {
      const treff = linjer[i].match(POSTNR_STED);
      if (!treff) continue;
      funnet.postnummer ||= treff[1];
      funnet.poststed ||= rydd(treff[2]);
      if (!funnet.adresse) {
        // Gateadressen står ofte foran postnummeret på samme linje, eller på linjen over.
        const foran = linjer[i].slice(0, treff.index).replace(/,\s*$/, '');
        const gate = foran.match(GATE)?.[0] || linjer[i - 1]?.match(GATE)?.[0];
        if (gate) funnet.adresse = rydd(gate);
      }
      break;
    }
  }

  if (!funnet.adresse) {
    const gate = tekst.match(/[A-ZÆØÅ][a-zæøå]+(?:veien|vegen|vei|veg|gata|gate|gaten|plass|plassen|bakken|stien|lia|haugen|tunet|allé|alle|svingen|ringen)\s+\d+\s?[A-Za-z]?\b/);
    if (gate) funnet.adresse = gate[0];
  }

  // E-postavsender: "Per Hansen <per@firma.no>" → "Per Hansen".
  if (funnet.navn) funnet.navn = rydd(funnet.navn.replace(/<[^>]*>/g, '').replace(/"/g, ''));

  // Navn bør ikke være en e-post, et nummer eller en hel setning.
  if (funnet.navn && (EPOST.test(funnet.navn) || /\d{4}/.test(funnet.navn) || funnet.navn.split(' ').length > 6)) {
    funnet.navn = '';
  }

  // Fjern tomme felter, så de ikke overskriver det brukeren allerede har skrevet.
  for (const felt of Object.keys(funnet) as (keyof Kundefelter)[]) {
    if (!funnet[felt]) delete funnet[felt];
  }
  return funnet;
};

const formaterTelefon = (nummer: string) => {
  const sifre = nummer.replace(/\D/g, '').replace(/^(0047|47)(?=\d{8}$)/, '');
  if (sifre.length !== 8) return nummer.trim();
  return /^[49]/.test(sifre)
    ? `${sifre.slice(0, 3)} ${sifre.slice(3, 5)} ${sifre.slice(5)}`
    : `${sifre.slice(0, 2)} ${sifre.slice(2, 4)} ${sifre.slice(4, 6)} ${sifre.slice(6)}`;
};
