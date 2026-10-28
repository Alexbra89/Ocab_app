# Ocab Pro

Saksoversikt for Ocab: kunder, saker, saksbehandlere, varsler, tilbud og statistikk.

## Kom i gang

Krever [Node.js](https://nodejs.org) 22 eller nyere.

```bash
npm install
npm run dev
```

Åpne http://localhost:3000.

## Kommandoer

| Kommando            | Hva den gjør                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Starter appen for utvikling (oppdateres live)   |
| `npm run build`     | Bygger en produksjonsversjon                    |
| `npm start`         | Kjører produksjonsversjonen (etter `build`)     |
| `npm test`          | Kjører testene for pris, varsler, statistikk m.m. |
| `npm run lint`      | Sjekker kodestil                                |
| `npm run typecheck` | Sjekker typer                                   |

Kjør `npm test`, `npm run lint` og `npm run typecheck` før du deler endringer.

## Hvor ligger hva

```
app/
  page.tsx                 Saksoversikten (forsiden)
  statistikk/page.tsx      Statistikk og økonomi
  api/les-dokument/        Leser opplastede dokumenter og finner kundeinfo
  components/              Saksboks, skjemaer, vinduer, diagram, ikoner
lib/
  saker.ts                 Datamodell, statuser, varsler, priser, saksbehandlere, lagring
  statistikk.ts            Utregning av tall og summer til statistikksiden
  dokumentTolker.ts        Finner navn, adresse, telefon osv. i tekst
  eksport.ts               Excel (CSV), sikkerhetskopi (JSON) og tilbud
tests/                     Tester for lib/
```

### Vanlige endringer

- **Priser, roller og oppdrag:** `ROLLER` og `OPPDRAG` i `lib/saker.ts`.
- **Saksbehandlere:** `SAKSBEHANDLERE` i `lib/saker.ts`.
- **Når varsler slår inn (2, 15, 30 dager):** `VARSLER` i `lib/saker.ts`.
- **Farger:** Ocab-blå ligger i `app/globals.css`, statusfarger i `STATUSER` i `lib/saker.ts`.

## Viktig om lagring

Alle data lagres **lokalt i nettleseren** (localStorage). Det betyr:

- Hver person og hver nettleser har sine egne saker – de deles ikke mellom saksbehandlere.
- Tømmes nettleserdata, forsvinner sakene. Ta jevnlig sikkerhetskopi under **Eksporter → Sikkerhetskopi (.json)**.

Skal flere jobbe i de samme sakene, trengs en felles database og innlogging.
All lesing og lagring går gjennom `lastSaker` / `lagreSaker` i `lib/saker.ts`, så det er der en database kobles på.
