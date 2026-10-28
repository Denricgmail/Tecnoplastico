import React, { useState } from 'react';
import { useDB, Icon, Pill, Empty } from '../ui';
import { propLabel, pricing, brl, num, fmtDate, clientName, todayISO, daysBetween, mondayOf, jobRange, techName, toneOf, MODE_LABEL, uid } from '../logic';
import type { DB, Proposal, Job, JobStatus } from '../types';
import { PropostaDetail, Aprovar, NovaProposta } from './propostas';
import { ObraDetail, TABS, defaultJobTab } from './obras';
import { pending } from './clientes';

export type Stage = 'elaboracao' | 'aprovacao' | 'programar' | 'programado' | 'execucao' | 'concluido' | 'encerrado';
export const STAGES: { k: Stage; l: string; pill: string }[] = [
  { k: 'elaboracao', l: 'Em elaboração', pill: 'mute' }, { k: 'aprovacao', l: 'Aguardando aprovação', pill: 'wait' },
  { k: 'programar', l: 'Aprovado · a programar', pill: 'wait' }, { k: 'programado', l: 'Programado', pill: 'run' },
  { k: 'execucao', l: 'Em execução', pill: 'run' }, { k: 'concluido', l: 'Concluído', pill: 'ok' }, { k: 'encerrado', l: 'Recusado / cancelado', pill: 'bad' },
];
const STEPS: { k: Stage; l: string }[] = [{ k: 'elaboracao', l: 'Proposta' }, { k: 'aprovacao', l: 'Enviada' }, { k: 'programar', l: 'Aprovada' }, { k: 'programado', l: 'Programada' }, { k: 'execucao', l: 'Em execução' }, { k: 'concluido', l: 'Concluída' }];

export interface Svc { key: string; p?: Proposal; j?: Job; clientId: string; title: string; stage: Stage; value: number | null; machine?: string; date?: string }

export function stageOf(p: Proposal | undefined, j: Job | undefined): Stage {
  const wk = mondayOf(todayISO());
  if (j) {
    if (j.status === 'Cancelado') return 'encerrado';
    if (j.status === 'Executando' || j.weeks.includes(wk)) return 'execucao';
    if (j.status === 'Finalizado') return 'concluido';
    if (j.weeks.length) return [...j.weeks].sort()[j.weeks.length - 1] < wk ? 'concluido' : 'programado';
    if (p && p.status !== 'Aprovada') return p.status === 'Rascunho' ? 'elaboracao' : p.status === 'Recusada' ? 'encerrado' : 'aprovacao';
    if (!p) return 'aprovacao'; // "Aguardando" no cronograma, sem proposta no sistema
    return 'programar';
  }
  if (!p) return 'elaboracao';
  return p.status === 'Rascunho' ? 'elaboracao' : p.status === 'Enviada' ? 'aprovacao' : p.status === 'Recusada' ? 'encerrado' : 'programar';
}

export function services(db: DB): Svc[] {
  const out: Svc[] = [];
  db.proposals.forEach(p => { const j = db.jobs.find(x => x.id === p.jobId || x.proposalId === p.id);
    out.push({ key: `p-${p.id}`, p, j, clientId: p.clientId, title: p.title, stage: stageOf(p, j), value: pricing(p).value, machine: db.machines.find(m => m.id === p.machineId)?.tag ?? j?.machine, date: p.date }); });
  db.jobs.forEach(j => { if (out.some(s => s.j?.id === j.id)) return;
    out.push({ key: `j-${j.id}`, j, clientId: j.clientId, title: j.title, stage: stageOf(undefined, j), value: null, machine: j.machine, date: jobRange(j)?.from }); });
  return out;
}
export const svcHrefForProposal = (id: string) => `#servico-p-${id}`;
export function svcHrefForJob(db: DB, id: string) { const j = db.jobs.find(x => x.id === id); const p = j && db.proposals.find(x => x.id === j.proposalId || x.jobId === j.id); return p ? `#servico-p-${p.id}` : `#servico-j-${id}`; }

export function Servicos() {
  const { db, set, go } = useDB(); const [f, setF] = useState<string>('ativos'); const [creating, setCreating] = useState<boolean>(() => !!pending.propMachine); const [q, setQ] = useState('');
  const all = services(db);
  const active = (s: Svc) => s.stage !== 'concluido' && s.stage !== 'encerrado';
  const filters: { k: string; l: string; test: (s: Svc) => boolean }[] = [
    { k: 'ativos', l: 'Em aberto', test: active }, ...STAGES.map(st => ({ k: st.k, l: st.l, test: (s: Svc) => s.stage === st.k })), { k: 'todos', l: 'Todos', test: () => true }];
  const cur = filters.find(x => x.k === f)!;
  const order = STAGES.map(s => s.k);
  const list = all.filter(cur.test).filter(s => !q || [clientName(db, s.clientId), s.title, s.machine, s.p?.number, s.p && propLabel(s.p), s.p && `CK ${s.p.number}`].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage) || (b.date ?? '').localeCompare(a.date ?? ''));
  const wk = mondayOf(todayISO());
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Comercial e operação</p><h1 className="ttl"><span className="ttl-ic"><Icon n="servicos" s={26} /></span>Serviços</h1><p className="lede">Cada serviço nasce como proposta e segue no mesmo registro até a conclusão: aprovação, programação, execução, despesas e cobrança.</p></div>
      <button className="btn primary" onClick={() => setCreating(true)}><Icon n="plus" /> Novo serviço</button></header>
    <div className="stage-strip">{STAGES.filter(s => s.k !== 'encerrado').map(st => { const ss = all.filter(s => s.stage === st.k); const v = ss.reduce((a, s) => a + (s.value ?? 0), 0);
      return <button key={st.k} className={`stage-box ${f === st.k ? 'on' : ''}`} onClick={() => setF(f === st.k ? 'ativos' : st.k)}><span>{st.l}</span><b>{ss.length}</b><small>{v ? brl(v) : '—'}</small></button>; })}</div>
    <div className="row wrap"><div className="seg sm">{[filters[0], filters[filters.length - 2], filters[filters.length - 1]].map(x => <button key={x.k} className={f === x.k ? 'on' : ''} onClick={() => setF(x.k)}>{x.l}<small>{all.filter(x.test).length}</small></button>)}</div>
      {!['ativos', 'encerrado', 'todos'].includes(f) && <span className="pill pill-run">Filtro: {cur.l}</span>}
      <div className="search grow"><Icon n="search" s={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cliente, máquina, título ou número" aria-label="Buscar serviço" /></div></div>
    <div className="cards">{list.map(s => { const st = STAGES.find(x => x.k === s.stage)!; const r = s.j ? jobRange(s.j) : null; const pr = s.p ? pricing(s.p) : null;
      const audit = s.p?.audit?.declaredHours != null && pr && Math.abs(s.p.audit.declaredHours - pr.hours) > .01; const age = s.p?.date && s.stage === 'aprovacao' ? daysBetween(s.p.date, todayISO()) : null;
      return <a key={s.key} href={`#servico-${s.key}`} className="pcard">
        <div className="pcard-top"><Pill k={s.j?.weeks.includes(wk) ? 'run' : st.pill}>{s.j?.weeks.includes(wk) ? 'Em campo' : st.l}</Pill>{audit && <span className="flag"><Icon n="alert" s={13} /> soma divergente</span>}</div>
        <span className="pc-client">{clientName(db, s.clientId)}{s.machine ? ` · ${s.machine}` : ''}</span><h3><span className="trk">{s.p ? propLabel(s.p) : s.stage === 'aprovacao' ? 'PR s/n' : 'OS s/n'}</span> {s.title}</h3>
        <MiniSteps stage={s.stage} />
        {s.j && s.j.techIds.length > 0 && <div className="chips xs">{s.j.techIds.map(t => <span key={t} className="chip" style={{ ['--c' as any]: toneOf(db.techs.find(x => x.id === t)) }}>{techName(db, t)}</span>)}</div>}
        <div className="pc-foot"><b>{s.value != null ? brl(s.value) : <span className="muted small">sem proposta no sistema</span>}</b>
          <small>{r ? `${fmtDate(r.from)} → ${fmtDate(r.to)}` : s.p?.date ? `${fmtDate(s.p.date)}${age && age > 0 ? ` · há ${age} dias` : ''}` : pr ? `${MODE_LABEL[s.p!.pricing.mode].toLowerCase()}` : 'a programar'}</small></div>
      </a>; })}
      {!list.length && <Empty title="Nenhum serviço nesta etapa" body="Troque o filtro ou crie um novo serviço." />}</div>
    {creating && <NovaProposta onClose={() => setCreating(false)} onCreate={p => { set(d => { d.proposals.unshift(p); return d; }); setCreating(false); go(`servico-p-${p.id}`); }} />}
  </div>;
}

function MiniSteps({ stage }: { stage: Stage }) {
  if (stage === 'encerrado') return <div className="msteps off"><i /><span>Encerrado</span></div>;
  const idx = STEPS.findIndex(s => s.k === stage);
  return <div className="msteps" aria-label={`Etapa ${idx + 1} de ${STEPS.length}`}>{STEPS.map((s, i) => <i key={s.k} className={i < idx ? 'done' : i === idx ? 'cur' : ''} title={s.l} />)}</div>;
}

export function ServicoDetail({ sid }: { sid: string }) {
  const { db, set, toast } = useDB();
  const kind = sid.slice(0, 1); const id = sid.slice(2);
  let p = kind === 'p' ? db.proposals.find(x => x.id === id) : undefined;
  let j = kind === 'j' ? db.jobs.find(x => x.id === id) : p ? db.jobs.find(x => x.id === p!.jobId || x.proposalId === p!.id) : undefined;
  if (!p && j?.proposalId) p = db.proposals.find(x => x.id === j!.proposalId);
  const stage = stageOf(p, j);
  const insp = p ? db.inspections.find(i => i.proposalId === p!.id && !i.legacy) : undefined;
  const ptabs = p ? [['proposta', 'Proposta e preço'], ['cliente', 'Versão do cliente']] : [];
  const showJob = !!j && (!p || p.status === 'Aprovada');
  const jtabs = showJob ? TABS.filter(([k]) => k !== 'escala' || j!.travel || j!.techIds.length).map(([k, l]) => [k, k === 'resumo' ? 'Equipe e cobrança' : l]) : [];
  const execStage = ['execucao', 'concluido', 'programado'].includes(stage);
  const [tab, setTab] = useState<string>(j && execStage ? defaultJobTab(j) : p ? 'proposta' : j ? defaultJobTab(j) : 'proposta');
  const [approving, setApproving] = useState(false);
  if (!p && !j) return <Empty title="Serviço não encontrado" body="Ele pode ter sido removido ao restaurar os dados." action={<a className="btn" href="#servicos">Voltar aos serviços</a>} />;
  const machine = (p && db.machines.find(m => m.id === p!.machineId)?.tag) ?? j?.machine;
  const st = STAGES.find(x => x.k === stage)!; const r = j ? jobRange(j) : null; const pr = p ? pricing(p) : null;
  const updP = (fn: (q: Proposal) => void) => set(d => { fn(d.proposals.find(x => x.id === p!.id)!); return d; });
  const updJ = (fn: (x: Job) => void) => set(d => { fn(d.jobs.find(x => x.id === j!.id)!); return d; });
  const idx = STEPS.findIndex(s => s.k === stage);
  const counts: Record<string, number> = j ? { diario: j.diary.length, despesas: j.expenses.length, materiais: j.materials.length } : {};
  const all = [...ptabs, ...jtabs];
  const curTab = all.some(([k]) => k === tab) ? tab : all[0][0];

  return <div className="stack-l">
    <header className="ph">
      <div><a href="#servicos" className="back"><Icon n="back" s={16} /> Serviços</a>
        <p className="eyebrow">{clientName(db, (p ?? j)!.clientId)}{machine ? ` · ${machine}` : ''}{j?.ref ? ` · ${j.ref}` : ''}</p>
        <h1 className="ttl"><span className="ttl-ic"><Icon n="servicos" s={26} /></span>{p?.title ?? j!.title}</h1><span className="trk lg">{p ? propLabel(p) : stage === 'aprovacao' ? 'PR s/n' : 'OS s/n'}{insp ? <em> · CK {insp.code ?? p?.number}</em> : null}</span>
        <div className="row wrap"><Pill k={st.pill}>{st.l}</Pill>{pr && <b className="num">{brl(pr.value)}</b>}{r && <span className="muted small">{fmtDate(r.from)} → {fmtDate(r.to)}</span>}{p && <span className="muted small">{p.origin}</span>}</div></div>
      <div className="row wrap">
        {insp && <button className="btn" onClick={() => { pending.inspOpen = insp.id; location.hash = 'inspecoes'; }}><Icon n="inspecoes" s={15} /> Ver checklist</button>}
        {p && p.status === 'Rascunho' && <button className="btn" onClick={() => { updP(q => { q.status = 'Enviada'; q.date = todayISO(); }); toast('Proposta marcada como enviada'); }}>Marcar como enviada</button>}
        {p && (p.status === 'Enviada' || p.status === 'Rascunho') && <><button className="btn ghost" onClick={() => { updP(q => { q.status = 'Recusada'; }); toast('Serviço marcado como recusado'); }}>Recusada</button><button className="btn primary" onClick={() => setApproving(true)}><Icon n="check" /> Aprovar e agendar</button></>}
        {j && (!p || p.status === 'Aprovada') && <label className="row small">Situação <select aria-label="Situação do serviço" value={j.status} onChange={e => { updJ(x => { x.status = e.target.value as JobStatus; }); toast(`Serviço marcado como ${e.target.value}`); }}>{['Aguardando', 'Executando', 'Finalizado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}</select></label>}
      </div>
    </header>

    {stage !== 'encerrado' && <ol className="steps">{STEPS.map((s, i) => <li key={s.k} className={i < idx ? 'done' : i === idx ? 'cur' : ''}><i>{i < idx ? <Icon n="check" s={12} /> : i + 1}</i><span>{s.l}</span></li>)}</ol>}

    <div className="tabs" role="tablist">
      {ptabs.map(([k, l]) => <button key={k} role="tab" aria-selected={curTab === k} className={curTab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      {ptabs.length > 0 && jtabs.length > 0 && <span className="tab-sep" aria-hidden="true" />}
      {jtabs.map(([k, l]) => <button key={k} role="tab" aria-selected={curTab === k} className={curTab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{counts[k] ? <small>{counts[k]}</small> : null}</button>)}
      {!showJob && p && <span className="tab-hint">Equipe, diário, despesas e cobrança aparecem depois da aprovação</span>}
    </div>

    {(curTab === 'proposta' || curTab === 'cliente') && p && <PropostaDetail id={p.id} embedded view={curTab === 'cliente' ? 'cliente' : 'interna'} />}
    {showJob && j && jtabs.some(([k]) => k === curTab) && <ObraDetail id={j.id} embedded tab={curTab} key={j.id + curTab} />}
    {!p && j && curTab === 'resumo' && <p className="muted small">Serviço importado do cronograma, sem proposta no sistema. O valor do contrato não estava nas planilhas.</p>}
    {approving && p && <Aprovar p={p} onClose={() => setApproving(false)} />}
  </div>;
}
