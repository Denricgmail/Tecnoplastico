import React from 'react';
import { services, STAGES } from './servicos';
import { useDB, Icon, Pill, statusKind } from '../ui';
import { alerts, pricing, brl, todayISO, mondayOf, addDays, occupancy, fmtShort, clientName, techName, toneOf, jobRange, fmtDate, num, conflicts } from '../logic';

export function Painel() {
  const { db, go } = useDB();
  const today = todayISO(); const wk = mondayOf(today);
  const h = new Date().getHours(); const hello = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const longDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const al = alerts(db);
  const open = db.proposals.filter(p => p.status === 'Enviada' || p.status === 'Rascunho');
  const openVal = open.reduce((s, p) => s + pricing(p).value, 0);
  const approved = db.proposals.filter(p => p.status === 'Aprovada');
  const now = db.jobs.filter(j => j.weeks.includes(wk) && j.status !== 'Cancelado');
  const occ = occupancy(db);
  const busyNow = db.techs.filter(t => occ.has(`${t.id}|${wk}`) && occ.get(`${t.id}|${wk}`)!.items.some(i => i.kind === 'obra')).length;
  const receivable = db.jobs.flatMap(j => j.installments).filter(i => !i.paid).reduce((s, i) => s + i.value, 0);
  const toBill = db.jobs.filter(j => j.expenses.length && !j.installments.some(i => i.label.startsWith('Reembolso'))).reduce((s, j) => s + j.expenses.reduce((a, e) => a + e.value, 0), 0);
  const recover = al.filter(a => a.value && a.id.startsWith('h-')).reduce((s, a) => s + (a.value ?? 0), 0);
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(wk, 7 * (i - 2)));
  const cset = new Set(conflicts(db).map(c => c.week));
  const svcs = services(db); const funnel = STAGES.filter(x => x.k !== 'encerrado').map(st => { const ss = svcs.filter(x => x.stage === st.k); return { s: st.l, k: st.pill, n: ss.length, v: ss.reduce((a, x) => a + (x.value ?? 0), 0) }; });
  const fmax = Math.max(...funnel.map(f => f.v), 1); const nmax = Math.max(...funnel.map(f => f.n), 1);

  return <div className="stack-l">
    <header className="hero">
      <div><p className="eyebrow">{longDate}</p><h1 className="ttl"><span className="ttl-ic"><Icon n="painel" s={26} /></span>{hello}, Cidinha</h1>
        <p className="lede">{now.length ? <>Equipe em campo em <b>{now.map(j => clientName(db, j.clientId)).join(', ')}</b>. </> : 'Nenhuma obra em campo nesta semana. '}
          {open.length} propostas aguardam resposta e {al.filter(a => a.level === 'crit').length} choques de agenda pedem decisão.</p></div>
    </header>

    <section className="kpis">
      <button className="kpi" onClick={() => go('servicos')}><span>Propostas em aberto</span><b>{brl(openVal)}</b><small>{open.length} propostas enviadas</small></button>
      <button className="kpi" onClick={() => go('cronograma')}><span>Equipe alocada nesta semana</span><b>{busyNow}<i>/{db.techs.length}</i></b><small>{now.length} obra{now.length !== 1 ? 's' : ''} em campo</small></button>
      <button className="kpi" onClick={() => go('financeiro')}><span>A receber</span><b>{brl(receivable + toBill)}</b><small>{toBill ? `inclui ${brl(toBill, true)} de reembolso a cobrar` : `${approved.length} propostas aprovadas`}</small></button>
      <button className="kpi warn" onClick={() => go('servicos')}><span>Horas fora das planilhas</span><b>{brl(recover)}</b><small>somas que não fecham nas propostas</small></button>
    </section>

    <div className="grid-2">
      <section className="card">
        <div className="card-h"><h2>Atenção agora</h2><span className="muted">{al.length} itens</span></div>
        <ul className="alerts">
          {al.slice(0, 9).map(a => <li key={a.id} className={`al al-${a.level}`} onClick={() => a.go && go(a.go)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && a.go && go(a.go)}>
            <span className="al-dot" /><div><b>{a.title}</b><p>{a.body}</p></div>{a.value ? <em>{brl(a.value, a.value < 10000)}</em> : <Icon n="arrow" s={16} />}
          </li>)}
        </ul>
      </section>

      <div className="stack">
        <section className="card">
          <div className="card-h"><h2>Em campo</h2><a href="#cronograma" className="link">Cronograma</a></div>
          {now.length ? now.map(j => { const r = jobRange(j)!; return <a key={j.id} href={`#obra-${j.id}`} className="field-job">
            <div><b>{clientName(db, j.clientId)}</b><span>{j.title}{j.machine && j.machine !== j.title ? ` · ${j.machine}` : ''}</span></div>
            <div className="chips">{j.techIds.map(t => <span key={t} className="chip" style={{ ['--c' as any]: toneOf(db.techs.find(x => x.id === t)) }}>{techName(db, t)}</span>)}</div>
            <small>{fmtDate(r.from)} → {fmtDate(r.to)}</small></a>; }) : <p className="muted">Ninguém em campo nesta semana.</p>}
        </section>
        <section className="card">
          <div className="card-h"><h2>Serviços por etapa</h2><a href="#servicos" className="link">Serviços</a></div>
          <div className="funnel">{funnel.map(f => <div key={f.s} className="fn-row"><span>{f.s}</span><div className="fn-bar"><i className={`fk-${f.k === 'run' ? 'wait' : f.k}`} style={{ width: `${(f.n / nmax) * 100}%` }} /></div><b>{f.n}</b><small>{f.v ? brl(f.v) : ''}</small></div>)}</div>
        </section>
      </div>
    </div>

    <section className="card">
      <div className="card-h"><h2>Ocupação da equipe</h2><span className="muted">técnicos alocados por semana · {db.techs.length} no time</span></div>
      <div className="occ" role="img" aria-label="Técnicos alocados por semana">
        {weeks.map(w => { const n = db.techs.filter(t => occ.get(`${t.id}|${w}`)?.items.some(i => i.kind === 'obra')).length; const isNow = w === wk; const conf = cset.has(w);
          return <div key={w} className={`occ-col ${isNow ? 'now' : ''}`}><div className="occ-track">{Array.from({ length: db.techs.length }, (_, i) => <i key={i} className={i < n ? (conf ? 'c' : 'f') : ''} />)}</div><b>{n}</b><span>{fmtShort(w)}</span>{conf && <em title="Conflito de agenda">!</em>}</div>; })}
      </div>
      <p className="muted small">Semanas com <span className="tag-c">!</span> têm técnico escalado em duas frentes. Os dados vêm do Cronograma Geral 2026.</p>
    </section>
  </div>;
}
