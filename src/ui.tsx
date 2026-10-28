import React, { createContext, useContext, useEffect, useState } from 'react';
import type { DB } from './types';
import { buildSeed } from './data';

const KEY = 'tecnoplastico-sistema-v1';
type Ctx = { db: DB; set: (fn: (d: DB) => DB) => void; reset: () => void; go: (h: string) => void; toast: (m: string) => void };
const C = createContext<Ctx>(null as any);
export const useDB = () => useContext(C);

const CATALOG_VERSION = 3;
/** Converte números antigos (1094/2026, nomes) para o formato AA + sequência e numera os checklists. */
function migrateNumbers(d: DB): DB {
  if (d.nextNum) return d;
  const legacy: Record<string, string> = { 'p-307': '261095', 'p-1094': '261094', 'p-zara': '261096', 'p-e108': '261097' };
  let max = 1097;
  d.proposals.forEach(p => { if (legacy[p.id]) p.number = legacy[p.id]; else { const m = p.number.match(/^(\d{3,4})\/(\d{4})$/); p.number = m ? `${m[2].slice(2)}${m[1].padStart(4, '0')}` : p.number; }
    const n = +(p.number.match(/^\d{2}(\d{4,})$/)?.[1] ?? 0); if (n > max) max = n; });
  d.inspections.forEach(i => { const p = d.proposals.find(x => x.id === i.proposalId); if (p && /^\d{6,}$/.test(p.number)) i.code = p.number; });
  d.inspections.filter(i => !i.code).reverse().forEach(i => { max++; i.code = `${(i.date || '2026').slice(2, 4)}${String(max).padStart(4, '0')}`; });
  d.nextNum = max + 1; return d;
}
function load(): DB { try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); if (d && d.jobs && d.catalog) { if ((d.catalogVersion ?? 1) < CATALOG_VERSION) { d.catalog = buildSeed().catalog; d.catalogVersion = CATALOG_VERSION; } return migrateNumbers(d);  } } } catch { } return { ...buildSeed(), catalogVersion: CATALOG_VERSION } as DB; }

export function Provider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(load);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } }, [db]);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3200); return () => clearTimeout(t); }, [msg]);
  const ctx: Ctx = {
    db, set: fn => setDb(d => fn(structuredClone(d))),
    reset: () => { setDb(buildSeed()); setMsg('Dados originais das planilhas restaurados'); },
    go: h => { location.hash = h; }, toast: setMsg,
  };
  return <C.Provider value={ctx}>{children}{msg && <div className="toast" role="status">{msg}</div>}</C.Provider>;
}

const P: Record<string, string> = {
  servicos: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  painel: 'M3 13h8V3H3zm0 8h8v-6H3zm10 0h8V11h-8zm0-18v6h8V3z',
  propostas: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
  inspecoes: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  cronograma: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  obras: 'M2 20h20M5 20V8l7-5 7 5v12M9 20v-6h6v6',
  financeiro: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  clientes: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  catalogo: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  medicoes: 'M13 2L3 14h9l-1 8 10-12h-9z',
  alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  check: 'M20 6L9 17l-5-5', x: 'M18 6L6 18M6 6l12 12', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14M12 5l7 7-7 7', back: 'M19 12H5M12 19l-7-7 7-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', plane: 'M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6', menu: 'M3 12h18M3 6h18M3 18h18', spark: 'M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
};
export function Icon({ n, s = 18, cls = '' }: { n: string; s?: number; cls?: string }) {
  return <svg className={`ic ${cls}`} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={P[n] ?? P.doc} /></svg>;
}

export const Pill = ({ k, children }: { k: string; children: React.ReactNode }) => <span className={`pill pill-${k}`}>{children}</span>;
export const statusKind = (s: string) => ({ Aprovada: 'ok', Finalizado: 'ok', Executando: 'run', Enviada: 'wait', Aguardando: 'wait', Rascunho: 'mute', Recusada: 'bad', Cancelado: 'bad' } as any)[s] ?? 'mute';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="field"><span className="field-l">{label}</span>{children}{hint && <span className="field-h">{hint}</span>}</label>;
}

export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => { const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, [onClose]);
  return <div className="sheet-bg" onClick={onClose}><div className={`sheet ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
    <div className="sheet-h"><h3>{title}</h3><button className="btn ghost icon" onClick={onClose} aria-label="Fechar"><Icon n="x" /></button></div>
    <div className="sheet-b">{children}</div></div></div>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty"><div className="empty-t">{title}</div><p>{body}</p>{action}</div>;
}

export function Bar({ v, max, tone = 'var(--accent)' }: { v: number; max: number; tone?: string }) {
  return <div className="bar"><i style={{ width: `${Math.min(100, max ? (v / max) * 100 : 0)}%`, background: tone }} /></div>;
}
