import React, { useState } from 'react';
import { useDB, Icon, Pill, statusKind, Field, Empty } from '../ui';
import { clientName, techName, toneOf, jobRange, fmtDate, brl, num, todayISO, uid, addDays, parse, mondayOf, pricing } from '../logic';
import type { Job, JobStatus } from '../types';

export function Obras() {
  const { db } = useDB(); const [f, setF] = useState<string>('todas');
  const order: JobStatus[] = ['Executando', 'Aguardando', 'Finalizado', 'Cancelado'];
  const wk = mondayOf(todayISO());
  const live = (j: Job) => j.weeks.includes(wk) ? 'Em campo' : j.status;
  const list = db.jobs.filter(j => f === 'todas' || j.status === f).sort((a, b) => (order.indexOf(a.status) - order.indexOf(b.status)) || ((jobRange(b)?.from ?? '9') .localeCompare(jobRange(a)?.from ?? '9')));
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Operação</p><h1>Obras</h1><p className="lede">Cada obra reúne equipe, semanas, diário, despesas, materiais e cobrança.</p></div></header>
    <div className="seg" role="tablist">{['todas', ...order].map(s => <button key={s} className={f === s ? 'on' : ''} onClick={() => setF(s)}>{s === 'todas' ? 'Todas' : s}<small>{db.jobs.filter(j => s === 'todas' || j.status === s).length}</small></button>)}</div>
    <div className="cards">{list.map(j => { const r = jobRange(j); const sum = j.expenses.reduce((s, e) => s + e.value, 0);
      return <a key={j.id} href={`#obra-${j.id}`} className="pcard">
        <div className="pcard-top"><Pill k={live(j) === 'Em campo' ? 'run' : statusKind(j.status)}>{live(j)}</Pill><span className="muted small">{j.type}</span></div>
        <span className="pc-client">{clientName(db, j.clientId)}{j.location ? ` · ${j.location}` : ''}</span><h3>{j.title}</h3>
        <div className="chips xs">{j.techIds.map(t => <span key={t} className="chip" style={{ ['--c' as any]: toneOf(db.techs.find(x => x.id === t)) }}>{techName(db, t)}</span>)}</div>
        <div className="pc-foot"><small>{r ? `${fmtDate(r.from)} → ${fmtDate(r.to)} · ${j.weeks.length} sem.` : 'Sem semanas programadas'}</small><small>{[j.expenses.length && `${j.expenses.length} notas`, j.materials.length && `${j.materials.length} materiais`, j.travel && 'escala de viagem'].filter(Boolean).join(' · ')}{sum ? ` · ${brl(sum, true)}` : ''}</small></div>
      </a>; })}</div>
  </div>;
}

export const TABS = [['resumo', 'Resumo'], ['diario', 'Diário de obra'], ['despesas', 'Despesas'], ['materiais', 'Materiais'], ['escala', 'Escala de viagem']] as const;
const WAIT = ['Atraso ou falta de material', 'Equipamento de movimentação indisponível (munck, empilhadeira)', 'Falta de energia, água ou ar comprimido', 'Acesso à máquina liberado com atraso', 'Serviço de outro fornecedor atrasado', 'Falta de matéria-prima para testes'];

export const defaultJobTab = (j?: Job) => j?.travel ? 'escala' : j?.expenses.length ? 'despesas' : j?.materials.length ? 'materiais' : 'resumo';
export function ObraDetail({ id, embedded, tab: tabProp }: { id: string; embedded?: boolean; tab?: string }) {
  const { db, set, toast } = useDB(); const j = db.jobs.find(x => x.id === id); const [tabS, setTab] = useState<string>(defaultJobTab(j)); const tab = tabProp ?? tabS;
  if (!j) return <Empty title="Obra não encontrada" body="Ela pode ter sido removida ao restaurar os dados." action={<a className="btn" href="#servicos">Voltar</a>} />;
  const upd = (fn: (x: Job) => void) => set(d => { fn(d.jobs.find(x => x.id === id)!); return d; });
  const r = jobRange(j); const prop = db.proposals.find(p => p.id === j.proposalId);
  const tabs = TABS.filter(([k]) => k !== 'escala' || j.travel || j.techIds.length);
  return <div className="stack-l">
    {!embedded && <><header className="ph"><div><a href="#servicos" className="back"><Icon n="back" s={16} /> Obras</a><p className="eyebrow">{clientName(db, j.clientId)}{j.location ? ` · ${j.location}` : ''}{j.ref ? ` · ${j.ref}` : ''}</p><h1>{j.title}</h1>
      <div className="row wrap"><Pill k={statusKind(j.status)}>{j.status}</Pill>{j.machine && <span className="muted small">{j.machine}</span>}{r && <span className="muted small">{fmtDate(r.from)} → {fmtDate(r.to)}</span>}</div></div>
      <div className="row wrap"><select aria-label="Situação da obra" value={j.status} onChange={e => { upd(x => { x.status = e.target.value as JobStatus; }); toast(`Obra marcada como ${e.target.value}`); }}>{['Aguardando', 'Executando', 'Finalizado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}</select></div></header>
    <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{k === 'despesas' && j.expenses.length ? <small>{j.expenses.length}</small> : k === 'diario' && j.diary.length ? <small>{j.diary.length}</small> : k === 'materiais' && j.materials.length ? <small>{j.materials.length}</small> : null}</button>)}</div></>}

    {tab === 'resumo' && <div className="grid-2">
      <section className="card"><div className="card-h"><h2>Equipe</h2></div><div className="team">{j.techIds.map(t => { const tt = db.techs.find(x => x.id === t)!; return <div key={t} className="tm"><span className="av" style={{ ['--c' as any]: toneOf(tt) }}>{tt.name[0]}</span><div><b>{tt.name}</b><small>{tt.full ?? tt.role}</small></div></div>; })}</div>
        <div className="card-h"><h2>Semanas</h2></div><div className="weeks-prev">{[...j.weeks].sort().map(w => <span key={w}>{fmtDate(w).slice(0, 5)}</span>)}{!j.weeks.length && <span className="muted">Sem semanas programadas — use o Cronograma.</span>}</div></section>
      <section className="card"><div className="card-h"><h2>Cobrança</h2></div>
        {j.installments.length ? <table className="tbl"><tbody>{j.installments.map((i, k) => <tr key={i.id}><td><b>{i.label}</b><div className="muted small">vence {fmtDate(i.due)}</div></td><td className="r num">{brl(i.value, true)}</td><td className="r"><button className={`btn sm ${i.paid ? 'okb' : ''}`} onClick={() => upd(x => { x.installments[k].paid = !x.installments[k].paid; })}>{i.paid ? <><Icon n="check" s={14} /> Recebido</> : 'Marcar recebido'}</button></td></tr>)}</tbody></table>
          : <p className="muted">{prop ? `Proposta ${prop.status.toLowerCase()} de ${brl(pricing(prop).value)}. As parcelas aparecem aqui quando ela for aprovada.` : 'O valor do contrato desta obra não estava nas planilhas. Vincule uma proposta para gerar as parcelas.'}</p>}</section>
    </div>}

    {tab === 'diario' && <Diario j={j} upd={upd} />}
    {tab === 'despesas' && <Despesas j={j} upd={upd} />}
    {tab === 'materiais' && (j.materials.length ? <section className="card flush"><div className="card-h pad"><h2>Planilha de compras</h2><span className="muted">Material por conta do cliente · {j.materials.length} itens</span></div>
      <div className="tbl-wrap"><table className="tbl"><thead><tr><th>#</th><th>Grupo</th><th>Descrição</th><th>Critério</th><th className="r">Calc.</th><th className="r">Comprar</th><th>Un.</th></tr></thead>
        <tbody>{j.materials.map(m => <tr key={m.item}><td className="num muted">{m.item}</td><td>{m.group}</td><td><b>{m.desc}</b>{m.obs && <div className="muted small">{m.obs}</div>}</td><td className="muted small">{m.criteria}</td><td className="r num">{num(m.calc, m.calc % 1 ? 2 : 0)}</td><td className="r num"><b>{m.buy}</b></td><td>{m.unit}</td></tr>)}</tbody></table></div></section>
      : <Empty title="Nenhuma lista de materiais" body="Listas de compras da obra (como a de infraestrutura elétrica da Bandera) aparecem aqui, com quantidade calculada e quantidade a comprar." />)}
    {tab === 'escala' && <Escala j={j} />}
  </div>;
}

function Diario({ j, upd }: { j: Job; upd: (fn: (x: Job) => void) => void }) {
  const { db, toast } = useDB(); const [date, setDate] = useState(todayISO()); const [techs, setTechs] = useState(j.techIds); const [h, setH] = useState(9); const [w, setW] = useState(0); const [why, setWhy] = useState(WAIT[0]); const [text, setText] = useState('');
  const wait = j.diary.reduce((s, d) => s + d.waitHours, 0); const billed = j.installments.filter(i => i.label.startsWith('Horas de espera')).reduce((s, i) => s + i.value, 0);
  return <div className="split">
    <section className="card"><div className="card-h"><h2>Registros</h2><span className="muted">{j.diary.length} dias · {num(j.diary.reduce((s, d) => s + d.hours * d.techs.length, 0))} homem-hora</span></div>
      {j.diary.length ? <ol className="diary">{[...j.diary].sort((a, b) => b.date.localeCompare(a.date)).map(d => <li key={d.id}><time>{fmtDate(d.date)}</time><div><p>{d.text || 'Sem descrição.'}</p><small>{d.techs.map(t => techName(db, t)).join(', ')} · {d.hours} h{d.waitHours ? <b className="neg"> · {d.waitHours} h de espera: {d.waitReason}</b> : ''}</small></div></li>)}</ol>
        : <Empty title="Nenhum dia registrado" body="Cada registro alimenta o relatório diário para o cliente, as horas realizadas e as horas de espera cobráveis." />}
      {wait > 0 && <div className="audit"><Icon n="clock" /><div><b>{num(wait)} h de espera registradas</b><p>A R$ 160/h: {brl(wait * 160, true)}{billed ? ` · ${brl(billed, true)} já lançado` : ''}.</p>
        {wait * 160 > billed && <button className="btn sm" onClick={() => { upd(x => { x.installments.push({ id: uid('i'), label: 'Horas de espera (hora técnica adicional)', value: wait * 160 - billed, due: addDays(todayISO(), 7), paid: false }); }); toast('Horas de espera lançadas no Financeiro'); }}>Lançar cobrança</button>}</div></div>}
    </section>
    <form className="card form" onSubmit={e => { e.preventDefault(); upd(x => { x.diary.push({ id: uid('d'), date, techs, hours: h, waitHours: w, waitReason: w ? why : '', text }); }); setText(''); setW(0); toast('Dia registrado no diário de obra'); }}>
      <h2>Registrar dia</h2>
      <Field label="Data"><input id="di-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      <Field label="Quem trabalhou"><div className="chips pick">{db.techs.map(t => <button type="button" key={t.id} className={`chip ${techs.includes(t.id) ? 'on' : ''}`} style={{ ['--c' as any]: toneOf(t) }} onClick={() => setTechs(x => x.includes(t.id) ? x.filter(y => y !== t.id) : [...x, t.id])}>{t.name}</button>)}</div></Field>
      <div className="row2"><Field label="Horas trabalhadas"><input id="di-h" type="number" min={0} step={0.5} value={h} onChange={e => setH(+e.target.value)} /></Field><Field label="Horas paradas esperando"><input id="di-w" type="number" min={0} step={0.5} value={w} onChange={e => setW(+e.target.value)} /></Field></div>
      {w > 0 && <Field label="Motivo da espera" hint="Fica registrado para cobrança como hora técnica adicional"><select id="di-why" value={why} onChange={e => setWhy(e.target.value)}>{WAIT.map(x => <option key={x}>{x}</option>)}</select></Field>}
      <Field label="O que foi feito"><textarea id="di-text" rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Ex.: desacoplado o cabeçote, torre reposicionada, iniciada a geometria da parte quente." /></Field>
      <button className="btn primary">Salvar dia</button>
    </form>
  </div>;
}

function Despesas({ j, upd }: { j: Job; upd: (fn: (x: Job) => void) => void }) {
  const { toast } = useDB(); const total = j.expenses.reduce((s, e) => s + e.value, 0); const billed = j.installments.some(i => i.label.startsWith('Reembolso'));
  const [f, setF] = useState({ date: todayISO(), supplier: '', doc: '', desc: 'Alimentação', value: '' });
  const byCat = Object.entries(j.expenses.reduce((m, e) => { const k = e.desc.split(/[—/-]/)[0].trim(); m[k] = (m[k] ?? 0) + e.value; return m; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
  return <div className="split">
    <section className="card flush"><div className="card-h pad"><h2>Notas para reembolso</h2><b className="num">{brl(total, true)}</b></div>
      {j.expenses.length ? <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Data</th><th>Fornecedor</th><th>Nota</th><th>Descrição</th><th className="r">Valor</th></tr></thead>
        <tbody>{[...j.expenses].sort((a, b) => a.date.localeCompare(b.date)).map(e => <tr key={e.id}><td className="num">{fmtDate(e.date).slice(0, 5)}</td><td><b>{e.supplier}</b></td><td className="muted small">{e.doc}</td><td>{e.desc}</td><td className="r num">{brl(e.value, true)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={4}>Total para reembolso</td><td className="r num">{brl(total, true)}</td></tr></tfoot></table></div>
        : <Empty title="Nenhuma nota lançada" body="Lance as notas de táxi, alimentação, farmácia e combustível da viagem. O sistema monta o relatório de reembolso." />}
      {byCat.length > 0 && <div className="pad cats">{byCat.map(([k, v]) => <div key={k}><span>{k}</span><div className="bar"><i style={{ width: `${(v / byCat[0][1]) * 100}%` }} /></div><b className="num">{brl(v, true)}</b></div>)}</div>}
      {total > 0 && <div className="pad row-end">{billed ? <span className="pill pill-ok">Reembolso lançado no Financeiro</span> : <button className="btn primary" onClick={() => { upd(x => { x.installments.push({ id: uid('i'), label: 'Reembolso de despesas', value: total, due: addDays(todayISO(), 10), paid: false }); }); toast('Cobrança de reembolso criada no Financeiro'); }}><Icon n="financeiro" /> Gerar cobrança de {brl(total, true)}</button>}</div>}
    </section>
    <form className="card form" onSubmit={e => { e.preventDefault(); const v = parseFloat(String(f.value).replace(',', '.')); if (!v) return; upd(x => { x.expenses.push({ id: uid('e'), date: f.date, supplier: f.supplier || 'Fornecedor', doc: f.doc || 's/n', desc: f.desc, value: v }); }); setF({ ...f, supplier: '', doc: '', value: '' }); toast('Nota lançada'); }}>
      <h2>Lançar nota</h2>
      <Field label="Data"><input id="ex-d" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Fornecedor"><input id="ex-s" value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} placeholder="Ex.: Sendas Distribuidora" /></Field>
      <div className="row2"><Field label="Nº da nota"><input id="ex-n" value={f.doc} onChange={e => setF({ ...f, doc: e.target.value })} /></Field><Field label="Valor (R$)"><input id="ex-v" inputMode="decimal" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} placeholder="0,00" /></Field></div>
      <Field label="Tipo"><select id="ex-t" value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })}>{['Alimentação', 'Transporte', 'Combustível', 'Farmácia', 'Estacionamento', 'Água / bebidas', 'Hospedagem', 'Outros'].map(x => <option key={x}>{x}</option>)}</select></Field>
      <button className="btn primary">Lançar</button>
    </form>
  </div>;
}

const CODE: Record<string, [string, string]> = { T: ['Trabalho', 't'], F: ['Folga', 'f'], V: ['Viagem', 'v'], '-': ['—', 'n'] };
function Escala({ j }: { j: Job }) {
  const { db } = useDB();
  const [on, setOn] = useState(25); const [off, setOff] = useState(4); const [stagger, setStagger] = useState(7);
  const real = j.travel; const start = real?.start ?? (jobRange(j)?.from ?? todayISO());
  const len = real ? Object.values(real.plan)[0].length : 98;
  const gen = (k: number) => { let s = ''; let d = 0; const cyc = on + off + 2; for (let i = 0; i < len; i++) { const x = (i - k * stagger + cyc * 10) % cyc; s += i < k * stagger ? '-' : x === 0 || x === on + 1 ? 'V' : x <= on ? (parse(addDays(start, i)).getDay() === 0 ? 'F' : 'T') : 'F'; d++; } return s; };
  const plan: Record<string, string> = real ? real.plan : Object.fromEntries(j.techIds.map((t, k) => [techName(db, t), gen(k)]));
  const days = Array.from({ length: len }, (_, i) => addDays(start, i));
  const flights = Object.values(plan).join('').split('').filter(c => c === 'V').length;
  const covered = days.filter((_, i) => Object.values(plan).some(p => p[i] === 'T')).length;
  return <div className="stack">
    <section className="card"><div className="card-h"><h2>{real ? 'Planejamento de viagem (planilha)' : 'Escala de rodízio sugerida'}</h2><span className="muted">{fmtDate(start)} · {len} dias</span></div>
      <div className="esc-kpi"><div><b>{flights}</b><span>trechos aéreos</span></div><div><b>{Math.round((covered / len) * 100)}%</b><span>dos dias com equipe na obra</span></div><div><b>{Object.keys(plan).length}</b><span>técnicos no rodízio</span></div></div>
      <div className="esc-wrap"><table className="esc"><thead><tr><th />{days.map((d, i) => <th key={d} className={parse(d).getDay() === 1 ? `mon wk wk${Math.min(4, Math.floor((parse(d).getDate() - 1) / 7))}` : ''}>{parse(d).getDate() === 1 || i === 0 ? <em>{fmtDate(d).slice(3, 5)}</em> : null}{parse(d).getDate()}</th>)}</tr></thead>
        <tbody>{Object.entries(plan).map(([n, s]) => <tr key={n}><th>{n}</th>{s.split('').map((c, i) => <td key={i} className={`e-${CODE[c][1]}`} title={`${n} · ${fmtDate(days[i])} · ${CODE[c][0]}`} />)}</tr>)}</tbody></table></div>
      <div className="legend"><span><i className="lg et" />Trabalho</span><span><i className="lg ef" />Folga</span><span><i className="lg ev" />Viagem aérea</span></div></section>
    {!real && <section className="card form inline"><Field label="Dias na obra"><input type="number" value={on} onChange={e => setOn(+e.target.value)} /></Field><Field label="Dias em casa"><input type="number" value={off} onChange={e => setOff(+e.target.value)} /></Field><Field label="Escalonar a cada (dias)"><input type="number" value={stagger} onChange={e => setStagger(+e.target.value)} /></Field></section>}
    {real && <p className="muted small">Ciclo observado na planilha da Valgroup Manaus: cerca de 25 dias na obra e 3 a 4 dias em casa, com técnicos escalonados para sempre haver equipe no cliente.</p>}
  </div>;
}
