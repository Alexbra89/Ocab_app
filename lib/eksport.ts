// Eksport til Excel (CSV), sikkerhetskopi (JSON) og tilbudsdokument.

import { beregnPris, dagerApen, kroner, KM_SATS, OPPDRAG, ROLLER, STATUSER, type FirmaInfo, type Sak } from './saker.ts';

const lastNed = (innhold: BlobPart, filnavn: string, type: string) => {
  const url = URL.createObjectURL(new Blob([innhold], { type }));
  const lenke = document.createElement('a');
  lenke.href = url;
  lenke.download = filnavn;
  lenke.click();
  URL.revokeObjectURL(url);
};

const iDag = () => new Date().toISOString().slice(0, 10);

const dato = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('nb-NO') : '');

// Semikolon og BOM gjør at norsk Excel åpner filen riktig med æøå.
export const eksporterExcel = (saker: Sak[]) => {
  const na = Date.now();
  const kolonner: [string, (s: Sak) => string | number][] = [
    ['Saksnummer', s => s.saksnummer],
    ['Navn', s => s.navn],
    ['Adresse', s => s.adresse],
    ['Postnummer', s => s.postnummer],
    ['Poststed', s => s.poststed],
    ['Telefon', s => s.telefon],
    ['E-post', s => s.epost],
    ['Saksbehandler', s => s.saksbehandler],
    ['Status', s => STATUSER[s.status].navn],
    ['Opprettet', s => dato(s.opprettet)],
    ['Avsluttet', s => dato(s.avsluttet)],
    ['Dager åpen', s => dagerApen(s, na)],
    ['Oppdrag', s => s.pris.oppdrag.map(o => o.variant).join(', ')],
    ['Sum inkl. mva', s => Math.round(beregnPris(s.pris).totalInklMva)],
    ['Beskrivelse', s => s.beskrivelse],
    ['Notater', s => s.notater.map(n => `${dato(n.tidspunkt)}: ${n.tekst}`).join(' | ')],
  ];
  const celle = (v: string | number) => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
  const rader = [kolonner.map(([navn]) => celle(navn)), ...saker.map(s => kolonner.map(([, hent]) => celle(hent(s))))];
  lastNed('﻿' + rader.map(r => r.join(';')).join('\r\n'), `ocab-saker-${iDag()}.csv`, 'text/csv;charset=utf-8');
};

export const eksporterSikkerhetskopi = (saker: Sak[], firma: FirmaInfo) => {
  lastNed(JSON.stringify({ versjon: 2, eksportert: new Date().toISOString(), firma, saker }, null, 2),
    `ocab-sikkerhetskopi-${iDag()}.json`, 'application/json');
};

const html = (s: string) => s.replace(/[&<>"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[t]!);

export const lastNedTilbud = (sak: Sak, firma: FirmaInfo) => {
  const p = sak.pris;
  const b = beregnPris(p);
  const rad = (post: string, detalj: string, belop: number, klasse = '') =>
    `<tr class="${klasse}"><td>${post}</td><td>${detalj}</td><td class="h">${kroner(belop)}</td></tr>`;

  const innhold = `<!DOCTYPE html><html lang="no"><head><meta charset="UTF-8"><title>Tilbud – ${html(sak.navn)}</title><style>
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:780px;margin:48px auto;padding:0 24px}
.topp{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #006cb7;padding-bottom:20px}
.logo{font-size:30px;font-weight:700;color:#006cb7;letter-spacing:-.02em}.firma{text-align:right;font-size:13px;color:#475569;line-height:1.6}
h1{font-size:22px;margin:32px 0 16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.boks{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px}.l{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.v{margin-top:4px;font-size:15px}table{width:100%;border-collapse:collapse;margin:28px 0;font-size:14px}
th,td{padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
.h{text-align:right}.rabatt{color:#b45309}.sum td{font-weight:700}.total{background:#006cb7;color:#fff;border-radius:12px;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
.total b{font-size:28px}.signatur{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:64px}.linje{border-top:1px solid #0f172a;padding-top:6px;font-size:12px;color:#64748b}
.fot{margin-top:48px;font-size:12px;color:#64748b;text-align:center}</style></head><body>
<div class="topp"><div><div class="logo">Ocab</div><div style="color:#475569;font-size:13px">${html(firma.navn)}</div></div>
<div class="firma">Org.nr ${html(firma.orgNr)}<br>${html(firma.telefon)}<br>${html(firma.epost)}<br>${html(firma.adresse)}</div></div>
<h1>Tilbud <span style="color:#64748b;font-weight:400">· sak ${html(sak.saksnummer)}</span></h1><div class="grid">
<div class="boks"><div class="l">Kunde</div><div class="v">${html(sak.navn)}</div></div>
<div class="boks"><div class="l">Adresse</div><div class="v">${html(sak.adresse)}${sak.postnummer ? `, ${html(sak.postnummer)} ${html(sak.poststed)}` : ''}</div></div>
<div class="boks"><div class="l">Kontakt</div><div class="v">${html(sak.telefon)}${sak.epost ? ` · ${html(sak.epost)}` : ''}</div></div>
<div class="boks"><div class="l">Saksbehandler</div><div class="v">${html(sak.saksbehandler || '–')}</div></div></div>
<table><thead><tr><th>Post</th><th>Detaljer</th><th class="h">Beløp</th></tr></thead><tbody>
${b.grunnlag ? rad('Arbeid', p.prisType === 'timespris' ? `${ROLLER[p.rolle].navn}, ${p.timer} t × ${kroner(ROLLER[p.rolle].sats)}` : 'Fastpris', b.grunnlag) : ''}
${p.oppdrag.map(o => rad(html(OPPDRAG[o.type].navn), `${html(o.variant)}, ${o.antall} × ${kroner(o.pris)}`, o.antall * o.pris)).join('')}
${p.utstyr ? rad('Utstyr og materiell', 'Eks. mva', p.utstyr) : ''}
${p.kjoreKm ? rad('Kjøring', `${p.kjoreKm} km × ${KM_SATS} kr`, b.kjoreTillegg) : ''}
${p.bompenger ? rad('Bompenger', '', p.bompenger) : ''}
${p.rabatt ? rad(`Rabatt (${p.rabatt} %)`, '', -b.rabattBelop, 'rabatt') : ''}
${rad('Sum eks. mva', '', b.sumEksMva, 'sum')}${rad('MVA 25 %', '', b.mva)}</tbody></table>
<div class="total"><span>Totalt inkl. mva</span><b>${kroner(b.totalInklMva)}</b></div>
${sak.beskrivelse ? `<div class="boks" style="margin-top:24px"><div class="l">Beskrivelse</div><div class="v" style="white-space:pre-wrap">${html(sak.beskrivelse)}</div></div>` : ''}
<div class="signatur"><div class="linje">Kundens signatur</div><div class="linje">Dato</div></div>
<div class="fot">Generert ${dato(new Date().toISOString())} · Forbehold om feil. Endelig pris etter befaring. Betaling 14 dager netto.</div>
</body></html>`;

  lastNed(innhold, `tilbud-${sak.navn.trim().replace(/\s+/g, '-') || 'kunde'}-${iDag()}.html`, 'text/html');
};
