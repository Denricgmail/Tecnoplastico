import React, { useEffect, useRef, useState } from 'react';
import { useDB, Icon } from '../ui';
import { alerts, brl } from '../logic';

const KEY = 'tp-notificacoes-lidas';
const loadRead = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const saveRead = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { } };
const LEVEL: Record<string, string> = { crit: 'Agenda', warn: 'Conferência', info: 'Lembrete' };

export function Bell() {
  const { db, go } = useDB();
  const [open, setOpen] = useState(false); const [read, setRead] = useState<string[]>(loadRead);
  const box = useRef<HTMLDivElement>(null);
  const list = alerts(db);
  const unread = list.filter(a => !read.includes(a.id));
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('mousedown', close); addEventListener('keydown', esc);
    return () => { removeEventListener('mousedown', close); removeEventListener('keydown', esc); };
  }, [open]);
  const mark = (ids: string[]) => { const n = [...new Set([...read, ...ids])]; setRead(n); saveRead(n); };
  return <div className="bell" ref={box}>
    <button className={`bell-btn ${unread.length ? 'has' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={unread.length ? `${unread.length} notificações não lidas` : 'Notificações'}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      {unread.length > 0 && <span className="bell-badge">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <div className="bell-pop" role="dialog" aria-label="Notificações">
      <div className="bell-h"><b>Notificações</b>{unread.length > 0 ? <button className="link small" onClick={() => mark(list.map(a => a.id))}>Marcar todas como lidas</button> : <span className="muted small">Tudo lido</span>}</div>
      <ul className="bell-list">
        {list.map(a => { const isNew = !read.includes(a.id);
          return <li key={a.id} className={`bn bn-${a.level} ${isNew ? 'new' : ''}`}>
            <button onClick={() => { mark([a.id]); setOpen(false); if (a.go) go(a.go); }}>
              <span className="bn-dot" /><div><span className="bn-k">{LEVEL[a.level]}</span><b>{a.title}</b><p>{a.body}</p>{a.value ? <em>{brl(a.value, a.value < 10000)}</em> : null}</div>
            </button></li>; })}
        {!list.length && <li className="muted small pad">Nenhuma notificação no momento.</li>}
      </ul>
      <div className="bell-f"><button className="link small" onClick={() => { setOpen(false); go('painel'); }}>Ver tudo no Painel <Icon n="arrow" s={13} /></button></div>
    </div>}
  </div>;
}
