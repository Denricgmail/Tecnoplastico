import React from 'react';
import { useDB, Icon, Pill, statusKind, Empty } from '../ui';
import { brl, fmtDate, clientName, pricing, MONTHS, parse, todayISO, uid, addDays } from '../logic';

export function Financeiro() {
  const { db, set, toast } = useDB();
  const rows = db.jobs.flatMap(j => j.installments.map((i, k) => ({ j, i, k }))).sort((a, b) => a.i.due.localeCompare(b.i.due));
  const open = rows.filter(r => !r.i.paid).reduce((s, r) => s + r.i.value, 0);
  const paid = rows.filter(r => r.i.paid).reduce((s, r) => s + r.i.value, 0);
  const late = rows.filter(r => !r.i.paid && r.i.due < todayISO());
  const unbilled = db.jobs.filter(j => j.expenses.length && !j.installments.some(i => i.label.startsWith('Reembolso')));
  const pipe = db.proposals.filter(p => p.status === 'Enviada').reduce((s, p) => s + pricing(p).value, 0);
  const months: Record<string, { open: number; paid: number }> = {};
  rows.forEach(r => { const k = r.i.due.slice(0, 7); months[k] ??= { open: 0, paid: 0 }; months[k][r.i.paid ? 'paid' : 'open'] += r.i.value; });
  const mk = Object.keys(months).sort(); const mmax = Math.max(1, ...mk.map(k => months[k].open + months[k].paid));
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Gestão</p><h1 className="ttl"><span className="ttl-ic"><Icon n="financeiro" s={26} /></span>Financeiro</h1><p className="lede">Parcelas de contrato (50% no início, 50% na entrega), horas de espera e reembolsos de viagem em um só lugar.</p></div></header>
    <section className="kpis">
      <div className="kpi"><span>A receber</span><b>{brl(open)}</b><small>{rows.filter(r => !r.i.paid).length} parcelas em aberto</small></div>
      <div className="kpi"><span>Recebido</span><b>{brl(paid)}</b><small>{rows.filter(r => r.i.paid).length} parcelas</small></div>
      <div className={`kpi ${late.length ? 'warn' : ''}`}><span>Vencidas</span><b>{brl(late.reduce((s, r) => s + r.i.value, 0))}</b><small>{late.length} parcelas</small></div>
      <div className="kpi"><span>Em propostas enviadas</span><b>{brl(pipe)}</b><small>vira parcela quando aprovada</small></div>
    </section>

    {unbilled.length > 0 && <section className="card"><div className="card-h"><h2>Reembolsos ainda não cobrados</h2></div>
      {unbilled.map(j => { const t = j.expenses.reduce((s, e) => s + e.value, 0); return <div key={j.id} className="wait-i"><div><b>{clientName(db, j.clientId)} · {j.title}</b><span>{j.expenses.length} notas de {fmtDate(j.expenses[0].date)} a {fmtDate(j.expenses[j.expenses.length - 1].date)}</span></div><b className="num">{brl(t, true)}</b><a className="link" href={`#obra-${j.id}`}>Ver notas</a>
        <button className="btn primary sm" onClick={() => { set(d => { d.jobs.find(x => x.id === j.id)!.installments.push({ id: uid('i'), label: 'Reembolso de despesas', value: t, due: addDays(todayISO(), 10), paid: false }); return d; }); toast('Cobrança de reembolso criada'); }}>Gerar cobrança</button></div>; })}</section>}

    {mk.length > 0 && <section className="card"><div className="card-h"><h2>Recebimentos por mês</h2><span className="muted">previsto pelos vencimentos das parcelas</span></div>
      <div className="mchart">{mk.map(k => { const m = months[k]; const [y, mo] = k.split('-'); return <div key={k} className="mc"><div className="mc-bar"><i className="o" style={{ height: `${(m.open / mmax) * 100}%` }} /><i className="p" style={{ height: `${(m.paid / mmax) * 100}%` }} /></div><b>{brl(m.open + m.paid)}</b><span>{MONTHS[+mo - 1].slice(0, 3)}/{y.slice(2)}</span></div>; })}</div>
      <div className="legend"><span><i className="lg pay" />Recebido</span><span><i className="lg opn" />A receber</span></div></section>}

    <section className="card flush"><div className="card-h pad"><h2>Parcelas</h2></div>
      {rows.length ? <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Vencimento</th><th>Cliente / obra</th><th>Parcela</th><th className="r">Valor</th><th className="r">Situação</th></tr></thead>
        <tbody>{rows.map(({ j, i, k }) => <tr key={i.id}><td className={`num ${!i.paid && i.due < todayISO() ? 'neg' : ''}`}>{fmtDate(i.due)}</td><td><a href={`#obra-${j.id}`}><b>{clientName(db, j.clientId)}</b></a><div className="muted small">{j.title}</div></td><td>{i.label}</td><td className="r num">{brl(i.value, true)}</td>
          <td className="r"><button className={`btn sm ${i.paid ? 'okb' : ''}`} onClick={() => set(d => { const x = d.jobs.find(y => y.id === j.id)!.installments[k]; x.paid = !x.paid; return d; })}>{i.paid ? <><Icon n="check" s={14} /> Recebido</> : 'Marcar recebido'}</button></td></tr>)}</tbody></table></div>
        : <div className="pad"><Empty title="Nenhuma parcela ainda" body="Os valores de contrato das obras antigas não estavam nas planilhas. Aprove uma proposta (por exemplo, a da Coex 307) e as parcelas de 50% aparecem aqui com as datas da programação." action={<a className="btn primary" href="#servicos">Ir para propostas</a>} /></div>}
    </section>
  </div>;
}
