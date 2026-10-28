import React, { useState } from 'react';
import { TEAMS, normTeam } from './inspecoes';
import { useDB, Icon, Pill, statusKind, Field } from '../ui';
import { clientName, propLabel, pricing, brl, num, jobRange, fmtDate, techName } from '../logic';

export function Clientes() {
  const { db } = useDB(); const [sel, setSel] = useState<string>('metafilm'); const c = db.clients.find(x => x.id === sel)!;
  const ms = db.machines.filter(m => m.clientId === sel); const js = db.jobs.filter(j => j.clientId === sel); const ps = db.proposals.filter(p => p.clientId === sel);
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Cadastro</p><h1>Clientes e máquinas</h1><p className="lede">O parque de máquinas de cada cliente, com o histórico de obras e propostas por equipamento.</p></div></header>
    <div className="split rev">
      <nav className="clist">{db.clients.map(x => { const n = db.machines.filter(m => m.clientId === x.id).length; const v = db.proposals.filter(p => p.clientId === x.id && p.status !== 'Recusada').reduce((s, p) => s + pricing(p).value, 0);
        return <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setSel(x.id)}><b>{x.name}</b><span>{n} máquina{n !== 1 ? 's' : ''} · {db.jobs.filter(j => j.clientId === x.id).length} obras{v ? ` · ${brl(v)}` : ''}</span></button>; })}</nav>
      <div className="stack">
        <section className="card"><div className="card-h"><h2>{c.name}</h2></div>
          <dl className="kv">{c.contact && <><dt>Contato</dt><dd>{c.contact}</dd></>}{c.phone && <><dt>Telefone</dt><dd>{c.phone}</dd></>}{c.email && <><dt>E-mail</dt><dd>{c.email}</dd></>}{c.note && <><dt>Observação</dt><dd>{c.note}</dd></>}{!c.contact && !c.phone && !c.note && <><dt>Cadastro</dt><dd className="muted">CNPJ, endereço e contatos a completar</dd></>}</dl></section>
        <section className="machines">{ms.map(m => { const mj = js.filter(j => j.machine && m.tag.includes(j.machine.replace('Linha ', '')) || j.machine === m.tag); const mp = ps.filter(p => p.machineId === m.id);
          return <article key={m.id} className="mach"><div className="mach-h"><span className={`mk mk-${m.kind}`}>{m.kind === 'extrusora' ? 'EXT' : m.kind === 'impressora' ? 'FLX' : m.kind === 'tnt' ? 'TNT' : 'AUX'}</span><div><b>{m.tag}</b><small>{m.desc}</small></div></div>
            <ul className="hist">{mj.map(j => { const r = jobRange(j); return <li key={j.id}><a href={`#obra-${j.id}`}><Pill k={statusKind(j.status)}>{j.status}</Pill> {j.title}</a><small>{r ? `${fmtDate(r.from)} → ${fmtDate(r.to)}` : 'aguardando programação'} · {j.techIds.map(t => techName(db, t)).join(', ')}</small></li>; })}
              {mp.map(p => <li key={p.id}><a href={`#proposta-${p.id}`}><Pill k={statusKind(p.status)}>{p.status}</Pill> {propLabel(p)}</a><small>{brl(pricing(p).value)}{p.date ? ` · ${fmtDate(p.date)}` : ''}</small></li>)}
              {!mj.length && !mp.length && <li className="muted small">Sem histórico registrado.</li>}</ul></article>; })}</section>
      </div>
    </div>
  </div>;
}

export function Catalogo() {
  const { db, set } = useDB(); const [k, setK] = useState<'extrusora' | 'impressora'>('extrusora'); const [q, setQ] = useState('');
  const items = db.catalog[k]; const groups = [...new Set(items.map(i => i.g))];
  const [g, setG] = useState<string>('todos');
  const list = items.map((it, idx) => ({ it, idx })).filter(({ it }) => (g === 'todos' || it.g === g) && (!q || (it.d + it.c + it.e).toLowerCase().includes(q.toLowerCase())));
  const tot = items.reduce((s, i) => s + i.h, 0);
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Base técnica</p><h1 className="ttl"><span className="ttl-ic"><Icon n="catalogo" s={26} /></span>Catálogo de serviços</h1><p className="lede">Importado das planilhas "Modelo Novo Check list". As horas e equipes padrão alimentam checklists e propostas novas. Edite aqui para recalibrar.</p></div></header>
    <div className="row wrap"><div className="seg sm"><button className={k === 'extrusora' ? 'on' : ''} onClick={() => { setK('extrusora'); setG('todos'); }}>Extrusora coex · {db.catalog.extrusora.length}</button><button className={k === 'impressora' ? 'on' : ''} onClick={() => { setK('impressora'); setG('todos'); }}>Impressora flexo · {db.catalog.impressora.length}</button></div>
      <select aria-label="Grupo" value={g} onChange={e => setG(e.target.value)}><option value="todos">Todos os grupos</option>{groups.map(x => <option key={x}>{x}</option>)}</select>
      <div className="search grow"><Icon n="search" s={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar serviço" aria-label="Buscar serviço" /></div>
      <span className="muted small">{num(tot)} h no catálogo completo</span></div>
    <section className="card flush"><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Código</th><th>Grupo · equipamento</th><th>Serviço</th><th className="r">Horas</th><th>Equipe</th></tr></thead>
      <tbody>{list.slice(0, 250).map(({ it, idx }) => <tr key={idx}><td className="num muted">{it.c}</td><td className="small">{it.g}{it.e && it.e !== it.g ? <div className="muted">{it.e}</div> : null}</td><td><b>{it.d}</b>{it.o && <div className="muted small">{it.o}</div>}</td>
        <td className="r"><input className="num-in" type="number" step={0.5} min={0} value={it.h} aria-label="Horas padrão" onChange={e => set(d => { d.catalog[k][idx].h = +e.target.value; return d; })} /></td>
        <td><select aria-label="Equipe" value={normTeam(it.t)} onChange={e => set(d => { d.catalog[k][idx].t = e.target.value; return d; })}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select></td></tr>)}</tbody></table></div>
      {list.length > 250 && <p className="pad muted small">Mostrando 250 de {list.length}. Use a busca ou o filtro de grupo.</p>}</section>
  </div>;
}

type Row = { pw?: number; pv?: number; mo?: number; mv?: number };
const EX: Record<string, Row> = { '1.1': { pw: 1500, pv: 220, mo: 32.4, mv: 220 }, '1.2': { pw: 1500, pv: 220, mo: 33.1, mv: 220 }, '1.3': { pw: 1500, pv: 220, mo: 41.8, mv: 220 }, '1.4': { pw: 1500, pv: 220, mo: 9999, mv: 220 }, '1.5': { pw: 1500, pv: 220, mo: 32.0, mv: 220 }, '1.6': { pw: 1500, pv: 220, mo: 32.6, mv: 220 } };
export function Medicoes() {
  const [ext, setExt] = useState('A'); const [data, setData] = useState<Record<string, Record<string, Row>>>({ A: EX });
  const rows = data[ext] ?? {};
  const upd = (z: string, k: keyof Row, v: string) => setData(d => ({ ...d, [ext]: { ...(d[ext] ?? {}), [z]: { ...(d[ext]?.[z] ?? {}), [k]: v === '' ? undefined : +v } } }));
  const calc = (r: Row) => {
    const pa = r.pw && r.pv ? r.pw / r.pv : undefined; const po = pa && r.pv ? r.pv / pa : undefined;
    const ma = r.mo != null && r.mv ? (r.mo > 0 ? r.mv / r.mo : 0) : undefined; const mw = ma != null && r.mv ? r.mv * ma : undefined;
    const dev = mw != null && r.pw ? (mw - r.pw) / r.pw : undefined;
    const st = r.mo === 0 ? 'short' : po && r.mo != null && r.mo > po * 5 ? 'open' : dev == null ? '' : Math.abs(dev) > .1 ? 'low' : 'ok';
    return { pa, po, ma, mw, dev, st };
  };
  const zones = Array.from({ length: 10 }, (_, z) => z + 1);
  const all = zones.flatMap(z => Array.from({ length: 6 }, (_, k) => calc(rows[`${z}.${k + 1}`] ?? {})));
  const projKW = zones.flatMap(z => Array.from({ length: 6 }, (_, k) => rows[`${z}.${k + 1}`]?.pw ?? 0)).reduce((a, b) => a + b, 0) / 1000;
  const medKW = all.reduce((s, c) => s + (c.mw ?? 0), 0) / 1000;
  const bad = all.filter(c => c.st === 'open' || c.st === 'low' || c.st === 'short').length;
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Ferramenta de campo</p><h1 className="ttl"><span className="ttl-ic"><Icon n="medicoes" s={26} /></span>Mapeamento de resistências</h1><p className="lede">Substitui a "Tabela de mapeamento de resistências": 10 zonas × 6 resistências por extrusora, valor de projeto contra valor medido, com as fórmulas que hoje estão quebradas (#REF!) na planilha.</p></div></header>
    <div className="row wrap"><div className="seg sm">{'ABCDEFG'.split('').map(l => <button key={l} className={ext === l ? 'on' : ''} onClick={() => setExt(l)}>Extrusora {l}</button>)}</div>{ext === 'A' && <span className="pill pill-wait">Zona 1 com valores de exemplo</span>}</div>
    <section className="kpis three"><div className="kpi"><span>Potência de projeto</span><b>{num(projKW, 2)} kW</b></div><div className="kpi"><span>Potência medida</span><b>{num(medKW, 2)} kW</b><small>{projKW ? `${num((medKW / projKW) * 100, 0)}% do projeto` : '—'}</small></div><div className={`kpi ${bad ? 'warn' : ''}`}><span>Resistências a trocar</span><b>{bad}</b><small>abertas, em curto ou com desvio acima de 10%</small></div></section>
    <section className="card flush"><div className="tbl-wrap"><table className="tbl res"><thead><tr><th rowSpan={2}>Zona</th><th colSpan={4} className="c">Projeto</th><th colSpan={4} className="c">Medido</th><th rowSpan={2} className="r">Desvio</th></tr><tr><th>W</th><th>V</th><th>A</th><th>Ω</th><th>Ω</th><th>V</th><th>A</th><th>W</th></tr></thead>
      <tbody>{zones.map(z => <React.Fragment key={z}>{Array.from({ length: 6 }, (_, k) => { const key = `${z}.${k + 1}`; const r = rows[key] ?? {}; const c = calc(r);
        return <tr key={key} className={c.st ? `rs-${c.st}` : ''}><td className="num">{key}</td>
          <td><input className="num-in" type="number" value={r.pw ?? ''} onChange={e => upd(key, 'pw', e.target.value)} aria-label={`W projeto ${key}`} /></td><td><input className="num-in sm" type="number" value={r.pv ?? ''} onChange={e => upd(key, 'pv', e.target.value)} aria-label={`V projeto ${key}`} /></td>
          <td className="num muted">{c.pa != null ? num(c.pa, 2) : ''}</td><td className="num muted">{c.po != null ? num(c.po, 1) : ''}</td>
          <td><input className="num-in" type="number" step={0.1} value={r.mo ?? ''} onChange={e => upd(key, 'mo', e.target.value)} aria-label={`Ω medido ${key}`} /></td><td><input className="num-in sm" type="number" value={r.mv ?? ''} onChange={e => upd(key, 'mv', e.target.value)} aria-label={`V medido ${key}`} /></td>
          <td className="num muted">{c.ma != null ? num(c.ma, 2) : ''}</td><td className="num">{c.mw != null ? num(c.mw, 0) : ''}</td>
          <td className="r">{c.st === 'open' ? <span className="pill pill-bad">aberta</span> : c.st === 'short' ? <span className="pill pill-bad">em curto</span> : c.dev != null ? <span className={`pill pill-${c.st === 'low' ? 'bad' : 'ok'}`}>{Math.round(c.dev * 100) > 0 ? '+' : ''}{num(Math.round(c.dev * 100) || 0, 0)}%</span> : ''}</td></tr>; })}</React.Fragment>)}</tbody></table></div></section>
    <p className="muted small">Projeto: A = W ÷ V e Ω = V ÷ A. Medido: A = V ÷ Ω e W = V × A. Leitura muito acima do Ω de projeto (multímetro em OL) indica resistência aberta; 0 Ω indica curto. Desvio acima de 10% indica baixa eficiência.</p>
  </div>;
}
