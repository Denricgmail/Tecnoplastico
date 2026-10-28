import React, { useMemo, useState } from 'react';
import { useDB, Icon, Pill, statusKind, Field, Sheet, Empty } from '../ui';
import { nextCode, takeCode, codeUsed, propLabel, pricing, brl, num, fmtDate, clientName, MODE_LABEL, todayISO, daysBetween, mondayOf, addDays, freeTeamFrom, uid, toneOf, fmtShort } from '../logic';
import type { Proposal, PricingMode, Job } from '../types';
import { LOGO } from '../logo';
import { pending, ClientForm } from './clientes';

export function Propostas() {
  const { db, go, set } = useDB(); const [f, setF] = useState('todas'); const [creating, setCreating] = useState<boolean>(() => !!pending.propMachine);
  const list = db.proposals.filter(p => f === 'todas' || p.status === f);
  const total = (s?: string) => db.proposals.filter(p => !s || p.status === s).reduce((a, p) => a + pricing(p).value, 0);
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Comercial</p><h1>Propostas</h1><p className="lede">Cada proposta calcula o valor pelo mesmo motor de preço e confere as somas das planilhas.</p></div>
      <button className="btn primary" onClick={() => setCreating(true)}><Icon n="plus" /> Nova proposta</button></header>
    <div className="seg" role="tablist">{['todas', 'Rascunho', 'Enviada', 'Aprovada', 'Recusada'].map(s => <button key={s} role="tab" aria-selected={f === s} className={f === s ? 'on' : ''} onClick={() => setF(s)}>{s === 'todas' ? 'Todas' : s}<small>{brl(total(s === 'todas' ? undefined : s))}</small></button>)}</div>
    <div className="cards">
      {list.map(p => { const pr = pricing(p); const age = p.date ? daysBetween(p.date, todayISO()) : null; const audit = p.audit?.declaredHours && Math.abs(p.audit.declaredHours - pr.hours) > .01;
        return <a key={p.id} href={`#proposta-${p.id}`} className="pcard">
          <div className="pcard-top"><Pill k={statusKind(p.status)}>{p.status}</Pill>{audit && <span className="flag"><Icon n="alert" s={13} /> soma divergente</span>}</div>
          <span className="pc-client">{clientName(db, p.clientId)}</span>
          <h3>{p.title}</h3>
          <div className="pc-meta"><span>{MODE_LABEL[p.pricing.mode]}</span><span>{pr.hours ? `${num(pr.hours, pr.hours % 1 ? 2 : 0)} h` : `${pr.techDays} técnico-dias`}</span><span>~{pr.days} dias úteis</span></div>
          <div className="pc-foot"><b>{brl(pr.value)}</b><small>{p.date ? `${fmtDate(p.date)}${age && p.status === 'Enviada' ? ` · há ${age} dias` : ''}` : 'sem data na planilha'}</small></div>
        </a>; })}
      {!list.length && <Empty title="Nenhuma proposta nesta situação" body="Troque o filtro ou crie uma nova proposta a partir de um checklist." />}
    </div>
    {creating && <NovaProposta onClose={() => setCreating(false)} onCreate={p => { set(d => { takeCode(d, p.number); d.proposals.unshift(p); return d; }); go(`proposta-${p.id}`); }} />}
  </div>;
}

export function NovaProposta({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Proposal) => void }) {
  const { db, set, toast } = useDB(); const pre = pending.propMachine ? db.machines.find(x => x.id === pending.propMachine) : undefined; pending.propMachine = null;
  const [c, setC] = useState(pre?.clientId ?? db.clients[0]?.id ?? ''); const [t, setT] = useState(''); const [m, setM] = useState<PricingMode>('tecnico_dia');
  const machines = db.machines.filter(x => x.clientId === c); const [mc, setMc] = useState(pre?.id ?? ''); const [newC, setNewC] = useState<any>(null);
  const [code, setCode] = useState(nextCode(db)); const codeErr = !/^\d{6,}$/.test(code) ? 'Use o formato AA + 4 dígitos (ex.: 261102)' : codeUsed(db, code) ? 'Este número já está em uso' : '';
  return <Sheet title="Nova proposta" onClose={onClose}>
    <form className="form" onSubmit={e => { e.preventDefault(); if (codeErr) return; onCreate({ id: uid('p'), number: code, clientId: c, machineId: mc || undefined, date: todayISO(), title: t || 'Nova proposta', status: 'Rascunho', origin: 'Criada no sistema', pricing: { mode: m, rate: 160, factor: 1.15, techs: 3, hoursPerDay: 9, days: 5, fixed: 0 }, lines: m === 'tecnico_dia' ? [] : [{ id: uid('l'), group: 'Escopo', desc: 'Descreva o serviço', hours: 8, team: '1 Mecânico' }], scope: m === 'tecnico_dia' ? [{ id: uid('s'), title: 'Escopo do serviço', bullets: ['Descreva as etapas'], days: 5, techs: 2 }] : [], km: 0, meals: true }); }}>
      <Field label="Número" hint={codeErr || 'Serviço sem checklist: começa direto como proposta (PR).'}><div className="row"><span className="trk big">PR</span><input id="np-code" className="grow num" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} /></div></Field>
      <Field label="Cliente"><div className="row"><select id="np-c" className="grow" value={c} onChange={e => { setC(e.target.value); setMc(''); }}>{[...db.clients].sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button type="button" className="btn sm" onClick={() => setNewC({ id: uid('c'), name: '', createdAt: todayISO() })}><Icon n="plus" s={14} /> Novo</button></div></Field>
      <Field label="Máquina"><select id="np-m" value={mc} onChange={e => setMc(e.target.value)}><option value="">Sem máquina específica</option>{machines.map(x => <option key={x.id} value={x.id}>{x.tag}</option>)}</select></Field>
      <Field label="Título"><input id="np-t" value={t} onChange={e => setT(e.target.value)} placeholder="Ex.: Montagem de coextrusora 5 camadas" /></Field>
      <Field label="Como cobrar"><select id="np-mode" value={m} onChange={e => setM(e.target.value as PricingMode)}>{Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <div className="row-end"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary">Criar proposta</button></div>
    </form>{newC && <ClientForm c={newC} onClose={() => setNewC(null)} onSave={x => { set(d => { d.clients.push(x); return d; }); setNewC(null); setC(x.id); setMc(''); toast('Cliente cadastrado'); }} />}</Sheet>;
}

export function PropostaDetail({ id, embedded, view: viewProp }: { id: string; embedded?: boolean; view?: 'interna' | 'cliente' }) {
  const { db, set, go, toast } = useDB(); const p = db.proposals.find(x => x.id === id);
  const [viewS, setView] = useState<'interna' | 'cliente'>('interna'); const view = viewProp ?? viewS; const [approving, setApproving] = useState(false);
  if (!p) return <Empty title="Proposta não encontrada" body="Ela pode ter sido apagada ao restaurar os dados." action={<a className="btn" href="#servicos">Voltar às propostas</a>} />;
  const pr = pricing(p); const client = db.clients.find(c => c.id === p.clientId); const machine = db.machines.find(m => m.id === p.machineId);
  const upd = (fn: (q: Proposal) => void) => set(d => { const q = d.proposals.find(x => x.id === id)!; fn(q); return d; });
  const audit = p.audit; const dh = audit?.declaredHours != null ? pr.hours - audit.declaredHours : 0;
  const editable = p.status !== 'Aprovada';

  return <div className="stack-l">
    {!embedded && <header className="ph">
      <div><a href="#servicos" className="back"><Icon n="back" s={16} /> Propostas</a>
        <p className="eyebrow">{clientName(db, p.clientId)}{machine ? ` · ${machine.tag}` : ''} · {propLabel(p)}</p><h1 className="ttl"><span className="ttl-ic"><Icon n="servicos" s={26} /></span>{p.title}</h1>
        <div className="row"><Pill k={statusKind(p.status)}>{p.status}</Pill><span className="muted small">{p.origin}</span></div></div>
      <div className="row wrap">
        <div className="seg sm"><button className={view === 'interna' ? 'on' : ''} onClick={() => setView('interna')}>Versão interna</button><button className={view === 'cliente' ? 'on' : ''} onClick={() => setView('cliente')}>Versão do cliente</button></div>
        {p.status === 'Rascunho' && <button className="btn" onClick={() => { upd(q => { q.status = 'Enviada'; q.date = todayISO(); }); toast('Proposta marcada como enviada'); }}>Marcar como enviada</button>}
        {(p.status === 'Enviada' || p.status === 'Rascunho') && <><button className="btn ghost" onClick={() => { upd(q => { q.status = 'Recusada'; }); toast('Proposta marcada como recusada'); }}>Recusada</button><button className="btn primary" onClick={() => setApproving(true)}><Icon n="check" /> Aprovar e agendar</button></>}
        {p.jobId && <a className="btn" href={`#obra-${p.jobId}`}>Abrir obra <Icon n="arrow" s={16} /></a>}
      </div>
    </header>}

    {view === 'cliente' ? <ClientDoc p={p} /> : <div className="split">
      <div className="stack">
        {audit && <section className={`audit ${Math.abs(dh) > .01 ? 'bad' : ''}`}>
          <Icon n={Math.abs(dh) > .01 ? 'alert' : 'check'} /><div><b>{Math.abs(dh) > .01 ? `Conferência: ${num(Math.abs(dh), dh % 1 ? 2 : 0)} h ${dh > 0 ? 'ficaram fora' : 'a mais'} do total da planilha` : 'Conferência da planilha'}</b>
            <p>{audit.note}</p>
            <div className="audit-g">{audit.declaredHours != null && <><span>Planilha</span><b>{num(audit.declaredHours, 2)} h</b></>}{audit.declaredValue != null && <><span>Valor na planilha</span><b>{brl(audit.declaredValue, true)}</b></>}
              <span>Sistema</span><b>{pr.hours ? `${num(pr.hours, 2)} h · ` : ''}{brl(pr.value, true)}</b>
              {Math.abs(dh) > .01 && <><span>Diferença</span><b className="neg">{brl(dh * p.pricing.rate * p.pricing.factor, true)}</b></>}</div></div></section>}
        {p.versions && <section className="card"><div className="card-h"><h2>Versões enviadas</h2></div><table className="tbl"><thead><tr><th>Versão</th><th className="r">Horas</th><th className="r">Dias</th><th className="r">Valor</th></tr></thead>
          <tbody>{p.versions.map(v => <tr key={v.label}><td><b>{v.label}</b><div className="muted small">{v.note}</div></td><td className="r num">{num(v.hours)}</td><td className="r num">{v.days}</td><td className="r num">{brl(v.value)}</td></tr>)}</tbody></table></section>}

        {p.pricing.mode === 'tecnico_dia' ? <section className="card"><div className="card-h"><h2>Escopo</h2>{editable && <button className="btn sm" onClick={() => upd(q => { q.scope.push({ id: uid('s'), title: 'Novo item de escopo', bullets: ['Etapa'], days: 1, techs: 2 }); })}><Icon n="plus" s={14} /> Item</button>}</div>
          <div className="scope">{p.scope.map((s, i) => <div key={s.id} className="scope-i">
            <div className="scope-h"><span className="code">{i + 1}</span>{editable ? <input className="inline-in strong" value={s.title} onChange={e => upd(q => { q.scope[i].title = e.target.value; })} aria-label="Título do item" /> : <b>{s.title}</b>}</div>
            <ul>{s.bullets.map((b, k) => <li key={k}>{editable ? <input className="inline-in" value={b} onChange={e => upd(q => { q.scope[i].bullets[k] = e.target.value; })} aria-label="Etapa" /> : b}</li>)}{editable && <li className="add"><button className="link" onClick={() => upd(q => { q.scope[i].bullets.push('Nova etapa'); })}>+ etapa</button></li>}</ul>
            <div className="scope-f"><label>Dias <input type="number" min={0} value={s.days} disabled={!editable} onChange={e => upd(q => { q.scope[i].days = +e.target.value; })} /></label><label>Técnicos <input type="number" min={1} value={s.techs} disabled={!editable} onChange={e => upd(q => { q.scope[i].techs = +e.target.value; })} /></label>
              <b>{brl(s.days * s.techs * pr.techDayValue)}</b>{editable && <button className="btn ghost icon sm" aria-label="Remover item" onClick={() => upd(q => { q.scope.splice(i, 1); })}><Icon n="x" s={14} /></button>}</div>
          </div>)}</div></section>
          : <section className="card"><div className="card-h"><h2>Escopo e horas</h2>{editable && <button className="btn sm" onClick={() => upd(q => { q.lines.push({ id: uid('l'), group: 'Novo grupo', desc: 'Serviço', hours: 1, team: '1 Mecânico' }); })}><Icon n="plus" s={14} /> Linha</button>}</div>
            <div className="tbl-wrap"><table className="tbl lines"><thead><tr><th>Grupo / equipamento</th><th>Serviço</th><th className="r">Horas</th><th className="r">Valor</th><th /></tr></thead>
              <tbody>{p.lines.map((l, i) => <tr key={l.id}>
                <td>{editable ? <input className="inline-in strong" value={l.group} onChange={e => upd(q => { q.lines[i].group = e.target.value; })} aria-label="Grupo" /> : <b>{l.group}</b>}{l.code && <span className="code sm">{l.code}</span>}</td>
                <td className="muted">{l.desc}{(l.team || l.obs) && <div className="small">{[l.team, l.obs].filter(Boolean).join(' · ')}</div>}</td>
                <td className="r"><input type="number" step="0.25" min={0} className="num-in" value={l.hours} disabled={!editable} onChange={e => upd(q => { q.lines[i].hours = +e.target.value; })} aria-label="Horas" /></td>
                <td className="r num">{p.pricing.mode === 'hora' ? brl(l.hours * p.pricing.rate * p.pricing.factor) : '—'}</td>
                <td>{editable && <button className="btn ghost icon sm" aria-label="Remover linha" onClick={() => upd(q => { q.lines.splice(i, 1); })}><Icon n="x" s={14} /></button>}</td></tr>)}</tbody>
              <tfoot><tr><td colSpan={2}>Total</td><td className="r num">{num(pr.hours, pr.hours % 1 ? 2 : 0)} h</td><td className="r num">{p.pricing.mode === 'hora' ? brl(pr.value) : ''}</td><td /></tr></tfoot></table></div></section>}
      </div>

      <aside className="engine">
        <h2>Motor de preço</h2>
        <div className="modes">{(Object.keys(MODE_LABEL) as PricingMode[]).map(m => <button key={m} disabled={!editable} className={p.pricing.mode === m ? 'on' : ''} onClick={() => upd(q => { q.pricing.mode = m; if (m === 'tecnico_dia' && !q.scope.length) q.scope = [{ id: uid('s'), title: q.title, bullets: q.lines.map(l => l.group), days: Math.max(1, pr.days), techs: q.pricing.techs }]; if ((m === 'dia_equipe' || m === 'fechado') && !q.pricing.days) q.pricing.days = Math.max(1, pr.days); })}>{MODE_LABEL[m]}</button>)}</div>
        <div className="eng-in">
          {p.pricing.mode !== 'fechado' && <><Field label="Valor hora técnica"><div className="pre"><span>R$</span><input id="e-rate" type="number" value={p.pricing.rate} disabled={!editable} onChange={e => upd(q => { q.pricing.rate = +e.target.value; })} /></div></Field>
            <Field label="Fator nota fiscal" hint={`${num((p.pricing.factor - 1) * 100, 1)}% sobre o serviço`}><input id="e-fac" type="number" step="0.005" value={p.pricing.factor} disabled={!editable} onChange={e => upd(q => { q.pricing.factor = +e.target.value; })} /></Field></>}
          <Field label="Técnicos na equipe"><input id="e-techs" type="number" min={1} value={p.pricing.techs} disabled={!editable} onChange={e => upd(q => { q.pricing.techs = +e.target.value; })} /></Field>
          <Field label="Horas por dia" hint="Seg–qui 07–17h, sex 07–16h"><input id="e-hpd" type="number" value={p.pricing.hoursPerDay} disabled={!editable} onChange={e => upd(q => { q.pricing.hoursPerDay = +e.target.value; })} /></Field>
          {(p.pricing.mode === 'dia_equipe' || p.pricing.mode === 'fechado') && <Field label="Dias úteis"><input id="e-days" type="number" min={1} value={p.pricing.days} disabled={!editable} onChange={e => upd(q => { q.pricing.days = +e.target.value; })} /></Field>}
          {p.pricing.mode === 'fechado' && <Field label="Valor fechado"><div className="pre"><span>R$</span><input id="e-fixed" type="number" value={p.pricing.fixed} disabled={!editable} onChange={e => upd(q => { q.pricing.fixed = +e.target.value; })} /></div></Field>}
        </div>
        <div className="eng-out">
          <div className="big"><span>Valor do serviço</span><b>{brl(pr.value, true)}</b></div>
          <dl>
            <dt>Prazo estimado</dt><dd>{pr.days} dias úteis{pr.days ? ` (~${Math.ceil(pr.days / 5)} sem.)` : ''}</dd>
            <dt>Técnico-dia</dt><dd>{brl(pr.techDayValue, true)}</dd>
            <dt>Dia de equipe</dt><dd>{brl(pr.teamDayValue, true)}</dd>
            {pr.hours > 0 && <><dt>Valor efetivo por hora</dt><dd className={pr.impliedHourly < p.pricing.rate * .9 ? 'neg' : ''}>{brl(pr.impliedHourly, true)}</dd></>}
            <dt>Parcela nota fiscal</dt><dd>{brl(pr.tax, true)}</dd>
          </dl>
          <div className="eng-sub"><b>Despesas por conta do cliente</b>
            <label className="kmrow">Km rodado (ida e volta) <input type="number" min={0} value={p.km} onChange={e => upd(q => { q.km = +e.target.value; })} aria-label="Quilômetros" /></label>
            <dl><dt>Deslocamento a R$ 3,20/km</dt><dd>{brl(pr.km, true)}</dd><dt>Refeições (2/dia a R$ 75)</dt><dd>{brl(pr.meals, true)}</dd></dl>
            <p className="muted small">Hospedagem, passagens (Viracopos) e traslados ficam com o cliente.</p></div>
          <div className="eng-pay"><span>Entrada 50%</span><b>{brl(pr.value / 2)}</b><span>Na entrega 50%</span><b>{brl(pr.value / 2)}</b></div>
        </div>
      </aside>
    </div>}
    {approving && <Aprovar p={p} onClose={() => setApproving(false)} />}
  </div>;
}

export function Aprovar({ p, onClose }: { p: Proposal; onClose: () => void }) {
  const { db, set, go, toast } = useDB(); const pr = pricing(p);
  const weeksNeeded = Math.max(1, Math.ceil(pr.days / 5));
  const linked = db.jobs.find(j => j.id === p.jobId || j.proposalId === p.id);
  const [techs, setTechs] = useState<string[]>(linked?.techIds.length ? linked.techIds : db.techs.slice(3, 3 + p.pricing.techs).map(t => t.id));
  const suggested = useMemo(() => freeTeamFrom(db, techs, addDays(mondayOf(todayISO()), 7), weeksNeeded), [techs.join(), weeksNeeded]);
  const [start, setStart] = useState<string | null>(null); const s = start ?? suggested;
  const weeks = Array.from({ length: weeksNeeded }, (_, i) => addDays(s, 7 * i));
  const machine = db.machines.find(m => m.id === p.machineId);
  const confirm = () => {
    const prev = db.jobs.find(j => j.id === p.jobId && !j.weeks.length);
    const jid = prev ? prev.id : uid('j');
    set(d => {
      const job: Job = { id: jid, clientId: p.clientId, title: p.title, machine: machine?.tag, type: 'Contrato aprovado', techIds: techs, weeks, status: 'Aguardando', proposalId: p.id, diary: [], expenses: [], materials: [],
        installments: [{ id: uid('i'), label: 'Entrada 50%', value: pr.value / 2, due: weeks[0], paid: false }, { id: uid('i'), label: 'Entrega 50%', value: pr.value / 2, due: addDays(weeks[weeks.length - 1], 4), paid: false }] };
      const old = prev && d.jobs.find(j => j.id === prev.id);
      if (old) { Object.assign(old, { ...job, type: old.type, diary: old.diary, expenses: old.expenses, materials: old.materials }); } else d.jobs.unshift(job);
      const q = d.proposals.find(x => x.id === p.id)!; q.status = 'Aprovada'; q.jobId = jid; return d;
    });
    toast('Serviço aprovado e programado; parcelas criadas no Financeiro'); onClose(); go(`obra-${jid}`);
  };
  return <Sheet title="Aprovar e agendar" onClose={onClose}>
    <div className="form">
      <p className="lede sm">{clientName(db, p.clientId)} · {p.title}. O prazo estimado é de <b>{pr.days} dias úteis</b>, ou {weeksNeeded} semana{weeksNeeded > 1 ? 's' : ''} de obra.</p>
      <Field label="Equipe"><div className="chips pick">{db.techs.map(t => <button type="button" key={t.id} className={`chip ${techs.includes(t.id) ? 'on' : ''}`} style={{ ['--c' as any]: toneOf(t) }} onClick={() => setTechs(x => x.includes(t.id) ? x.filter(y => y !== t.id) : [...x, t.id])}>{t.name}</button>)}</div></Field>
      <Field label="Início (segunda-feira)" hint={start ? 'Data escolhida manualmente' : 'Primeira semana em que toda a equipe está livre'}><input id="ap-start" type="date" value={s} onChange={e => setStart(mondayOf(e.target.value))} /></Field>
      <div className="weeks-prev">{weeks.map(w => <span key={w}>{fmtShort(w)}</span>)}</div>
      <div className="eng-pay"><span>Entrada 50% em {fmtDate(weeks[0])}</span><b>{brl(pr.value / 2)}</b><span>Entrega 50% em {fmtDate(addDays(weeks[weeks.length - 1], 4))}</span><b>{brl(pr.value / 2)}</b></div>
      <div className="row-end"><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!techs.length} onClick={confirm}><Icon n="check" /> Confirmar</button></div>
    </div></Sheet>;
}

export function ClientDoc({ p }: { p: Proposal }) {
  const { db } = useDB(); const pr = pricing(p); const c = db.clients.find(x => x.id === p.clientId)!; const m = db.machines.find(x => x.id === p.machineId);
  const groups = [...new Set(p.lines.map(l => l.group))];
  return <article className="doc">
    <header className="doc-h"><img src={LOGO} alt="" /><div><b>TecnoPlástico</b><span>Instalação, montagem e manutenção de extrusoras e impressoras flexográficas</span></div><div className="doc-n"><span>Orçamento</span><b>PR {p.number}</b><small>{fmtDate(p.date)}</small></div></header>
    <dl className="doc-c"><dt>Empresa</dt><dd>{c.name}</dd><dt>Contato</dt><dd>{p.clientResp ?? c.contact ?? '—'}</dd>{c.phone && <><dt>Fone</dt><dd>{c.phone}</dd></>}{c.email && <><dt>E-mail</dt><dd>{c.email}</dd></>}{m && <><dt>Equipamento</dt><dd>{m.tag}</dd></>}</dl>
    <h2>{p.title}</h2>
    {p.pricing.mode === 'tecnico_dia' ? p.scope.map((s, i) => <section key={s.id} className="doc-s"><h3>{i + 1}. {s.title}</h3><ul>{s.bullets.map((b, k) => <li key={k}>{b}</li>)}</ul>
      <p className="doc-v"><span>Prazo estimado: {String(s.days).padStart(2, '0')} dias úteis (equipe de {s.techs} técnicos)</span><b>{brl(s.days * s.techs * pr.techDayValue, true)}</b></p></section>)
      : <section className="doc-s"><h3>Escopo do serviço</h3><ul className="cols">{groups.map(g => <li key={g}>{g}</li>)}</ul><p className="muted small">Itens detalhados conforme checklist de inspeção. Pontos verificados com a máquina ligada podem exigir nova avaliação na desmontagem; defeitos adicionais serão apresentados em nova proposta.</p></section>}
    <div className="doc-total"><div><span>Prazo total estimado</span><b>{pr.days} dias úteis</b></div><div><span>Valor total dos serviços</span><b>{brl(pr.value, true)}</b></div></div>
    <section className="doc-s two"><div><h3>Deslocamento e despesas</h3><ul><li>Deslocamento: R$ 3,20 por km rodado, com saída e retorno na TecnoPlástico.</li><li>Alimentação: R$ 75,00 por refeição para cada técnico.</li><li>Hospedagem em quartos individuais, lavanderia e passagens aéreas (embarque em Viracopos/Campinas) por conta do contratante.</li></ul></div>
      <div><h3>Pagamento e garantia</h3><ul><li>50% no início do serviço e 50% na entrega.</li><li>Garantia de 30 dias sobre a mão de obra, a partir da conclusão.</li><li>Hora técnica adicional: R$ 160,00.</li><li>Validade da proposta: 10 dias.</li></ul></div></section>
    <p className="muted small">Horário dos técnicos: segunda a quinta das 07h às 17h e sexta das 07h às 16h. Esperas por falta de material, energia, equipamentos de movimentação ou acesso à máquina são registradas no Relatório de Serviços e cobradas como hora técnica adicional.</p>
    <div className="sign"><span>De acordo — {c.name}</span><span>Data ___/___/______</span></div>
  </article>;
}
