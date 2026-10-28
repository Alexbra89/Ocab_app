"use client";
import React, { useState, useEffect, useRef } from 'react';

// Alt lagres lokalt i nettleseren (localStorage) – ingen database eller innlogging
const LAGRINGSNOKKEL = 'ocab_v81_data';
const BRUKER = 'Meg';

interface Aktivitet {
  id: number;
  tidspunkt: string;
  handling: string;
  bruker: string;
}

interface Hurtignotat {
  id: number;
  tidspunkt: string;
  tekst: string;
  bruker: string;
}

interface Paminnelse {
  id: number;
  dato: string;
  tid: string;
  melding: string;
  aktiv: boolean;
}

interface Mal {
  id: number;
  navn: string;
  beskrivelse: string;
  timer: number;
  rolle: 'tømrer' | 'ekspert';
  mengde: number;
  enhet: string;
  utstyr: number;
  prisType: 'timespris' | 'fastpris';
  fastprisSum: number;
}

interface Prosjekt {
  id: number;
  kunde: string;
  mengde: number;
  enhet: string;
  timer: number;
  rolle: 'tømrer' | 'ekspert';
  prisType: 'timespris' | 'fastpris';
  fastprisSum: number;
  utstyr: number;
  notat: string;
  status: 'Befaring utført' | 'Tilbud levert' | 'Sak fakturert';
  dato: string;
  opprettet: string;
  bilder: string[];
  faktiskTimer?: number;
  rabatt?: number;
  tilbudGyldigTil?: string;
  ansvarlig: 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert';
  kjoreKm?: number;
  bompenger?: number;
  varselAvvist?: boolean;
  aktiviteter: Aktivitet[];
  hurtignotater: Hurtignotat[];
  paminnelser: Paminnelse[];
  valgt?: boolean; // For bulk-operasjoner
}

interface FirmaInfo {
  orgNr: string;
  telefon: string;
  epost: string;
  adresse: string;
}

export default function OcabProV81PRO() {
  const [firmaInfo, setFirmaInfo] = useState<FirmaInfo>({
    orgNr: '123 456 789',
    telefon: '+47 123 45 678',
    epost: 'post@ocab.no',
    adresse: 'Gateveien 1, 0123 Oslo'
  });
  const [visFirmaRedigering, setVisFirmaRedigering] = useState(false);

  const [prosjekter, setProsjekter] = useState<Prosjekt[]>([]);
  const [maler, setMaler] = useState<Mal[]>([]);
  const [visSkjema, setVisSkjema] = useState(false);
  const [redigererId, setRedigererId] = useState<number | null>(null);
  const [visStatistikk, setVisStatistikk] = useState(false);
  const [aktivMedarbeider, setAktivMedarbeider] = useState<'alle' | 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert'>('alle');
  
  // Bulk-operasjoner
  const [bulkModus, setBulkModus] = useState(false);
  const [antallValgte, setAntallValgte] = useState(0);
  
  // Påminnelser
  const [visPaminnelseForm, setVisPaminnelseForm] = useState<number | null>(null);
  const [nyPaminnelse, setNyPaminnelse] = useState({ dato: '', tid: '', melding: '' });
  
  // Maler
  const [visMalForm, setVisMalForm] = useState(false);
  const [visMalListe, setVisMalListe] = useState(false);
  
  // Kundehistorikk
  const [visKundeHistorikk, setVisKundeHistorikk] = useState<string | null>(null);

  const [visAktivitet, setVisAktivitet] = useState<number | null>(null);
  const [nyHurtignotat, setNyHurtignotat] = useState('');
  const [visHurtignotat, setVisHurtignotat] = useState<number | null>(null);

  const [kunde, setKunde] = useState('');
  const [mengde, setMengde] = useState(0);
  const [enhet, setEnhet] = useState('m²');
  const [timer, setTimer] = useState(0);
  const [rolle, setRolle] = useState<'tømrer' | 'ekspert'>('tømrer');
  const [prisType, setPrisType] = useState<'timespris' | 'fastpris'>('timespris');
  const [fastprisSum, setFastprisSum] = useState(0);
  const [utstyr, setUtstyr] = useState(0);
  const [notat, setNotat] = useState('');
  const [bilder, setBilder] = useState<string[]>([]);
  const [faktiskTimer, setFaktiskTimer] = useState(0);
  const [rabatt, setRabatt] = useState(0);
  const [tilbudGyldigTil, setTilbudGyldigTil] = useState('');
  const [ansvarlig, setAnsvarlig] = useState<'Alexander' | 'Ståle' | 'Baard' | 'Fakturert'>('Fakturert');
  const [kjoreKm, setKjoreKm] = useState(0);
  const [bompenger, setBompenger] = useState(0);
  
  const [sokeTekst, setSokeTekst] = useState('');
  const [sortering, setSortering] = useState<'dato' | 'pris' | 'status'>('dato');
  const [filterStatus, setFilterStatus] = useState<string>('alle');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SATSER = { tømrer: 750, ekspert: 900 };
  const KM_SATS = 6.50;
  const OCAB_BLA = '#0066CC';

  const STATUS_COLORS = {
    'Befaring utført': { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
    'Tilbud levert': { bg: '#cce5ff', border: OCAB_BLA, text: '#004085' },
    'Sak fakturert': { bg: '#d1e7dd', border: '#198754', text: '#0f5132' }
  };

  const MEDARBEIDER_COLORS = {
    'Alexander': '#e74c3c',
    'Ståle': '#3498db',
    'Baard': '#2ecc71',
    'Fakturert': '#95a5a6'
  };

  // ===== LOKAL LAGRING =====
  const lagreLokalt = (oppdaterteProsjekter: Prosjekt[]) => {
    localStorage.setItem(LAGRINGSNOKKEL, JSON.stringify(oppdaterteProsjekter));
  };

  // ===== LOGG AKTIVITET =====
  const loggAktivitet = (prosjektId: number, handling: string) => {
    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.id === prosjektId) {
          const nyAktivitet: Aktivitet = {
            id: Date.now(),
            tidspunkt: new Date().toLocaleString('no-NO'),
            handling,
            bruker: BRUKER
          };
          return {
            ...p,
            aktiviteter: [nyAktivitet, ...(p.aktiviteter || [])]
          };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      return oppdatert;
    });
  };

  // ===== HURTIGNOTAT =====
  const leggTilHurtignotat = (e: React.MouseEvent, prosjektId: number) => {
    e.stopPropagation();
    if (!nyHurtignotat.trim()) return;

    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.id === prosjektId) {
          const notat: Hurtignotat = {
            id: Date.now(),
            tidspunkt: new Date().toLocaleString('no-NO'),
            tekst: nyHurtignotat,
            bruker: BRUKER
          };
          return {
            ...p,
            hurtignotater: [notat, ...(p.hurtignotater || [])]
          };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      return oppdatert;
    });

    setNyHurtignotat('');
    loggAktivitet(prosjektId, `Hurtignotat: "${nyHurtignotat}"`);
  };

  // ===== DUPLISER SAK =====
  const dupliserSak = (e: React.MouseEvent, originalSak: Prosjekt) => {
    e.stopPropagation();
    
    const kundeNavn = prompt('Nytt kundenavn:', '');
    if (!kundeNavn) return;

    const duplisert: Prosjekt = {
      ...originalSak,
      id: Date.now(),
      kunde: kundeNavn,
      dato: new Date().toLocaleDateString('no-NO'),
      opprettet: new Date().toISOString(),
      status: 'Befaring utført',
      varselAvvist: false,
      bilder: [],
      aktiviteter: [{
        id: Date.now(),
        tidspunkt: new Date().toLocaleString('no-NO'),
        handling: `Duplisert fra "${originalSak.kunde}"`,
        bruker: BRUKER
      }],
      hurtignotater: [],
      paminnelser: []
    };

    setProsjekter(prev => {
      const oppdatert = [duplisert, ...prev];
      lagreLokalt(oppdatert);
      return oppdatert;
    });
    alert(`✅ Sak duplisert for "${kundeNavn}"`);
  };

  // ===== PÅMINNELSER =====
  const leggTilPaminnelse = (e: React.MouseEvent, prosjektId: number) => {
    e.stopPropagation();
    if (!nyPaminnelse.dato || !nyPaminnelse.tid) {
      alert('Fyll inn dato og tid');
      return;
    }

    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.id === prosjektId) {
          const paminnelse: Paminnelse = {
            id: Date.now(),
            dato: nyPaminnelse.dato,
            tid: nyPaminnelse.tid,
            melding: nyPaminnelse.melding || 'Påminnelse',
            aktiv: true
          };
          return {
            ...p,
            paminnelser: [...(p.paminnelser || []), paminnelse]
          };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      return oppdatert;
    });

    setNyPaminnelse({ dato: '', tid: '', melding: '' });
    setVisPaminnelseForm(null);
    loggAktivitet(prosjektId, `Påminnelse satt: ${nyPaminnelse.dato} ${nyPaminnelse.tid}`);
  };

  const snoozePaminnelse = (e: React.MouseEvent, prosjektId: number, paminnelseId: number, timer: number) => {
    e.stopPropagation();
    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.id === prosjektId) {
          const oppdatertePaminnelser = p.paminnelser?.map(pam => {
            if (pam.id === paminnelseId) {
              const nyDato = new Date();
              nyDato.setHours(nyDato.getHours() + timer);
              return {
                ...pam,
                dato: nyDato.toISOString().split('T')[0],
                tid: nyDato.toTimeString().slice(0, 5)
              };
            }
            return pam;
          });
          return { ...p, paminnelser: oppdatertePaminnelser };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      return oppdatert;
    });
  };

  // ===== BULK-OPERASJONER =====
  const toggleValg = (e: React.SyntheticEvent, prosjektId: number) => {
    e.stopPropagation();
    setProsjekter(prev => {
      const oppdatert = prev.map(p => p.id === prosjektId ? { ...p, valgt: !p.valgt } : p);
      setAntallValgte(oppdatert.filter(p => p.valgt).length);
      return oppdatert;
    });
  };

  const bulkEndreStatus = (nyStatus: 'Befaring utført' | 'Tilbud levert' | 'Sak fakturert') => {
    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.valgt) {
          loggAktivitet(p.id, `Bulk: Status endret til "${nyStatus}"`);
          return { ...p, status: nyStatus, valgt: false };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      setAntallValgte(0);
      setBulkModus(false);
      return oppdatert;
    });
  };

  const bulkFlyttTil = (nyAnsvarlig: 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert') => {
    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.valgt) {
          loggAktivitet(p.id, `Bulk: Flyttet til ${nyAnsvarlig}`);
          return { ...p, ansvarlig: nyAnsvarlig, valgt: false };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      setAntallValgte(0);
      setBulkModus(false);
      return oppdatert;
    });
  };

  const bulkSlett = () => {
    if (!confirm(`Slette ${antallValgte} valgte saker?`)) return;
    setProsjekter(prev => {
      const oppdatert = prev.filter(p => !p.valgt);
      lagreLokalt(oppdatert);
      setAntallValgte(0);
      setBulkModus(false);
      return oppdatert;
    });
  };

  // ===== KUNDEHISTORIKK =====
  const hentKundeHistorikk = (kundenavn: string) => {
    return prosjekter.filter(p => 
      p.kunde.toLowerCase().includes(kundenavn.toLowerCase())
    );
  };

  // ===== MALER =====
  const lagreMal = () => {
    if (!kunde) {
      alert('Fyll inn malnavn (i kunde-feltet)');
      return;
    }

    const nyMal: Mal = {
      id: Date.now(),
      navn: kunde,
      beskrivelse: notat,
      timer,
      rolle,
      mengde,
      enhet,
      utstyr,
      prisType,
      fastprisSum
    };

    setMaler(prev => {
      const oppdatert = [...prev, nyMal];
      localStorage.setItem('ocab_maler', JSON.stringify(oppdatert));
      return oppdatert;
    });

    alert(`✅ Mal "${kunde}" lagret!`);
    setVisMalForm(false);
    resetSkjema();
  };

  const opprettFraMal = (mal: Mal) => {
    const kundeNavn = prompt('Kundenavn for ny sak:', '');
    if (!kundeNavn) return;

    setKunde(kundeNavn);
    setTimer(mal.timer);
    setRolle(mal.rolle);
    setMengde(mal.mengde);
    setEnhet(mal.enhet);
    setUtstyr(mal.utstyr);
    setPrisType(mal.prisType);
    setFastprisSum(mal.fastprisSum);
    setNotat(mal.beskrivelse);
    
    setVisMalListe(false);
    setVisSkjema(true);
  };

  // ===== AVANSERT STATISTIKK =====
  const beregnAvansertStats = () => {
    const fakturerte = prosjekter.filter(p => p.status === 'Sak fakturert');
    const tilbudSendt = prosjekter.filter(p => p.status === 'Tilbud levert' || p.status === 'Sak fakturert');
    
    const conversionRate = tilbudSendt.length > 0 ? (fakturerte.length / tilbudSendt.length) * 100 : 0;
    
    const tidPerSak = fakturerte.map(p => {
      const start = new Date(p.opprettet);
      const slutt = new Date();
      return (slutt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    });
    const gjennomsnittligTid = tidPerSak.length > 0 ? tidPerSak.reduce((a, b) => a + b, 0) / tidPerSak.length : 0;

    const medarbeiderYtelse = ['Alexander', 'Ståle', 'Baard'].map(person => {
      const saker = prosjekter.filter(p => p.ansvarlig === person);
      const omsetning = saker.reduce((sum, p) => sum + beregnPris(p).totalInklMva, 0);
      const timer = saker.reduce((sum, p) => sum + p.timer, 0);
      return {
        navn: person,
        omsetning,
        krPerTime: timer > 0 ? omsetning / timer : 0
      };
    }).sort((a, b) => b.krPerTime - a.krPerTime);

    return {
      conversionRate,
      gjennomsnittligTid,
      besteMedarbeider: medarbeiderYtelse[0]
    };
  };

  // ===== DATA PERSISTENS =====
  useEffect(() => {
    const lagredeProsjekter = localStorage.getItem(LAGRINGSNOKKEL);
    const lagretFirma = localStorage.getItem('ocab_firma_info');
    const lagredeMaler = localStorage.getItem('ocab_maler');
    
    if (lagredeProsjekter) setProsjekter(JSON.parse(lagredeProsjekter));
    if (lagretFirma) setFirmaInfo(JSON.parse(lagretFirma));
    if (lagredeMaler) setMaler(JSON.parse(lagredeMaler));
  }, []);

  useEffect(() => {
    localStorage.setItem('ocab_firma_info', JSON.stringify(firmaInfo));
  }, [firmaInfo]);

  // Påminnelse-sjekker
  useEffect(() => {
    const interval = setInterval(() => {
      const nå = new Date();
      prosjekter.forEach(p => {
        p.paminnelser?.forEach(pam => {
          if (pam.aktiv) {
            const pamDato = new Date(`${pam.dato}T${pam.tid}`);
            if (pamDato <= nå) {
              alert(`🔔 Påminnelse: ${pam.melding} (${p.kunde})`);
              setProsjekter(prev => prev.map(pr => {
                if (pr.id === p.id) {
                  return {
                    ...pr,
                    paminnelser: pr.paminnelser?.map(pm => 
                      pm.id === pam.id ? { ...pm, aktiv: false } : pm
                    )
                  };
                }
                return pr;
              }));
            }
          }
        });
      });
    }, 60000); // Sjekk hvert minutt

    return () => clearInterval(interval);
  }, [prosjekter]);

  const lagreFirmaInfo = () => {
    setVisFirmaRedigering(false);
    alert('Firmainfo lagret!');
  };

  const skalViseVarsel = (p: Prosjekt): boolean => {
    if (p.varselAvvist) return false;
    if (p.status !== 'Tilbud levert') return false;
    
    const opprettetDato = new Date(p.opprettet);
    const iDag = new Date();
    const dagerSiden = Math.floor((iDag.getTime() - opprettetDato.getTime()) / (1000 * 60 * 60 * 24));
    
    return dagerSiden >= 14;
  };

  const avvisVarsel = (e: React.MouseEvent, prosjektId: number) => {
    e.stopPropagation();
    setProsjekter(prev => {
      const oppdatert = prev.map(p => p.id === prosjektId ? { ...p, varselAvvist: true } : p);
      lagreLokalt(oppdatert);
      return oppdatert;
    });
    loggAktivitet(prosjektId, '14-dagers varsel avvist');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBilder(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const slettBilde = (index: number) => {
    setBilder(prev => prev.filter((_, i) => i !== index));
  };

  const apneRedigering = (p: Prosjekt) => {
    setRedigererId(p.id);
    setKunde(p.kunde);
    setMengde(p.mengde);
    setEnhet(p.enhet);
    setTimer(p.timer);
    setRolle(p.rolle);
    setPrisType(p.prisType);
    setFastprisSum(p.fastprisSum);
    setUtstyr(p.utstyr);
    setNotat(p.notat);
    setBilder(p.bilder || []);
    setFaktiskTimer(p.faktiskTimer || 0);
    setRabatt(p.rabatt || 0);
    setTilbudGyldigTil(p.tilbudGyldigTil || '');
    setAnsvarlig(p.ansvarlig || 'Fakturert');
    setKjoreKm(p.kjoreKm || 0);
    setBompenger(p.bompenger || 0);
    setVisSkjema(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const lagreEllerOppdater = () => {
    if (!kunde) return alert("Skriv inn kundenavn");

    if (redigererId) {
      setProsjekter(prev => {
        const oppdatert = prev.map(p => {
          if (p.id === redigererId) {
            loggAktivitet(redigererId, 'Sak oppdatert');
            return {
              ...p, kunde, mengde, enhet, timer, rolle, prisType, fastprisSum, utstyr, notat, bilder, faktiskTimer, rabatt, tilbudGyldigTil, ansvarlig, kjoreKm, bompenger
            };
          }
          return p;
        });
        lagreLokalt(oppdatert);
        return oppdatert;
      });
    } else {
      const nytt: Prosjekt = {
        id: Date.now(),
        kunde, mengde, enhet, timer, rolle, prisType, fastprisSum, utstyr, notat, bilder, faktiskTimer, rabatt, tilbudGyldigTil, ansvarlig, kjoreKm, bompenger,
        status: 'Befaring utført',
        dato: new Date().toLocaleDateString('no-NO'),
        opprettet: new Date().toISOString(),
        varselAvvist: false,
        aktiviteter: [{
          id: Date.now(),
          tidspunkt: new Date().toLocaleString('no-NO'),
          handling: 'Sak opprettet',
          bruker: BRUKER
        }],
        hurtignotater: [],
        paminnelser: []
      };
      setProsjekter(prev => {
        const oppdatert = [nytt, ...prev];
        lagreLokalt(oppdatert);
        return oppdatert;
      });
    }
    
    setVisSkjema(false);
    resetSkjema();
  };

  const resetSkjema = () => {
    setRedigererId(null);
    setKunde(''); setMengde(0); setTimer(0); setUtstyr(0); setNotat(''); setFastprisSum(0); setBilder([]); setFaktiskTimer(0); setRabatt(0); setTilbudGyldigTil(''); setAnsvarlig('Fakturert'); setKjoreKm(0); setBompenger(0);
  };

  const slettProsjekt = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if(confirm("Slette?")) {
      setProsjekter(prev => {
        const oppdatert = prev.filter(p => p.id !== id);
        lagreLokalt(oppdatert);
        return oppdatert;
      });
    }
  };

  const flyttTilMedarbeider = (e: React.MouseEvent, prosjektId: number, nyAnsvarlig: 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert') => {
    e.stopPropagation();
    setProsjekter(prev => {
      const oppdatert = prev.map(p => p.id === prosjektId ? { ...p, ansvarlig: nyAnsvarlig } : p);
      lagreLokalt(oppdatert);
      return oppdatert;
    });
    loggAktivitet(prosjektId, `Flyttet til ${nyAnsvarlig}`);
  };

  const endreStatus = (e: React.MouseEvent, prosjektId: number, nyStatus: 'Befaring utført' | 'Tilbud levert' | 'Sak fakturert') => {
    e.stopPropagation();
    setProsjekter(prev => {
      const oppdatert = prev.map(p => {
        if (p.id === prosjektId) {
          if (nyStatus === 'Sak fakturert') {
            loggAktivitet(prosjektId, `Status: "${nyStatus}" → Fakturert`);
            return { ...p, status: nyStatus, ansvarlig: 'Fakturert' as const };
          }
          loggAktivitet(prosjektId, `Status: "${nyStatus}"`);
          return { ...p, status: nyStatus };
        }
        return p;
      });
      lagreLokalt(oppdatert);
      return oppdatert;
    });
  };

  const eksporterData = () => {
    const dataStr = JSON.stringify(prosjekter, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ocab-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importerData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importert = JSON.parse(event.target?.result as string);
        if (confirm(`Importere ${importert.length} saker?`)) {
          setProsjekter(importert);
          lagreLokalt(importert);
        }
      } catch (err) {
        alert('Ugyldig fil');
      }
    };
    reader.readAsText(file);
  };

  const beregnPris = (p: Prosjekt) => {
    const grunnlag = p.prisType === 'timespris' ? (p.timer * SATSER[p.rolle]) : p.fastprisSum;
    const kjoreTillegg = (p.kjoreKm || 0) * KM_SATS;
    const sumFørRabatt = grunnlag + p.utstyr + kjoreTillegg + (p.bompenger || 0);
    const rabattBeløp = p.rabatt ? (sumFørRabatt * p.rabatt / 100) : 0;
    const sumEksMva = sumFørRabatt - rabattBeløp;
    const mva = sumEksMva * 0.25;
    const totalInklMva = sumEksMva + mva;
    
    return { grunnlag, kjoreTillegg, sumFørRabatt, rabattBeløp, sumEksMva, mva, totalInklMva };
  };

  const genererPDF = (p: Prosjekt) => {
    const { grunnlag, kjoreTillegg, rabattBeløp, sumEksMva, mva, totalInklMva } = beregnPris(p);

    const pdfContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${OCAB_BLA};padding-bottom:20px;margin-bottom:30px}
.logo{font-size:2.5rem;font-weight:bold;color:${OCAB_BLA}}
.company-info{text-align:right;font-size:0.9rem;color:#666}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:30px 0}
.info-box{background:#f4f7f6;padding:15px;border-radius:8px}
.label{font-weight:bold;color:#555;font-size:0.9rem}
.value{font-size:1.1rem;margin-top:5px}
.total-box{background:${OCAB_BLA};color:white;padding:20px;border-radius:12px;text-align:center;margin:30px 0}
.total-label{font-size:1rem;opacity:0.9}
.total-value{font-size:2.5rem;font-weight:bold;margin-top:10px}
table{width:100%;border-collapse:collapse;margin:30px 0}
th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}
th{background:${OCAB_BLA};color:white}
.footer{margin-top:50px;text-align:center;color:#666;font-size:0.9rem}
.rabatt-row{color:#e67e22;font-weight:bold}
.signature-box{margin-top:60px;padding-top:20px;border-top:2px solid #ddd}
.signature-line{border-bottom:1px solid #333;width:300px;margin:30px auto 10px}
.signature-label{text-align:center;font-size:0.9rem;color:#666}
</style></head><body>
<div class="header"><div><div class="logo">OCAB</div><p style="color:#666;margin-top:10px">Skadedyr & Forebyggende</p></div>
<div class="company-info"><div><strong>Org.nr:</strong> ${firmaInfo.orgNr}</div><div><strong>Tlf:</strong> ${firmaInfo.telefon}</div>
<div><strong>E-post:</strong> ${firmaInfo.epost}</div><div style="margin-top:5px">${firmaInfo.adresse}</div></div></div>
<h2>Tilbud</h2><div class="info-grid"><div class="info-box"><div class="label">KUNDE</div><div class="value">${p.kunde}</div></div>
<div class="info-box"><div class="label">OPPRETTET</div><div class="value">${new Date(p.opprettet).toLocaleDateString('no-NO')}</div></div>
<div class="info-box"><div class="label">MENGDE</div><div class="value">${p.mengde} ${p.enhet}</div></div>
<div class="info-box"><div class="label">ESTIMERT TID</div><div class="value">${p.timer} timer</div></div>
<div class="info-box"><div class="label">ANSVARLIG</div><div class="value">${p.ansvarlig}</div></div>
<div class="info-box"><div class="label">STATUS</div><div class="value">${p.status}</div></div></div>
<h3>Kostnadsfordeling</h3><table><thead><tr><th>Post</th><th>Detaljer</th><th style="text-align:right">Beløp</th></tr></thead><tbody>
<tr><td>Arbeid</td><td>${p.prisType === 'timespris' ? `${p.timer} timer × ${SATSER[p.rolle]} kr (${p.rolle})` : 'Fastpris'}</td>
<td style="text-align:right">${grunnlag.toLocaleString()} kr</td></tr>
<tr><td>Utstyr & Materiell</td><td>Eks. mva</td><td style="text-align:right">${p.utstyr.toLocaleString()} kr</td></tr>
${p.kjoreKm && p.kjoreKm > 0 ? `<tr><td>Kjøregodtgjørelse</td><td>${p.kjoreKm} km × ${KM_SATS} kr/km</td><td style="text-align:right">${kjoreTillegg.toLocaleString()} kr</td></tr>` : ''}
${p.bompenger && p.bompenger > 0 ? `<tr><td>Bompenger</td><td>Dokumenterte</td><td style="text-align:right">${p.bompenger.toLocaleString()} kr</td></tr>` : ''}
${p.rabatt ? `<tr class="rabatt-row"><td>Rabatt (${p.rabatt}%)</td><td>Spesialtilbud</td><td style="text-align:right">- ${rabattBeløp.toLocaleString()} kr</td></tr>` : ''}
<tr><td><strong>Sum eks. mva</strong></td><td></td><td style="text-align:right"><strong>${sumEksMva.toLocaleString()} kr</strong></td></tr>
<tr><td>MVA (25%)</td><td></td><td style="text-align:right">${mva.toLocaleString()} kr</td></tr></tbody></table>
<div class="total-box"><div class="total-label">TOTALT INKL. MVA</div><div class="total-value">${totalInklMva.toLocaleString()} kr</div></div>
${p.notat ? `<div style="background:#f4f7f6;padding:20px;border-radius:8px;margin:30px 0"><div class="label">NOTATER</div><div style="margin-top:10px;white-space:pre-wrap">${p.notat}</div></div>` : ''}
<div class="signature-box"><h3>Aksept av tilbud</h3><p>Ved å signere aksepterer kunde pris og betingelser.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px"><div><div class="signature-line"></div>
<div class="signature-label">Kundens signatur</div></div><div><div class="signature-line"></div><div class="signature-label">Dato</div></div></div></div>
<div class="footer"><p><strong>OCAB - Skadedyr & Forebyggende</strong></p><p>Generert ${new Date().toLocaleDateString('no-NO')}</p>
<p style="margin-top:20px;font-size:0.8rem">Forbehold om feil. Endelig pris etter befaring.<br>Betaling: 14 dager netto. Renter ved forsinkelse.</p></div>
</body></html>`;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tilbud-${p.kunde.replace(/\s+/g, '-')}-${p.dato}.html`;
    link.click();
    
    loggAktivitet(p.id, 'PDF generert');
  };

  const filtrerteProsjekter = prosjekter
    .filter(p => {
      const matchSok = p.kunde.toLowerCase().includes(sokeTekst.toLowerCase()) || 
                      p.notat.toLowerCase().includes(sokeTekst.toLowerCase());
      const matchStatus = filterStatus === 'alle' || p.status === filterStatus;
      const matchMedarbeider = aktivMedarbeider === 'alle' || p.ansvarlig === aktivMedarbeider;
      return matchSok && matchStatus && matchMedarbeider;
    })
    .sort((a, b) => {
      if (sortering === 'dato') return b.id - a.id;
      if (sortering === 'pris') {
        const prisA = beregnPris(a).totalInklMva;
        const prisB = beregnPris(b).totalInklMva;
        return prisB - prisA;
      }
      return a.status.localeCompare(b.status);
    });

  const medarbeiderStats = (medarbeider: string) => {
    const saker = prosjekter.filter(p => p.ansvarlig === medarbeider);
    const antall = saker.length;
    const omsetning = saker.reduce((sum, p) => sum + beregnPris(p).totalInklMva, 0);
    return { antall, omsetning };
  };

  const totaltAntall = prosjekter.length;
  const totalOmsetning = prosjekter.reduce((sum, p) => sum + beregnPris(p).totalInklMva, 0);
  const gjennomsnittsPris = totaltAntall > 0 ? totalOmsetning / totaltAntall : 0;

  const avansertStats = beregnAvansertStats();

  // Resten av koden fortsetter i neste del pga lengde...
  // (Main app JSX kommer her - dette er fil 1 av 2)
  
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '10px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem', color: OCAB_BLA, fontWeight: '800', margin: 0 }}>OCAB PRO</h1>
            <p style={{ margin: 0, fontSize: '0.65rem', color: '#666' }}>Alle 8 bonusfunksjoner • Lagres lokalt</p>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setVisFirmaRedigering(!visFirmaRedigering)} style={{ ...tinyBtn, backgroundColor: '#9333ea' }}>⚙️</button>
            <button onClick={() => setVisStatistikk(!visStatistikk)} style={{ ...tinyBtn, backgroundColor: visStatistikk ? OCAB_BLA : '#666' }}>📊</button>
            <button onClick={() => setVisMalListe(!visMalListe)} style={{ ...tinyBtn, backgroundColor: '#f59e0b' }}>🎨</button>
            <button onClick={() => setBulkModus(!bulkModus)} style={{ ...tinyBtn, backgroundColor: bulkModus ? '#ef4444' : '#8b5cf6' }}>
              {bulkModus ? `✓ ${antallValgte}` : '☑️'}
            </button>
            <button onClick={() => { visSkjema ? resetSkjema() : null; setVisSkjema(!visSkjema); }} style={{ ...mainBtn, backgroundColor: OCAB_BLA, padding: '6px 10px' }}>
              {visSkjema ? '✕' : '+'}
            </button>
          </div>
        </div>

        {/* BULK PANEL */}
        {bulkModus && antallValgte > 0 && (
          <div style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>{antallValgte} valgt</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => bulkEndreStatus('Befaring utført')} style={{ ...tinyBtn, backgroundColor: STATUS_COLORS['Befaring utført'].border, flex: 1, minWidth: '80px' }}>📋 Befaring</button>
              <button onClick={() => bulkEndreStatus('Tilbud levert')} style={{ ...tinyBtn, backgroundColor: OCAB_BLA, flex: 1, minWidth: '80px' }}>📨 Tilbud</button>
              <button onClick={() => bulkEndreStatus('Sak fakturert')} style={{ ...tinyBtn, backgroundColor: STATUS_COLORS['Sak fakturert'].border, flex: 1, minWidth: '80px' }}>💰 Fakt</button>
              <button onClick={() => bulkFlyttTil('Alexander')} style={{ ...tinyBtn, backgroundColor: MEDARBEIDER_COLORS.Alexander }}>Alexander</button>
              <button onClick={() => bulkFlyttTil('Ståle')} style={{ ...tinyBtn, backgroundColor: MEDARBEIDER_COLORS.Ståle }}>Ståle</button>
              <button onClick={() => bulkFlyttTil('Baard')} style={{ ...tinyBtn, backgroundColor: MEDARBEIDER_COLORS.Baard }}>Baard</button>
              <button onClick={bulkSlett} style={{ ...tinyBtn, backgroundColor: '#ef4444' }}>🗑️ Slett</button>
            </div>
          </div>
        )}

        {/* MALL LISTE */}
        {visMalListe && (
          <div style={{ backgroundColor: '#fef3c7', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🎨 Maler</div>
              <button onClick={() => setVisMalListe(false)} style={{ ...tinyBtn, backgroundColor: '#666' }}>✕</button>
            </div>
            {maler.length === 0 ? (
              <div style={{ fontSize: '0.7rem', color: '#666' }}>Ingen maler ennå. Opprett sak → velg "Lagre som mal"</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {maler.map(mal => (
                  <div key={mal.id} style={{ backgroundColor: 'white', padding: '6px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.7rem' }}>
                      <div style={{ fontWeight: 'bold' }}>{mal.navn}</div>
                      <div style={{ color: '#666' }}>{mal.timer}t • {mal.mengde}{mal.enhet} • {mal.utstyr}kr</div>
                    </div>
                    <button onClick={() => opprettFraMal(mal)} style={{ ...tinyBtn, backgroundColor: OCAB_BLA }}>Bruk</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIRMA REDIGERING */}
        {visFirmaRedigering && (
          <div style={{ backgroundColor: '#f9f9f9', padding: '8px', borderRadius: '6px', marginBottom: '8px', border: '1px solid #9333ea' }}>
            <h3 style={{ marginTop: 0, color: '#9333ea', fontSize: '0.85rem' }}>⚙️ Firma</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input placeholder="Org.nr" style={compactInput} value={firmaInfo.orgNr} onChange={e => setFirmaInfo({...firmaInfo, orgNr: e.target.value})} />
              <input placeholder="Tlf" style={compactInput} value={firmaInfo.telefon} onChange={e => setFirmaInfo({...firmaInfo, telefon: e.target.value})} />
              <input placeholder="E-post" style={compactInput} value={firmaInfo.epost} onChange={e => setFirmaInfo({...firmaInfo, epost: e.target.value})} />
              <input placeholder="Adresse" style={compactInput} value={firmaInfo.adresse} onChange={e => setFirmaInfo({...firmaInfo, adresse: e.target.value})} />
            </div>
            <button onClick={lagreFirmaInfo} style={{ ...mainBtn, backgroundColor: '#9333ea', marginTop: '6px', width: '100%', padding: '6px' }}>💾 Lagre</button>
          </div>
        )}

        {/* MEDARBEIDER BOKSER - KOMPAKTE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '5px', marginBottom: '8px' }}>
          {[
            { key: 'alle', label: 'Alle', count: totaltAntall, color: OCAB_BLA },
            { key: 'Alexander', label: 'Alex.', count: medarbeiderStats('Alexander').antall, color: MEDARBEIDER_COLORS.Alexander },
            { key: 'Ståle', label: 'Ståle', count: medarbeiderStats('Ståle').antall, color: MEDARBEIDER_COLORS.Ståle },
            { key: 'Baard', label: 'Baard', count: medarbeiderStats('Baard').antall, color: MEDARBEIDER_COLORS.Baard },
            { key: 'Fakturert', label: '💰', count: medarbeiderStats('Fakturert').antall, color: MEDARBEIDER_COLORS.Fakturert }
          ].map(m => (
            <div 
              key={m.key}
              onClick={() => setAktivMedarbeider(m.key as any)} 
              style={{ 
                padding: '6px 4px',
                borderRadius: '6px',
                textAlign: 'center',
                cursor: 'pointer',
                border: `2px solid ${m.color}`,
                backgroundColor: aktivMedarbeider === m.key ? m.color : 'white',
                color: aktivMedarbeider === m.key ? 'white' : '#333',
                transition: 'all 0.2s',
                fontWeight: 'bold',
                fontSize: '0.7rem'
              }}
            >
              <div style={{ fontSize: '1rem' }}>{m.count}</div>
              <div style={{ fontSize: '0.6rem', marginTop: '1px' }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* AVANSERT STATISTIKK */}
        {visStatistikk && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '6px', marginBottom: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
            <div style={compactStatBox}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: OCAB_BLA }}>{totalOmsetning.toLocaleString()}kr</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>Omsetning</div>
            </div>
            <div style={compactStatBox}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: OCAB_BLA }}>{gjennomsnittsPris.toLocaleString()}kr</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>Snitt/sak</div>
            </div>
            <div style={compactStatBox}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2ecc71' }}>{avansertStats.conversionRate.toFixed(0)}%</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>Conversion</div>
            </div>
            <div style={compactStatBox}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e67e22' }}>{avansertStats.gjennomsnittligTid.toFixed(0)}d</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>Snitt tid</div>
            </div>
            <div style={compactStatBox}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#9333ea' }}>{avansertStats.besteMedarbeider?.navn || 'N/A'}</div>
              <div style={{ fontSize: '0.6rem', color: '#666' }}>Best ytelse</div>
            </div>
          </div>
        )}

        {/* SØK OG FILTER - KOMPAKT */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍" 
            value={sokeTekst}
            onChange={e => setSokeTekst(e.target.value)}
            style={{ flex: 1, minWidth: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.75rem' }}
          />
          <select value={sortering} onChange={e => setSortering(e.target.value as any)} style={compactSelect}>
            <option value="dato">📅</option>
            <option value="pris">💰</option>
            <option value="status">📋</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={compactSelect}>
            <option value="alle">Alle</option>
            <option value="Befaring utført">Befaring</option>
            <option value="Tilbud levert">Tilbud</option>
            <option value="Sak fakturert">Fakturert</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '5px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
          <button onClick={eksporterData} style={tinyBtn}>💾</button>
          <label style={{ ...tinyBtn, cursor: 'pointer', margin: 0 }}>
            📂
            <input type="file" accept=".json" onChange={importerData} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* SKJEMA - KOMPAKT */}
      {visSkjema && (
        <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', marginBottom: '10px', border: redigererId ? `2px solid ${OCAB_BLA}` : 'none' }}>
          <h3 style={{marginTop: 0, fontSize: '0.9rem'}}>{redigererId ? '✏️ Rediger' : '➕ Ny'}</h3>
          
          <label style={compactLabel}>Kunde</label>
          <input style={compactInput} value={kunde} onChange={e => setKunde(e.target.value)} placeholder="Navn" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
            <div>
              <label style={compactLabel}>Ansvarlig</label>
              <select style={compactInput} value={ansvarlig} onChange={e => setAnsvarlig(e.target.value as any)}>
                <option value="Fakturert">💰</option>
                <option value="Alexander">Alex</option>
                <option value="Ståle">Ståle</option>
                <option value="Baard">Baard</option>
              </select>
            </div>
            <div>
              <label style={compactLabel}>Type</label>
              <select style={compactInput} value={prisType} onChange={e => setPrisType(e.target.value as any)}>
                <option value="timespris">Time</option>
                <option value="fastpris">Fast</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
            <div>
              <label style={compactLabel}>{prisType === 'timespris' ? 'Rolle' : 'Fastpris'}</label>
              {prisType === 'timespris' ? (
                <select style={compactInput} value={rolle} onChange={e => setRolle(e.target.value as any)}>
                  <option value="tømrer">Tømrer</option>
                  <option value="ekspert">Ekspert</option>
                </select>
              ) : (
                <input type="number" style={compactInput} value={fastprisSum || ''} onChange={e => setFastprisSum(Number(e.target.value))} />
              )}
            </div>
            <div>
              <label style={compactLabel}>Timer</label>
              <input type="number" style={compactInput} value={timer || ''} onChange={e => setTimer(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '6px', marginTop: '10px' }}>
            <div>
              <label style={compactLabel}>Mengde</label>
              <div style={{ display: 'flex' }}>
                <input type="number" style={{ ...compactInput, marginTop: 0, borderRadius: '6px 0 0 6px' }} value={mengde || ''} onChange={e => setMengde(Number(e.target.value))} />
                <select style={{ ...compactSelectInline, borderRadius: '0 6px 6px 0' }} value={enhet} onChange={e => setEnhet(e.target.value)}>
                  <option>m²</option><option>m</option><option>m³</option><option>stk</option>
                </select>
              </div>
            </div>
            <div>
              <label style={compactLabel}>Utstyr</label>
              <input type="number" style={compactInput} value={utstyr || ''} onChange={e => setUtstyr(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ backgroundColor: '#f0f8ff', padding: '8px', borderRadius: '6px', marginTop: '10px', border: `1px solid ${OCAB_BLA}` }}>
            <label style={{...compactLabel, color: OCAB_BLA}}>🚗 Reise</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
              <div>
                <input type="number" style={compactInput} placeholder="Km" value={kjoreKm || ''} onChange={e => setKjoreKm(Number(e.target.value))} />
                {kjoreKm > 0 && <div style={{ fontSize: '0.6rem', color: OCAB_BLA, marginTop: '2px' }}>{(kjoreKm * KM_SATS).toLocaleString()}kr</div>}
              </div>
              <div>
                <input type="number" style={compactInput} placeholder="Bom" value={bompenger || ''} onChange={e => setBompenger(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
            <div>
              <label style={compactLabel}>Rabatt %</label>
              <input type="number" style={compactInput} value={rabatt || ''} onChange={e => setRabatt(Number(e.target.value))} max="100" />
            </div>
            <div>
              <label style={compactLabel}>Faktisk t.</label>
              <input type="number" style={compactInput} value={faktiskTimer || ''} onChange={e => setFaktiskTimer(Number(e.target.value))} />
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <label style={compactLabel}>Gyldig til</label>
            <input type="date" style={compactInput} value={tilbudGyldigTil} onChange={e => setTilbudGyldigTil(e.target.value)} />
          </div>

          <label style={{...compactLabel, marginTop: '10px'}}>Notat</label>
          <textarea style={{ ...compactInput, height: '50px', resize: 'vertical' }} value={notat} onChange={e => setNotat(e.target.value)} />
          
          <div style={{ marginTop: '10px' }}>
            <label style={compactLabel}>📷</label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...tinyBtn, width: '100%' }}>📸</button>
            
            {bilder.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '5px', marginTop: '6px' }}>
                {bilder.map((bilde, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={bilde} alt="" style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                    <button onClick={() => slettBilde(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '0.7rem' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button onClick={lagreEllerOppdater} style={{ ...mainBtn, backgroundColor: redigererId ? OCAB_BLA : '#2ecc71', flex: 1 }}>
              {redigererId ? '✅' : '💾'}
            </button>
            {!redigererId && (
              <button onClick={() => { setVisMalForm(true); lagreMal(); }} style={{ ...mainBtn, backgroundColor: '#f59e0b', flex: 1 }}>
                🎨 Lagre som mal
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '6px', color: '#666', fontSize: '0.7rem' }}>
        {filtrerteProsjekter.length} / {totaltAntall}
      </div>

      {/* SAKSKORT - ULTRA KOMPAKTE */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filtrerteProsjekter.map(p => {
          const { totalInklMva, rabattBeløp, kjoreTillegg } = beregnPris(p);
          const statusColor = STATUS_COLORS[p.status];
          const harReise = (p.kjoreKm && p.kjoreKm > 0) || (p.bompenger && p.bompenger > 0);
          const visVarsel = skalViseVarsel(p);
          const aktivePaminnelser = p.paminnelser?.filter(pam => pam.aktiv) || [];
          const kundeHist = hentKundeHistorikk(p.kunde);

          return (
            <div key={p.id}>
              {visVarsel && (
                <div style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '6px', padding: '5px 8px', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#92400e' }}>⚠️ 14+ dager</div>
                  <button onClick={(e) => avvisVarsel(e, p.id)} style={{ ...tinyBtn, backgroundColor: '#92400e', padding: '3px 6px' }}>✕</button>
                </div>
              )}

              {aktivePaminnelser.length > 0 && (
                <div style={{ backgroundColor: '#dbeafe', border: '1px solid #3b82f6', borderRadius: '6px', padding: '5px 8px', marginBottom: '3px' }}>
                  <div style={{ fontSize: '0.7rem', color: '#1e40af' }}>
                    🔔 {aktivePaminnelser[0].dato} {aktivePaminnelser[0].tid} - {aktivePaminnelser[0].melding}
                  </div>
                </div>
              )}

              <div onClick={() => apneRedigering(p)} style={{ backgroundColor: statusColor.bg, padding: '8px', borderRadius: '8px', borderLeft: `4px solid ${statusColor.border}`, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', position: 'relative' }}>
                
                {bulkModus && (
                  <input 
                    type="checkbox" 
                    checked={p.valgt || false}
                    onChange={(e) => toggleValg(e, p.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: '8px', left: '8px', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                )}

                <div style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: statusColor.border, color: 'white', padding: '2px 6px', borderRadius: '8px', fontSize: '0.6rem', fontWeight: 'bold' }}>
                  {p.status === 'Befaring utført' && '📋'} 
                  {p.status === 'Tilbud levert' && '📨'} 
                  {p.status === 'Sak fakturert' && '💰'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '5px', paddingRight: '70px', paddingLeft: bulkModus ? '24px' : '0' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1a3a3a' }}>
                      {p.kunde}
                      {kundeHist.length > 1 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setVisKundeHistorikk(visKundeHistorikk === p.kunde ? null : p.kunde); }}
                          style={{ marginLeft: '5px', background: 'none', border: 'none', color: OCAB_BLA, cursor: 'pointer', fontSize: '0.7rem' }}
                        >
                          📜 ({kundeHist.length})
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#666', marginTop: '1px' }}>
                      {new Date(p.opprettet).toLocaleDateString('no-NO')}
                    </div>
                  </div>
                </div>

                {visKundeHistorikk === p.kunde && (
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: '6px', borderRadius: '4px', marginBottom: '5px', fontSize: '0.65rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Kundehistorikk ({kundeHist.length} saker)</div>
                    {kundeHist.slice(0, 3).map(h => (
                      <div key={h.id} style={{ borderBottom: '1px solid #eee', padding: '2px 0' }}>
                        {h.dato}: {beregnPris(h).totalInklMva.toLocaleString()}kr - {h.status}
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#666', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {p.mengde > 0 && <span>{p.mengde}{p.enhet}</span>}
                    <span>⏱️{p.timer}t</span>
                    {p.bilder && p.bilder.length > 0 && <span>📷{p.bilder.length}</span>}
                    {rabattBeløp > 0 && <span style={{ color: '#e67e22' }}>🏷️{p.rabatt}%</span>}
                    {harReise && <span style={{ color: OCAB_BLA }}>🚗{kjoreTillegg.toLocaleString()}</span>}
                    <span style={{ backgroundColor: MEDARBEIDER_COLORS[p.ansvarlig], color: 'white', padding: '1px 4px', borderRadius: '6px', fontSize: '0.6rem' }}>
                      {p.ansvarlig === 'Fakturert' ? '💰' : p.ansvarlig.slice(0,3)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#1a3a3a', fontWeight: 'bold', fontSize: '0.9rem' }}>{totalInklMva.toLocaleString()}kr</div>
                  </div>
                </div>

                {p.notat && (
                  <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '5px', padding: '4px 6px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '4px', fontStyle: 'italic' }}>
                    {p.notat.substring(0, 50)}{p.notat.length > 50 ? '...' : ''}
                  </div>
                )}

                {visHurtignotat === p.id ? (
                  <div style={{ marginTop: '6px', backgroundColor: '#f0f9ff', padding: '6px', borderRadius: '6px', border: `1px solid ${OCAB_BLA}` }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                      <input 
                        type="text"
                        value={nyHurtignotat}
                        onChange={(e) => setNyHurtignotat(e.target.value)}
                        placeholder="Notat..."
                        style={{ flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.7rem' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button onClick={(e) => leggTilHurtignotat(e, p.id)} style={{ ...tinyBtn, backgroundColor: OCAB_BLA }}>+</button>
                      <button onClick={(e) => { e.stopPropagation(); setVisHurtignotat(null); setNyHurtignotat(''); }} style={{ ...tinyBtn, backgroundColor: '#666' }}>✕</button>
                    </div>
                    {p.hurtignotater && p.hurtignotater.length > 0 && (
                      <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
                        {p.hurtignotater.slice(0,3).map(notat => (
                          <div key={notat.id} style={{ backgroundColor: 'white', padding: '4px', borderRadius: '3px', marginBottom: '3px', fontSize: '0.6rem' }}>
                            <div style={{ color: '#666', fontSize: '0.55rem' }}>{notat.tidspunkt}</div>
                            <div>{notat.tekst}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  p.hurtignotater && p.hurtignotater.length > 0 && (
                    <div style={{ marginTop: '5px', fontSize: '0.6rem', color: '#666' }}>
                      💬 {p.hurtignotater.length}
                    </div>
                  )
                )}

                {visAktivitet === p.id && p.aktiviteter && p.aktiviteter.length > 0 && (
                  <div style={{ marginTop: '6px', backgroundColor: '#f9f9f9', padding: '6px', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {p.aktiviteter.slice(0,5).map(akt => (
                      <div key={akt.id} style={{ backgroundColor: 'white', padding: '4px', borderRadius: '3px', marginBottom: '3px', fontSize: '0.6rem', borderLeft: '2px solid #e5e7eb' }}>
                        <div style={{ color: '#666', fontSize: '0.55rem' }}>{akt.tidspunkt}</div>
                        <div>{akt.handling}</div>
                      </div>
                    ))}
                  </div>
                )}

                {visPaminnelseForm === p.id && (
                  <div style={{ marginTop: '6px', backgroundColor: '#eff6ff', padding: '6px', borderRadius: '6px', border: `1px solid ${OCAB_BLA}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                      <input type="date" value={nyPaminnelse.dato} onChange={e => setNyPaminnelse({...nyPaminnelse, dato: e.target.value})} style={compactInput} onClick={(e) => e.stopPropagation()} />
                      <input type="time" value={nyPaminnelse.tid} onChange={e => setNyPaminnelse({...nyPaminnelse, tid: e.target.value})} style={compactInput} onClick={(e) => e.stopPropagation()} />
                    </div>
                    <input type="text" placeholder="Melding" value={nyPaminnelse.melding} onChange={e => setNyPaminnelse({...nyPaminnelse, melding: e.target.value})} style={compactInput} onClick={(e) => e.stopPropagation()} />
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button onClick={(e) => leggTilPaminnelse(e, p.id)} style={{ ...tinyBtn, backgroundColor: OCAB_BLA, flex: 1 }}>Lagre</button>
                      <button onClick={(e) => { e.stopPropagation(); setVisPaminnelseForm(null); }} style={{ ...tinyBtn, backgroundColor: '#666', flex: 1 }}>Avbryt</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                  {[
                    { status: 'Befaring utført', emoji: '📋', tekst: 'Befaring' },
                    { status: 'Tilbud levert', emoji: '📨', tekst: 'Tilbud' },
                    { status: 'Sak fakturert', emoji: '💰', tekst: 'Fakt' }
                  ].map((s) => (
                    <button 
                      key={s.status} 
                      onClick={(e) => endreStatus(e, p.id, s.status as any)}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.6rem', 
                        padding: '5px 2px', 
                        borderRadius: '4px', 
                        border: `1px solid ${STATUS_COLORS[s.status as keyof typeof STATUS_COLORS].border}`, 
                        backgroundColor: p.status === s.status ? STATUS_COLORS[s.status as keyof typeof STATUS_COLORS].border : 'white', 
                        color: p.status === s.status ? 'white' : '#666',
                        cursor: 'pointer',
                        fontWeight: p.status === s.status ? 'bold' : 'normal'
                      }}
                    >
                      {s.emoji}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '3px', marginTop: '5px' }}>
                  <span style={{ fontSize: '0.6rem', color: '#666', padding: '3px 0' }}>→</span>
                  {['Alexander', 'Ståle', 'Baard', 'Fakturert'].map((person) => (
                    <button 
                      key={person}
                      onClick={(e) => flyttTilMedarbeider(e, p.id, person as any)}
                      disabled={p.ansvarlig === person}
                      style={{ 
                        flex: 1,
                        fontSize: '0.6rem', 
                        padding: '3px', 
                        borderRadius: '4px', 
                        border: 'none',
                        backgroundColor: p.ansvarlig === person ? '#ddd' : MEDARBEIDER_COLORS[person as keyof typeof MEDARBEIDER_COLORS],
                        color: 'white',
                        cursor: p.ansvarlig === person ? 'default' : 'pointer',
                        opacity: p.ansvarlig === person ? 0.5 : 1
                      }}>
                      {person === 'Fakturert' ? '💰' : person.slice(0,3)}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '3px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button onClick={(e) => { e.stopPropagation(); genererPDF(p); }} style={{ ...compactActionBtn, backgroundColor: OCAB_BLA }}>📄</button>
                  <button onClick={(e) => { e.stopPropagation(); dupliserSak(e, p); }} style={{ ...compactActionBtn, backgroundColor: '#9333ea' }}>📋</button>
                  <button onClick={(e) => { e.stopPropagation(); setVisHurtignotat(visHurtignotat === p.id ? null : p.id); }} style={{ ...compactActionBtn, backgroundColor: '#0ea5e9' }}>💬</button>
                  <button onClick={(e) => { e.stopPropagation(); setVisAktivitet(visAktivitet === p.id ? null : p.id); }} style={{ ...compactActionBtn, backgroundColor: '#64748b' }}>📊</button>
                  <button onClick={(e) => { e.stopPropagation(); setVisPaminnelseForm(visPaminnelseForm === p.id ? null : p.id); }} style={{ ...compactActionBtn, backgroundColor: '#f59e0b' }}>🔔</button>
                  <button onClick={(e) => slettProsjekt(e, p.id)} style={{ ...compactActionBtn, backgroundColor: '#ef4444' }}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}

        {filtrerteProsjekter.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: '#999' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
            <div style={{ fontSize: '0.8rem' }}>Ingen saker</div>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', marginTop: '20px', padding: '10px', color: '#999', fontSize: '0.6rem' }}>
        <div>OCAB PRO v8.1</div>
        <div style={{ marginTop: '3px' }}>Alle 8 bonus • Lagres lokalt • Mobil-opt.</div>
      </footer>
    </div>
  );
}

// KOMPAKTE STYLES
const compactInput = { width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '3px', fontSize: '0.75rem', boxSizing: 'border-box' as 'border-box' };
const compactSelect = { padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.7rem', cursor: 'pointer', backgroundColor: 'white' };
const compactSelectInline = { padding: '6px 8px', border: '1px solid #ddd', borderLeft: 'none', backgroundColor: '#eee' };
const compactLabel = { fontSize: '0.65rem', fontWeight: 'bold' as 'bold', color: '#555', display: 'block' };
const mainBtn = { color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' };
const tinyBtn = { backgroundColor: '#666', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '5px', fontSize: '0.7rem', cursor: 'pointer' };
const compactStatBox = { backgroundColor: '#f9f9f9', padding: '6px', borderRadius: '6px', textAlign: 'center' as 'center' };
const compactActionBtn = { flex: 1, minWidth: '30px', padding: '4px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' };