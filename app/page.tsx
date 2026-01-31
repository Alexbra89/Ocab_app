"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase konfigurasjon
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  opprettet: string; // Når saken ble opprettet
  bilder: string[];
  faktiskTimer?: number;
  rabatt?: number;
  tilbudGyldigTil?: string;
  ansvarlig: 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert';
  kjoreKm?: number;
  bompenger?: number;
  varselAvvist?: boolean; // Om brukeren har avvist 14-dagers varselet
}

interface FirmaInfo {
  orgNr: string;
  telefon: string;
  epost: string;
  adresse: string;
}

export default function OcabProV8() {
  // ===== AUTENTISERING STATES =====
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [laster, setLaster] = useState(true);

  // ===== FIRMA INFO STATE =====
  const [firmaInfo, setFirmaInfo] = useState<FirmaInfo>({
    orgNr: '123 456 789',
    telefon: '+47 123 45 678',
    epost: 'post@ocab.no',
    adresse: 'Gateveien 1, 0123 Oslo'
  });
  const [visFirmaRedigering, setVisFirmaRedigering] = useState(false);

  // ===== EKSISTERENDE APP STATES =====
  const [prosjekter, setProsjekter] = useState<Prosjekt[]>([]);
  const [visSkjema, setVisSkjema] = useState(false);
  const [redigererId, setRedigererId] = useState<number | null>(null);
  const [visStatistikk, setVisStatistikk] = useState(false);
  const [aktivMedarbeider, setAktivMedarbeider] = useState<'alle' | 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert'>('alle');
  
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

  // ===== AUTENTISERING LOGIKK =====
  useEffect(() => {
    const sjekkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLaster(false);
    };
    sjekkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Feil ved innlogging: " + error.message);
    } else {
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // ===== DATA PERSISTENS =====
  useEffect(() => {
    const lagret = localStorage.getItem('ocab_v8_data');
    const lagretFirma = localStorage.getItem('ocab_firma_info');
    
    if (lagret) setProsjekter(JSON.parse(lagret));
    if (lagretFirma) setFirmaInfo(JSON.parse(lagretFirma));
  }, []);

  useEffect(() => {
    localStorage.setItem('ocab_v8_data', JSON.stringify(prosjekter));
  }, [prosjekter]);

  useEffect(() => {
    localStorage.setItem('ocab_firma_info', JSON.stringify(firmaInfo));
  }, [firmaInfo]);

  // ===== FIRMA INFO FUNKSJONER =====
  const lagreFirmaInfo = () => {
    setVisFirmaRedigering(false);
    alert('Firmainfo lagret! Dette vil vises i alle nye PDF-tilbud.');
  };

  // ===== VARSEL-LOGIKK (14 dager) =====
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
    setProsjekter(prosjekter.map(p => 
      p.id === prosjektId ? { ...p, varselAvvist: true } : p
    ));
  };

  // ===== PROSJEKT FUNKSJONER =====
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
      setProsjekter(prosjekter.map(p => p.id === redigererId ? {
        ...p, kunde, mengde, enhet, timer, rolle, prisType, fastprisSum, utstyr, notat, bilder, faktiskTimer, rabatt, tilbudGyldigTil, ansvarlig, kjoreKm, bompenger
      } : p));
    } else {
      const nytt: Prosjekt = {
        id: Date.now(),
        kunde, mengde, enhet, timer, rolle, prisType, fastprisSum, utstyr, notat, bilder, faktiskTimer, rabatt, tilbudGyldigTil, ansvarlig, kjoreKm, bompenger,
        status: 'Befaring utført',
        dato: new Date().toLocaleDateString('no-NO'),
        opprettet: new Date().toISOString(),
        varselAvvist: false
      };
      setProsjekter([nytt, ...prosjekter]);
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
    if(confirm("Slette denne saken permanent?")) {
      setProsjekter(prosjekter.filter(p => p.id !== id));
    }
  };

  const flyttTilMedarbeider = (e: React.MouseEvent, prosjektId: number, nyAnsvarlig: 'Alexander' | 'Ståle' | 'Baard' | 'Fakturert') => {
    e.stopPropagation();
    setProsjekter(prosjekter.map(p => p.id === prosjektId ? { ...p, ansvarlig: nyAnsvarlig } : p));
  };

  const endreStatus = (e: React.MouseEvent, prosjektId: number, nyStatus: 'Befaring utført' | 'Tilbud levert' | 'Sak fakturert') => {
    e.stopPropagation();
    setProsjekter(prosjekter.map(p => {
      if (p.id === prosjektId) {
        // Automatisk flytt til "Fakturert" når status blir "Sak fakturert"
        if (nyStatus === 'Sak fakturert') {
          return { ...p, status: nyStatus, ansvarlig: 'Fakturert' };
        }
        return { ...p, status: nyStatus };
      }
      return p;
    }));
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

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${OCAB_BLA}; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 2.5rem; font-weight: bold; color: ${OCAB_BLA}; }
    .company-info { text-align: right; font-size: 0.9rem; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
    .info-box { background: #f4f7f6; padding: 15px; border-radius: 8px; }
    .label { font-weight: bold; color: #555; font-size: 0.9rem; }
    .value { font-size: 1.1rem; margin-top: 5px; }
    .total-box { background: ${OCAB_BLA}; color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0; }
    .total-label { font-size: 1rem; opacity: 0.9; }
    .total-value { font-size: 2.5rem; font-weight: bold; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: ${OCAB_BLA}; color: white; }
    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9rem; }
    .rabatt-row { color: #e67e22; font-weight: bold; }
    .gyldig-til { background: #fff3cd; padding: 10px; border-radius: 8px; text-align: center; margin: 20px 0; border: 2px solid #ffc107; }
    .signature-box { margin-top: 60px; padding-top: 20px; border-top: 2px solid #ddd; }
    .signature-line { border-bottom: 1px solid #333; width: 300px; margin: 30px auto 10px; }
    .signature-label { text-align: center; font-size: 0.9rem; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">OCAB</div>
      <p style="color: #666; margin-top: 10px;">Skadedyr & Forebyggende</p>
    </div>
    <div class="company-info">
      <div><strong>Org.nr:</strong> ${firmaInfo.orgNr}</div>
      <div><strong>Tlf:</strong> ${firmaInfo.telefon}</div>
      <div><strong>E-post:</strong> ${firmaInfo.epost}</div>
      <div style="margin-top: 5px;">${firmaInfo.adresse}</div>
    </div>
  </div>

  <h2>Tilbud</h2>
  
  <div class="info-grid">
    <div class="info-box">
      <div class="label">KUNDE</div>
      <div class="value">${p.kunde}</div>
    </div>
    <div class="info-box">
      <div class="label">OPPRETTET</div>
      <div class="value">${new Date(p.opprettet).toLocaleDateString('no-NO')}</div>
    </div>
    <div class="info-box">
      <div class="label">MENGDE</div>
      <div class="value">${p.mengde} ${p.enhet}</div>
    </div>
    <div class="info-box">
      <div class="label">ESTIMERT TID</div>
      <div class="value">${p.timer} timer</div>
    </div>
    <div class="info-box">
      <div class="label">ANSVARLIG</div>
      <div class="value">${p.ansvarlig}</div>
    </div>
    <div class="info-box">
      <div class="label">STATUS</div>
      <div class="value">${p.status}</div>
    </div>
  </div>

  ${p.tilbudGyldigTil ? `
  <div class="gyldig-til">
    <strong>⚠️ Tilbudet er gyldig til: ${new Date(p.tilbudGyldigTil).toLocaleDateString('no-NO')}</strong>
  </div>
  ` : ''}

  <h3>Kostnadsfordeling</h3>
  <table>
    <thead>
      <tr>
        <th>Post</th>
        <th>Detaljer</th>
        <th style="text-align: right;">Beløp</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Arbeid</td>
        <td>${p.prisType === 'timespris' ? `${p.timer} timer × ${SATSER[p.rolle]} kr (${p.rolle})` : 'Fastpris'}</td>
        <td style="text-align: right;">${grunnlag.toLocaleString()} kr</td>
      </tr>
      <tr>
        <td>Utstyr & Materiell</td>
        <td>Eks. mva</td>
        <td style="text-align: right;">${p.utstyr.toLocaleString()} kr</td>
      </tr>
      ${p.kjoreKm && p.kjoreKm > 0 ? `
      <tr>
        <td>Kjøregodtgjørelse</td>
        <td>${p.kjoreKm} km × ${KM_SATS} kr/km</td>
        <td style="text-align: right;">${kjoreTillegg.toLocaleString()} kr</td>
      </tr>
      ` : ''}
      ${p.bompenger && p.bompenger > 0 ? `
      <tr>
        <td>Bompenger</td>
        <td>Dokumenterte bompasseringer</td>
        <td style="text-align: right;">${p.bompenger.toLocaleString()} kr</td>
      </tr>
      ` : ''}
      ${p.rabatt ? `
      <tr class="rabatt-row">
        <td>Rabatt (${p.rabatt}%)</td>
        <td>Spesialtilbud</td>
        <td style="text-align: right;">- ${rabattBeløp.toLocaleString()} kr</td>
      </tr>
      ` : ''}
      <tr>
        <td><strong>Sum eks. mva</strong></td>
        <td></td>
        <td style="text-align: right;"><strong>${sumEksMva.toLocaleString()} kr</strong></td>
      </tr>
      <tr>
        <td>MVA (25%)</td>
        <td></td>
        <td style="text-align: right;">${mva.toLocaleString()} kr</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-label">TOTALT INKL. MVA</div>
    <div class="total-value">${totalInklMva.toLocaleString()} kr</div>
  </div>

  ${p.notat ? `
  <div style="background: #f4f7f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
    <div class="label">NOTATER</div>
    <div style="margin-top: 10px; white-space: pre-wrap;">${p.notat}</div>
  </div>
  ` : ''}

  <div class="signature-box">
    <h3>Aksept av tilbud</h3>
    <p>Ved å signere dette dokumentet aksepterer kunde ovennevnte pris og betingelser.</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px;">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Kundens signatur</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Dato</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p><strong>OCAB - Skadedyr & Forebyggende</strong></p>
    <p>Generert ${new Date().toLocaleDateString('no-NO')}</p>
    <p style="margin-top: 20px; font-size: 0.8rem;">
      Vi tar forbehold om feil i kalkulasjonen. Endelig pris fastsettes etter befaring.<br>
      Betalingsbetingelser: 14 dager netto. Ved forsinket betaling påløper renter etter lov.
    </p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tilbud-${p.kunde.replace(/\s+/g, '-')}-${p.dato}.html`;
    link.click();
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

  // ===== LOADING STATE =====
  if (laster) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', color: OCAB_BLA }}>OCAB</div>
          <div style={{ marginTop: '20px', color: '#666' }}>Laster...</div>
        </div>
      </div>
    );
  }

  // ===== LOGIN SCREEN =====
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        backgroundColor: '#f3f4f6', 
        padding: '20px' 
      }}>
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', color: OCAB_BLA, margin: 0 }}>OCAB</h1>
          <p style={{ color: '#666', marginTop: '10px' }}>Skadedyr & Forebyggende</p>
        </div>
        
        <form onSubmit={handleLogin} style={{ 
          padding: '40px', 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 10px 15px rgba(0,0,0,0.1)', 
          width: '100%', 
          maxWidth: '400px' 
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '24px', 
            color: '#1f2937', 
            fontWeight: 'bold' 
          }}>
            Logg inn
          </h2>
          
          <input 
            type="email" 
            placeholder="E-post" 
            required
            value={email}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '12px', 
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              color: 'black',
              fontSize: '1rem'
            }} 
            onChange={e => setEmail(e.target.value)} 
          />
          
          <input 
            type="password" 
            placeholder="Passord" 
            required
            value={password}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginBottom: '24px', 
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              color: 'black',
              fontSize: '1rem'
            }} 
            onChange={e => setPassword(e.target.value)} 
          />
          
          <button 
            type="submit" 
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: OCAB_BLA, 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Logg inn
          </button>
        </form>
      </div>
    );
  }

  // ===== MAIN APP =====
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '15px', backgroundColor: '#f4f7f6', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      <header style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', color: OCAB_BLA, fontWeight: '800', margin: 0 }}>OCAB</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Skadedyr & Forebyggende</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>{user.email}</span>
            <button onClick={() => setVisFirmaRedigering(!visFirmaRedigering)} style={{ ...smallBtnStyle, backgroundColor: '#9333ea' }}>
              ⚙️ Firma
            </button>
            <button onClick={handleLogout} style={{ ...smallBtnStyle, backgroundColor: '#dc2626' }}>
              Logg ut
            </button>
            <button onClick={() => setVisStatistikk(!visStatistikk)} style={{ ...smallBtnStyle, backgroundColor: visStatistikk ? OCAB_BLA : '#666' }}>
              📊 Stats
            </button>
            <button onClick={() => { visSkjema ? resetSkjema() : null; setVisSkjema(!visSkjema); }} style={{ ...mainBtnStyle, backgroundColor: OCAB_BLA }}>
              {visSkjema ? 'Avbryt' : '+ Ny'}
            </button>
          </div>
        </div>

        {/* Firma info redigering */}
        {visFirmaRedigering && (
          <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '2px solid #9333ea' }}>
            <h3 style={{ marginTop: 0, color: '#9333ea' }}>⚙️ Rediger firmainformasjon (vises i PDF)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Org.nr</label>
                <input style={inputStyle} value={firmaInfo.orgNr} onChange={e => setFirmaInfo({...firmaInfo, orgNr: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input style={inputStyle} value={firmaInfo.telefon} onChange={e => setFirmaInfo({...firmaInfo, telefon: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>E-post</label>
                <input style={inputStyle} value={firmaInfo.epost} onChange={e => setFirmaInfo({...firmaInfo, epost: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Adresse</label>
                <input style={inputStyle} value={firmaInfo.adresse} onChange={e => setFirmaInfo({...firmaInfo, adresse: e.target.value})} />
              </div>
            </div>
            <button onClick={lagreFirmaInfo} style={{ ...mainBtnStyle, backgroundColor: '#9333ea', marginTop: '10px' }}>
              💾 Lagre firmainfo
            </button>
          </div>
        )}

        {/* Medarbeider-bokser */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '15px' }}>
          <div 
            onClick={() => setAktivMedarbeider('alle')} 
            style={{ 
              ...medarbeiderBoxStyle, 
              backgroundColor: aktivMedarbeider === 'alle' ? OCAB_BLA : '#f9f9f9',
              color: aktivMedarbeider === 'alle' ? 'white' : '#333',
              borderColor: OCAB_BLA
            }}
          >
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{totaltAntall}</div>
            <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>Alle saker</div>
          </div>
          
          {['Alexander', 'Ståle', 'Baard'].map((person) => {
            const stats = medarbeiderStats(person);
            return (
              <div 
                key={person}
                onClick={() => setAktivMedarbeider(person as any)} 
                style={{ 
                  ...medarbeiderBoxStyle, 
                  backgroundColor: aktivMedarbeider === person ? MEDARBEIDER_COLORS[person as keyof typeof MEDARBEIDER_COLORS] : '#f9f9f9',
                  color: aktivMedarbeider === person ? 'white' : '#333',
                  borderColor: MEDARBEIDER_COLORS[person as keyof typeof MEDARBEIDER_COLORS]
                }}
              >
                <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{stats.antall}</div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>{person}</div>
                {visStatistikk && <div style={{ fontSize: '0.65rem', marginTop: '2px', opacity: 0.9 }}>{stats.omsetning.toLocaleString()} kr</div>}
              </div>
            );
          })}

          <div 
            onClick={() => setAktivMedarbeider('Fakturert')} 
            style={{ 
              ...medarbeiderBoxStyle, 
              backgroundColor: aktivMedarbeider === 'Fakturert' ? '#95a5a6' : '#f9f9f9',
              color: aktivMedarbeider === 'Fakturert' ? 'white' : '#333',
              borderColor: '#95a5a6'
            }}
          >
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{medarbeiderStats('Fakturert').antall}</div>
            <div style={{ fontSize: '0.7rem', marginTop: '2px' }}>💰 Fakturert</div>
          </div>
        </div>

        {visStatistikk && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <div style={statBoxStyle}>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: OCAB_BLA }}>{totalOmsetning.toLocaleString()} kr</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Total omsetning</div>
            </div>
            <div style={statBoxStyle}>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: OCAB_BLA }}>{gjennomsnittsPris.toLocaleString()} kr</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Snitt per sak</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="🔍 Søk..." 
            value={sokeTekst}
            onChange={e => setSokeTekst(e.target.value)}
            style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem' }}
          />
          <select value={sortering} onChange={e => setSortering(e.target.value as any)} style={filterSelectStyle}>
            <option value="dato">📅 Nyeste</option>
            <option value="pris">💰 Høyeste pris</option>
            <option value="status">📋 Status</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={filterSelectStyle}>
            <option value="alle">Alle statuser</option>
            <option value="Befaring utført">Befaring utført</option>
            <option value="Tilbud levert">Tilbud levert</option>
            <option value="Sak fakturert">Sak fakturert</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
          <button onClick={eksporterData} style={smallBtnStyle}>💾 Backup</button>
          <label style={{ ...smallBtnStyle, cursor: 'pointer', margin: 0 }}>
            📂 Importer
            <input type="file" accept=".json" onChange={importerData} style={{ display: 'none' }} />
          </label>
        </div>
      </header>

      {visSkjema && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '20px', border: redigererId ? `2px solid ${OCAB_BLA}` : 'none' }}>
          <h3 style={{marginTop: 0}}>{redigererId ? '✏️ Rediger sak' : '➕ Ny sak'}</h3>
          
          <label style={labelStyle}>Kunde / Adresse</label>
          <input style={inputStyle} value={kunde} onChange={e => setKunde(e.target.value)} placeholder="Navn eller adresse" />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
            <div>
              <label style={labelStyle}>Ansvarlig</label>
              <select style={inputStyle} value={ansvarlig} onChange={e => setAnsvarlig(e.target.value as any)}>
                <option value="Fakturert">💰 Fakturert</option>
                <option value="Alexander">Alexander</option>
                <option value="Ståle">Ståle</option>
                <option value="Baard">Baard</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prismodell</label>
              <select style={inputStyle} value={prisType} onChange={e => setPrisType(e.target.value as any)}>
                <option value="timespris">⏱️ Timespris</option>
                <option value="fastpris">💰 Fastpris</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
            <div>
              <label style={labelStyle}>{prisType === 'timespris' ? 'Rolle' : 'Fastpris (kr)'}</label>
              {prisType === 'timespris' ? (
                <select style={inputStyle} value={rolle} onChange={e => setRolle(e.target.value as any)}>
                  <option value="tømrer">🔨 Tømrer (750,-)</option>
                  <option value="ekspert">⭐ Ekspert (900,-)</option>
                </select>
              ) : (
                <input type="number" style={inputStyle} value={fastprisSum || ''} onChange={e => setFastprisSum(Number(e.target.value))} placeholder="0" />
              )}
            </div>
            <div>
              <label style={labelStyle}>Estimert timer</label>
              <input type="number" style={inputStyle} value={timer || ''} onChange={e => setTimer(Number(e.target.value))} placeholder="0" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
            <div>
              <label style={labelStyle}>Mengde (info)</label>
              <div style={{ display: 'flex' }}>
                <input type="number" style={{ ...inputStyle, marginTop: 0, borderRadius: '8px 0 0 8px' }} value={mengde || ''} onChange={e => setMengde(Number(e.target.value))} placeholder="0" />
                <select style={selectStyle} value={enhet} onChange={e => setEnhet(e.target.value)}>
                  <option>m²</option><option>meter</option><option>m³</option><option>stk</option>
                </select>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#999', marginTop: '3px' }}>Kun informasjon, påvirker ikke pris</div>
            </div>
            <div>
              <label style={labelStyle}>Utstyr / Materiell (eks mva)</label>
              <input type="number" style={inputStyle} value={utstyr || ''} onChange={e => setUtstyr(Number(e.target.value))} placeholder="0" />
            </div>
          </div>

          {/* Kjøregodtgjørelse og bompenger */}
          <div style={{ backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px', marginTop: '15px', border: `1px solid ${OCAB_BLA}` }}>
            <label style={{...labelStyle, color: OCAB_BLA, marginBottom: '10px'}}>🚗 Reisekostnader</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div>
                <label style={labelStyle}>Kjørt distanse (km)</label>
                <input type="number" style={inputStyle} value={kjoreKm || ''} onChange={e => setKjoreKm(Number(e.target.value))} placeholder="0" />
                <div style={{ fontSize: '0.65rem', color: OCAB_BLA, marginTop: '3px' }}>
                  {kjoreKm > 0 && `= ${(kjoreKm * KM_SATS).toLocaleString()} kr (${KM_SATS} kr/km)`}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Bompenger (kr)</label>
                <input type="number" style={inputStyle} value={bompenger || ''} onChange={e => setBompenger(Number(e.target.value))} placeholder="0" />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '15px' }}>
            <div>
              <label style={labelStyle}>Rabatt (%)</label>
              <input type="number" style={inputStyle} value={rabatt || ''} onChange={e => setRabatt(Number(e.target.value))} placeholder="0" max="100" />
            </div>
            <div>
              <label style={labelStyle}>Faktisk timer (valgfritt)</label>
              <input type="number" style={inputStyle} value={faktiskTimer || ''} onChange={e => setFaktiskTimer(Number(e.target.value))} placeholder="Etter jobb" />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={labelStyle}>Tilbud gyldig til</label>
            <input type="date" style={inputStyle} value={tilbudGyldigTil} onChange={e => setTilbudGyldigTil(e.target.value)} />
          </div>

          <label style={{...labelStyle, marginTop: '15px'}}>Notater</label>
          <textarea style={{ ...inputStyle, height: '70px', resize: 'vertical' }} value={notat} onChange={e => setNotat(e.target.value)} placeholder="Ekstra detaljer..." />
          
          <div style={{ marginTop: '15px' }}>
            <label style={labelStyle}>📷 Bilder</label>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              multiple 
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...smallBtnStyle, marginTop: '5px', width: '100%' }}>
              📸 Last opp
            </button>
            
            {bilder.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginTop: '10px' }}>
                {bilder.map((bilde, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img src={bilde} alt="" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                    <button onClick={() => slettBilde(idx)} style={{ position: 'absolute', top: '3px', right: '3px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '0.8rem' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={lagreEllerOppdater} style={{ ...saveBtnStyle, backgroundColor: redigererId ? OCAB_BLA : '#2ecc71' }}>
            {redigererId ? '✅ Oppdater' : '💾 Lagre'}
          </button>
        </div>
      )}

      <div style={{ marginBottom: '8px', color: '#666', fontSize: '0.85rem' }}>
        {filtrerteProsjekter.length} av {totaltAntall} saker {aktivMedarbeider !== 'alle' && `(${aktivMedarbeider})`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtrerteProsjekter.map(p => {
          const { totalInklMva, rabattBeløp, kjoreTillegg } = beregnPris(p);
          const statusColor = STATUS_COLORS[p.status];
          const harReise = (p.kjoreKm && p.kjoreKm > 0) || (p.bompenger && p.bompenger > 0);
          const visVarsel = skalViseVarsel(p);

          return (
            <div key={p.id} style={{ position: 'relative' }}>
              {/* 14-dagers varsel */}
              {visVarsel && (
                <div style={{ 
                  backgroundColor: '#fef3c7', 
                  border: '2px solid #f59e0b', 
                  borderRadius: '8px', 
                  padding: '10px 15px', 
                  marginBottom: '5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#92400e' }}>Tilbud over 14 dager gammelt</div>
                      <div style={{ fontSize: '0.8rem', color: '#92400e' }}>
                        Opprettet: {new Date(p.opprettet).toLocaleDateString('no-NO')} - Vurder oppfølging
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => avvisVarsel(e, p.id)}
                    style={{ 
                      backgroundColor: '#92400e', 
                      color: 'white', 
                      border: 'none', 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Lukk varsel
                  </button>
                </div>
              )}

              <div onClick={() => apneRedigering(p)} style={{ 
                backgroundColor: statusColor.bg,
                padding: '12px', 
                borderRadius: '10px', 
                borderLeft: `5px solid ${statusColor.border}`, 
                cursor: 'pointer', 
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'all 0.2s'
              }}>
                
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  right: '10px', 
                  backgroundColor: statusColor.border, 
                  color: 'white', 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.7rem', 
                  fontWeight: 'bold'
                }}>
                  {p.status === 'Befaring utført' && '📋'} 
                  {p.status === 'Tilbud levert' && '📨'} 
                  {p.status === 'Sak fakturert' && '💰'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', paddingRight: '120px' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#1a3a3a' }}>{p.kunde}</div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                      Opprettet: {new Date(p.opprettet).toLocaleDateString('no-NO')}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {p.mengde > 0 && <span>📏 {p.mengde} {p.enhet}</span>}
                    <span>⏱️ {p.timer}t</span>
                    {p.bilder && p.bilder.length > 0 && <span>📷 {p.bilder.length}</span>}
                    {rabattBeløp > 0 && <span style={{ color: '#e67e22', fontWeight: 'bold' }}>🏷️ {p.rabatt}%</span>}
                    {harReise && <span style={{ color: OCAB_BLA, fontWeight: 'bold' }}>🚗 {kjoreTillegg.toLocaleString()}kr</span>}
                    <span style={{ 
                      backgroundColor: MEDARBEIDER_COLORS[p.ansvarlig], 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontSize: '0.7rem', 
                      fontWeight: 'bold' 
                    }}>
                      {p.ansvarlig === 'Fakturert' ? '💰' : ''} {p.ansvarlig}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#1a3a3a', fontWeight: 'bold', fontSize: '1.15rem' }}>{totalInklMva.toLocaleString()} kr</div>
                    {p.faktiskTimer && p.faktiskTimer !== p.timer && (
                      <div style={{ fontSize: '0.65rem', color: '#e67e22' }}>
                        Faktisk: {p.faktiskTimer}t ({p.faktiskTimer - p.timer > 0 ? '+' : ''}{p.faktiskTimer - p.timer}t)
                      </div>
                    )}
                  </div>
                </div>

                {p.notat && (
                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '8px', padding: '6px 8px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: '5px', fontStyle: 'italic' }}>
                    {p.notat.substring(0, 80)}{p.notat.length > 80 ? '...' : ''}
                  </div>
                )}

                {/* Status-endring knapper MED TEKST */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                  {[
                    { status: 'Befaring utført', emoji: '📋', tekst: 'Befaring' },
                    { status: 'Tilbud levert', emoji: '📨', tekst: 'Tilbud levert' },
                    { status: 'Sak fakturert', emoji: '💰', tekst: 'Fakturert' }
                  ].map((s) => (
                    <button 
                      key={s.status} 
                      onClick={(e) => endreStatus(e, p.id, s.status as any)}
                      style={{ 
                        flex: 1, 
                        fontSize: '0.7rem', 
                        padding: '8px 4px', 
                        borderRadius: '6px', 
                        border: `1px solid ${STATUS_COLORS[s.status as keyof typeof STATUS_COLORS].border}`, 
                        backgroundColor: p.status === s.status ? STATUS_COLORS[s.status as keyof typeof STATUS_COLORS].border : 'white', 
                        color: p.status === s.status ? 'white' : '#666',
                        cursor: 'pointer',
                        fontWeight: p.status === s.status ? 'bold' : 'normal'
                      }}
                    >
                      {s.emoji} {s.tekst}
                    </button>
                  ))}
                </div>

                {/* Flytt til medarbeider */}
                <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#666', padding: '5px 0' }}>Flytt:</span>
                  {['Alexander', 'Ståle', 'Baard', 'Fakturert'].map((person) => (
                    <button 
                      key={person}
                      onClick={(e) => flyttTilMedarbeider(e, p.id, person as any)}
                      disabled={p.ansvarlig === person}
                      style={{ 
                        flex: 1,
                        fontSize: '0.65rem', 
                        padding: '5px', 
                        borderRadius: '6px', 
                        border: 'none',
                        backgroundColor: p.ansvarlig === person ? '#ddd' : MEDARBEIDER_COLORS[person as keyof typeof MEDARBEIDER_COLORS],
                        color: 'white',
                        cursor: p.ansvarlig === person ? 'default' : 'pointer',
                        opacity: p.ansvarlig === person ? 0.5 : 1
                      }}>
                      {person === 'Fakturert' ? '💰' : person}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={(e) => { e.stopPropagation(); genererPDF(p); }} style={{ flex: 1, ...pdfBtnStyle, backgroundColor: OCAB_BLA }}>
                    📄 PDF
                  </button>
                  <button onClick={(e) => slettProsjekt(e, p.id)} style={{ padding: '6px 12px', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtrerteProsjekter.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#999' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontSize: '1rem' }}>Ingen saker funnet</div>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', marginTop: '30px', padding: '15px', color: '#999', fontSize: '0.8rem' }}>
        <div>OCAB - Skadedyr & Forebyggende</div>
        <div style={{ fontSize: '0.7rem', marginTop: '5px' }}>v8.0 - Komplett saksflyt</div>
      </footer>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '5px', fontSize: '0.95rem', boxSizing: 'border-box' as 'border-box' };
const selectStyle = { padding: '10px', borderRadius: '0 8px 8px 0', border: '1px solid #ddd', borderLeft: 'none', backgroundColor: '#eee', marginTop: '5px' };
const labelStyle = { fontSize: '0.72rem', fontWeight: 'bold' as 'bold', color: '#555', display: 'block' };
const mainBtnStyle = { color: 'white', border: 'none', padding: '9px 16px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' };
const smallBtnStyle = { backgroundColor: '#666', color: 'white', border: 'none', padding: '7px 12px', borderRadius: '7px', fontSize: '0.8rem', cursor: 'pointer' };
const saveBtnStyle = { ...mainBtnStyle, width: '100%', marginTop: '18px', padding: '13px', fontSize: '1rem' };
const filterSelectStyle = { padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'white' };
const statBoxStyle = { backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', textAlign: 'center' as 'center' };
const pdfBtnStyle = { padding: '6px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' };
const medarbeiderBoxStyle = { 
  padding: '10px', 
  borderRadius: '8px', 
  textAlign: 'center' as 'center', 
  cursor: 'pointer', 
  border: '2px solid',
  transition: 'all 0.2s',
  fontWeight: 'bold' as 'bold'
};