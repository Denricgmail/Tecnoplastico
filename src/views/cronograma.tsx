import React, { useMemo, useState } from 'react';
import { useDB, Icon, Pill, statusKind, Sheet, Field } from '../ui';
import { yearMondays, MONTHS, parse, todayISO, mondayOf, occupancy, conflicts, clientName, techName, toneOf, fmtShort, fmtDate, addDays, freeTeamFrom, jobRange } from '../logic';
import type { Job } from '../types';

export function Cronograma() {
  const { db } = useDB(); const [mode, setMode] = useState<'obra' | 'tecnico'>('tecnico'); const [year, setYear] = useState(2026);
  const [sched, setSched] = useState<Job | null>(null);
  const weeks = yearMondays(year); const wk = mondayOf(todayISO()); const occ = occupancy(db); const conf = conflicts(db).filter(c => c.week.startsWith(String(year)));
  const months = MONTHS.map((m, i) => ({ m, n: weeks.filter(w => parse(w).getMonth() === i).length }));
  const coll = new Set(db.collective.flatMap(c => c.weeks));
  const planned = db.jobs.filter(j => j.weeks.some(w => w.startsWith(String(year)))).sort((a, b) => [...a.weeks].sort()[0].localeCompare([...b.weeks].sort()[0]));
  const waiting = db.jobs.filter(j => !j.weeks.length && j.status !== 'Cancelado');
  const head = <><div className="g-months" style={{ gridTemplateColumns: months.map(m => `${m.n}fr`).join(' ') }}>{months.map((m, i) => { const cur = year === new Date().getFullYear() && i === new Date().getMonth(); return <span key={m.m} className={`${i % 2 ? 'mo-b' : 'mo-a'} ${cur ? 'mo-cur' : ''}`} aria-current={cur ? 'date' : undefined}>{m.m.slice(0, 3)}</span>; })}</div>
    <div className="g-weeks">{weeks.map(w => <span key={w} className={`wk wk${Math.min(4, Math.floor((parse(w).getDate() - 1) / 7))} ${w === wk ? 'now' : ''} ${coll.has(w) ? 'coll' : ''}`} title={`${Math.floor((parse(w).getDate() - 1) / 7) + 1}ª segunda-feira de ${MONTHS[parse(w).getMonth()]}`}>{parse(w).getDate()}</span>)}</div></>;

  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Operação</p><h1 className="ttl"><span className="ttl-ic"><Icon n="cronograma" s={26} /></span>Cronograma {year}</h1><p className="lede">Semanas de obra por cliente e por técnico, no mesmo formato da planilha "Cronograma Geral", agora com conferência automática de agenda.</p></div>
      <div className="row wrap"><div className="seg sm">{[2026, 2027].map(y => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
        <div className="seg sm"><button className={mode === 'obra' ? 'on' : ''} onClick={() => setMode('obra')}>Por obra</button><button className={mode === 'tecnico' ? 'on' : ''} onClick={() => setMode('tecnico')}>Por técnico</button></div></div></header>


    <section className="card flush gantt-card"><div className="gantt" style={{ ['--wk' as any]: weeks.length }}>
      <div className="g-row g-head"><div className="g-lab">{mode === 'obra' ? 'Cliente / serviço' : 'Técnico'}</div><div className="g-cells">{head}</div></div>
      {mode === 'obra' ? <>
        {planned.map(j => { const r = jobRange(j)!; return <div key={j.id} className="g-row">
          <a className="g-lab" href={`#obra-${j.id}`}><b>{clientName(db, j.clientId)}</b><span>{j.title}</span><span className="chips xs">{j.techIds.map(t => <i key={t} className="dot" style={{ ['--c' as any]: toneOf(db.techs.find(x => x.id === t)) }} title={techName(db, t)} />)}</span></a>
          <div className="g-cells"><div className="g-track">{weeks.map(w => { const on = j.weeks.includes(w); const clash = on && j.techIds.some(t => (occ.get(`${t}|${w}`)?.items.length ?? 0) > 1);
            return <i key={w} className={`${on ? `on st-${statusKind(j.status)}` : ''} ${clash ? 'clash' : ''} ${w === wk ? 'now' : ''} ${coll.has(w) ? 'coll' : ''}`} title={on ? `${clientName(db, j.clientId)} · ${j.title} · semana de ${fmtShort(w)}${clash ? ' · CONFLITO' : ''}` : undefined} />; })}</div></div></div>; })}
        <div className="g-row sub"><div className="g-lab"><b>Compromissos e férias</b></div><div className="g-cells"><div className="g-track">{weeks.map(w => { const a = db.absences.filter(x => x.weeks.includes(w)); return <i key={w} className={`${a.length ? 'abs' : ''} ${coll.has(w) ? 'coll on' : ''} ${w === wk ? 'now' : ''}`} title={a.map(x => `${techName(db, x.techId)}: ${x.label}`).join('\n') || (coll.has(w) ? 'Férias coletivas' : undefined)} />; })}</div></div></div>
      </> : db.techs.map(t => <div key={t.id} className="g-row">
        <div className="g-lab"><b><i className="dot" style={{ ['--c' as any]: toneOf(t) }} /> {t.name}</b><span>{t.full ?? t.role}</span></div>
        <div className="g-cells"><div className="g-track">{weeks.map(w => { const s = occ.get(`${t.id}|${w}`); const n = s?.items.length ?? 0; const abs = s?.items.every(i => i.kind === 'ausencia');
          return <i key={w} className={`${n ? (n > 1 ? 'clash on' : abs ? 'abs' : 'on t') : ''} ${coll.has(w) ? 'coll' : ''} ${w === wk ? 'now' : ''}`} style={n === 1 && !abs ? { ['--c' as any]: toneOf(t) } : undefined} title={s ? s.items.map(i => i.label).join('\n') : undefined}>{n > 1 ? n : ''}</i>; })}</div></div></div>)}
    </div></section>
    <div className="legend"><span className="wk-leg">Segundas do mês <i className="wk wk0">1ª</i><i className="wk wk1">2ª</i><i className="wk wk2">3ª</i><i className="wk wk3">4ª</i><i className="wk wk4">5ª</i></span><span><i className="lg run" />Executando</span><span><i className="lg ok" />Finalizado</span><span><i className="lg wait" />Aguardando</span><span><i className="lg abs" />Compromisso</span><span><i className="lg coll" />Férias coletivas</span><span><i className="lg clash" />Conflito</span></div>

    {conf.length > 0 && <section className="conf-strip"><Icon n="alert" /><div><b>{conf.length} semanas com técnico em dois lugares</b><p>{conf.map(c => `${techName(db, c.techId)} (${fmtShort(c.week)})`).join(' · ')}</p></div></section>}
    <section className="card"><div className="card-h"><h2>Aguardando programação</h2><span className="muted">{waiting.length} serviços sem semana definida</span></div>
      <div className="wait-list">{waiting.map(j => <div key={j.id} className="wait-i"><div><b>{clientName(db, j.clientId)}</b><span>{j.title}</span></div>
        <span className="chips xs">{j.techIds.map(t => <span key={t} className="chip" style={{ ['--c' as any]: toneOf(db.techs.find(x => x.id === t)) }}>{techName(db, t)}</span>)}</span>
        {j.proposalId && <a href={`#proposta-${j.proposalId}`} className="link">Proposta</a>}
        <button className="btn sm" onClick={() => setSched(j)}>Programar</button></div>)}</div></section>
    {sched && <Programar job={sched} onClose={() => setSched(null)} />}
  </div>;
}

function Programar({ job, onClose }: { job: Job; onClose: () => void }) {
  const { db, set, toast } = useDB(); const [n, setN] = useState(3); const [techs, setTechs] = useState(job.techIds);
  const sug = useMemo(() => freeTeamFrom(db, techs, addDays(mondayOf(todayISO()), 7), n), [techs.join(), n]);
  const [start, setStart] = useState<string | null>(null); const s = start ?? sug; const weeks = Array.from({ length: n }, (_, i) => addDays(s, 7 * i));
  const occ = occupancy(db); const clashes = weeks.flatMap(w => techs.filter(t => occ.has(`${t}|${w}`)).map(t => `${techName(db, t)} em ${fmtShort(w)}: ${occ.get(`${t}|${w}`)!.items.map(i => i.label).join(', ')}`));
  return <Sheet title={`Programar ${clientName(db, job.clientId)} · ${job.title}`} onClose={onClose}><div className="form">
    <Field label="Equipe"><div className="chips pick">{db.techs.map(t => <button type="button" key={t.id} className={`chip ${techs.includes(t.id) ? 'on' : ''}`} style={{ ['--c' as any]: toneOf(t) }} onClick={() => setTechs(x => x.includes(t.id) ? x.filter(y => y !== t.id) : [...x, t.id])}>{t.name}</button>)}</div></Field>
    <Field label="Semanas de obra"><div className="seg sm">{[1, 2, 3, 4, 5, 6, 8].map(k => <button key={k} type="button" className={n === k ? 'on' : ''} onClick={() => setN(k)}>{k}</button>)}</div></Field>
    <Field label="Início" hint={start ? 'Escolhido manualmente' : 'Primeira semana com a equipe toda livre'}><input id="pg-start" type="date" value={s} onChange={e => setStart(mondayOf(e.target.value))} /></Field>
    <div className="weeks-prev">{weeks.map(w => <span key={w}>{fmtShort(w)}</span>)}</div>
    {clashes.length > 0 ? <div className="audit bad"><Icon n="alert" /><div><b>Conflito de agenda</b>{clashes.map(c => <p key={c}>{c}</p>)}</div></div> : <div className="audit"><Icon n="check" /><div><b>Equipe livre em todas as semanas</b><p>{fmtDate(weeks[0])} a {fmtDate(addDays(weeks[weeks.length - 1], 4))}</p></div></div>}
    <div className="row-end"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!techs.length} onClick={() => { set(d => { const j = d.jobs.find(x => x.id === job.id)!; j.weeks = weeks; j.techIds = techs; return d; }); toast('Obra programada no cronograma'); onClose(); }}>Programar</button></div>
  </div></Sheet>;
}
