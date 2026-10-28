'use client';

import { useState } from 'react';
import { Felt, inputStil, Knapp, Modal } from './Skjema';
import type { FirmaInfo } from '@/lib/saker';

export default function FirmaModal({ firma, onLagre, onLukk }: { firma: FirmaInfo; onLagre: (f: FirmaInfo) => void; onLukk: () => void }) {
  const [utkast, setUtkast] = useState(firma);
  const felt = (navn: keyof FirmaInfo, etikett: string) => (
    <Felt etikett={etikett}>
      <input value={utkast[navn]} onChange={e => setUtkast({ ...utkast, [navn]: e.target.value })} className={inputStil} />
    </Felt>
  );
  return (
    <Modal tittel="Firmainnstillinger" undertittel="Vises på tilbudene du laster ned." onLukk={onLukk}
      bunn={<><Knapp onClick={onLukk}>Avbryt</Knapp><Knapp variant="primar" onClick={() => onLagre(utkast)}>Lagre</Knapp></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        {felt('navn', 'Firmanavn')}{felt('orgNr', 'Org.nr')}{felt('telefon', 'Telefon')}{felt('epost', 'E-post')}{felt('adresse', 'Adresse')}
      </div>
    </Modal>
  );
}
