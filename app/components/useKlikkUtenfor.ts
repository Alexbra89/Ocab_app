'use client';

import { useEffect, useRef } from 'react';

// Kaller `onUtenfor` når brukeren klikker utenfor elementet – brukes for å lukke nedtrekksmenyer.
export function useKlikkUtenfor<T extends HTMLElement>(aktiv: boolean, onUtenfor: () => void) {
  const ref = useRef<T>(null);
  const callback = useRef(onUtenfor);

  useEffect(() => {
    callback.current = onUtenfor;
  });

  useEffect(() => {
    if (!aktiv) return;
    const lytter = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) callback.current();
    };
    document.addEventListener('mousedown', lytter);
    return () => document.removeEventListener('mousedown', lytter);
  }, [aktiv]);

  return ref;
}
