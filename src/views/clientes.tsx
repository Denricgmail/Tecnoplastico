import React, { useState } from 'react';
import { useDB, Icon, Pill, statusKind, Field, Sheet, Empty } from '../ui';
import { propLabel, ckLabel, pricing, brl, fmtDate, jobRange, techName, uid, todayISO } from '../logic';
import type { Client, Machine, MachineKind } from '../types';

export const pending: { inspMachine: string | null; propMachine: string | null; inspOpen: string | null } = { inspMachine: null, propMachine: null, inspOpen: null };
export const KIND_LABEL: Record<MachineKind, string> = { extrusora: 'Extrusora / coextrusora', impressora: 'Impressora flexográfica', tnt: 'Linha TNT', outra: 'Outro equipamento' };
const KIND_TAG: Record<MachineKind, string> = { extrusora: 'EXT', impressora: 'FLX', tnt: 'TNT', outra: 'AUX' };
const fmtCnpj = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 14); return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); };
const fmtPhone = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3') : d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, ''); };

export function cnpjValid(v: string) {
  const d = v.replace(/\D/g, ''); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => { const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; const s = w.reduce((a, x, i) => a + x * +d[i], 0) % 11; return s < 2 ? 0 : 11 - s; };
  return calc(12) === +d[12] && calc(13) === +d[13];
}
const title = (s?: string) => (s ?? '').toLowerCase().replace(/(^|\s|\/|-)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, w => w.toLowerCase()).replace(/\b(Ltda|S\/a|Me|Epp|Eireli)\b/gi, w => w.toUpperCase());
const shortName = (s?: string) => title(s).replace(/[\s,.-]*(S\.?\/?A\.?|Ltda\.?|LTDA\.?|ME|EPP|EIRELI)\s*$/i, '').trim();
export type CnpjData = Partial<Client> & { situacao?: string; atividade?: string };
async function getJSON(url: string) { const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000); try { const r = await fetch(url, { signal: ctl.signal }); if (r.status === 404) throw new Error('not_found'); if (!r.ok) throw new Error('http'); return await r.json(); } finally { clearTimeout(t); } }
export async function lookupCnpj(cnpj: string): Promise<CnpjData> {
  const d = cnpj.replace(/\D/g, '');
  try {
    const j = await getJSON(`https://brasilapi.com.br/api/cnpj/v1/${d}`);
    const end = [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' ');
    return { razao: j.razao_social, name: shortName(j.nome_fantasia || j.razao_social), city: title(j.municipio), uf: j.uf,
      address: [title(end), j.numero, title(j.complemento), title(j.bairro), j.cep && `CEP ${String(j.cep).replace(/(\d{5})(\d{3})/, '$1-$2')}`].filter(Boolean).join(', '),
      phone: j.ddd_telefone_1 ? fmtPhone(String(j.ddd_telefone_1)) : undefined, email: j.email ? String(j.email).toLowerCase() : undefined,
      situacao: j.descricao_situacao_cadastral, atividade: j.cnae_fiscal_descricao };
  } catch (e: any) {
    if (e?.message === 'not_found') throw e;
    const j = await getJSON(`https://publica.cnpj.ws/cnpj/${d}`); const est = j.estabelecimento ?? {};
    return { razao: j.razao_social, name: shortName(est.nome_fantasia || j.razao_social), city: title(est.cidade?.nome), uf: est.estado?.sigla,
      address: [title([est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ')), est.numero, title(est.complemento), title(est.bairro), est.cep && `CEP ${String(est.cep).replace(/(\d{5})(\d{3})/, '$1-$2')}`].filter(Boolean).join(', '),
      phone: est.ddd1 && est.telefone1 ? fmtPhone(`${est.ddd1}${est.telefone1}`) : undefined, email: est.email?.toLowerCase(), situacao: est.situacao_cadastral, atividade: est.atividade_principal?.descricao };
  }
}

export const machineSummary = (m: Machine) => [KIND_LABEL[m.kind], m.kind === 'extrusora' && m.extruders ? `${m.extruders} extrusora${m.extruders > 1 ? 's' : ''}` : '', m.kind === 'impressora' && m.colors ? `${m.colors} cores` : '', m.maker, m.model].filter(Boolean).join(' · ');

export function Clientes() {
  const { db, set, toast, go } = useDB();
  const [sel, setSel] = useState<string>(db.clients[0]?.id ?? ''); const [q, setQ] = useState('');
  const [editC, setEditC] = useState<Client | null>(null); const [editM, setEditM] = useState<Machine | null>(null); const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const list = db.clients.filter(c => !q || [c.name, c.razao, c.cnpj, c.city, c.contact].join(' ').toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const c = db.clients.find(x => x.id === sel) ?? list[0];
  const ms = c ? db.machines.filter(m => m.clientId === c.id) : [];
  const links = (id: string) => db.proposals.filter(p => p.clientId === id).length + db.jobs.filter(j => j.clientId === id).length + db.inspections.filter(i => i.clientId === id).length;
  const saveClient = (x: Client) => { set(d => { const i = d.clients.findIndex(y => y.id === x.id); if (i >= 0) d.clients[i] = x; else d.clients.push(x); return d; }); setSel(x.id); setEditC(null); toast('Cliente salvo'); };
  const saveMachine = (m: Machine) => { set(d => { const i = d.machines.findIndex(y => y.id === m.id); if (i >= 0) d.machines[i] = m; else d.machines.push(m); return d; }); setEditM(null); toast('Máquina salva no parque do cliente'); };
  const mLinks = (m: Machine) => db.proposals.filter(p => p.machineId === m.id).length + db.inspections.filter(i => i.machineId === m.id || (i.clientId === m.clientId && i.machineTag === m.tag)).length;

  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Cadastro</p><h1 className="ttl"><span className="ttl-ic"><Icon n="clientes" s={26} /></span>Clientes e máquinas</h1><p className="lede">Cadastro de clientes e do parque de máquinas de cada um. Checklists e propostas escolhem o cliente e a máquina daqui, e o histórico de cada equipamento fica junto.</p></div>
      <button className="btn primary" onClick={() => setEditC({ id: uid('c'), name: '', createdAt: todayISO() })}><Icon n="plus" /> Novo cliente</button></header>
    <div className="split rev">
      <div className="stack">
        <div className="search"><Icon n="search" s={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Nome, CNPJ, cidade ou contato" aria-label="Buscar cliente" /></div>
        <nav className="clist">{list.map(x => { const n = db.machines.filter(m => m.clientId === x.id).length; const v = db.proposals.filter(p => p.clientId === x.id && p.status !== 'Recusada').reduce((s, p) => s + pricing(p).value, 0);
          return <button key={x.id} className={c?.id === x.id ? 'on' : ''} onClick={() => setSel(x.id)}><b>{x.name}</b><span>{[x.city && `${x.city}${x.uf ? `/${x.uf}` : ''}`, `${n} máquina${n !== 1 ? 's' : ''}`, v ? brl(v) : ''].filter(Boolean).join(' · ')}</span></button>; })}
          {!list.length && <p className="muted small pad">Nenhum cliente encontrado.</p>}</nav>
      </div>
      {c ? <div className="stack">
        <section className="card">
          <div className="card-h"><div><h2>{c.name}</h2>{c.razao && c.razao !== c.name && <p className="muted small">{c.razao}</p>}</div>
            <div className="row wrap"><button className="btn sm" onClick={() => setEditC({ ...c })}><Icon n="doc" s={14} /> Editar dados</button>
              {confirmDel === c.id ? <><button className="btn sm" onClick={() => { set(d => { d.clients = d.clients.filter(y => y.id !== c.id); d.machines = d.machines.filter(m => m.clientId !== c.id); return d; }); setConfirmDel(null); setSel(''); toast('Cliente excluído'); }}>Confirmar exclusão</button><button className="btn ghost sm" onClick={() => setConfirmDel(null)}>Cancelar</button></>
                : <button className="btn ghost sm" disabled={links(c.id) > 0} title={links(c.id) ? 'Cliente com propostas, obras ou checklists não pode ser excluído' : 'Excluir cliente'} onClick={() => setConfirmDel(c.id)}>Excluir</button>}</div></div>
          <dl className="kv cdata">
            <dt>CNPJ</dt><dd>{c.cnpj || <span className="muted">a completar</span>}</dd>
            <dt>Contato</dt><dd>{c.contact || <span className="muted">a completar</span>}</dd>
            <dt>Telefone</dt><dd>{c.phone || <span className="muted">a completar</span>}</dd>
            <dt>E-mail</dt><dd>{c.email || <span className="muted">a completar</span>}</dd>
            <dt>Cidade</dt><dd>{c.city ? `${c.city}${c.uf ? ` / ${c.uf}` : ''}` : <span className="muted">a completar</span>}</dd>
            {c.address && <><dt>Endereço</dt><dd>{c.address}</dd></>}{c.unit && <><dt>Unidade / planta</dt><dd>{c.unit}</dd></>}{c.note && <><dt>Observação</dt><dd>{c.note}</dd></>}
          </dl></section>

        <div className="card-h"><h2>Parque de máquinas</h2><button className="btn sm" onClick={() => setEditM({ id: uid('m'), clientId: c.id, tag: '', kind: 'extrusora', desc: '', extruders: 3 })}><Icon n="plus" s={14} /> Cadastrar máquina</button></div>
        {ms.length ? <section className="machines">{ms.map(m => {
          const mi = db.inspections.filter(i => i.machineId === m.id || (i.clientId === m.clientId && i.machineTag === m.tag));
          const mp = db.proposals.filter(p => p.machineId === m.id);
          const mj = db.jobs.filter(j => j.clientId === m.clientId && j.machine && (j.machine === m.tag || m.tag.includes(j.machine.replace('Linha ', ''))));
          return <article key={m.id} className="mach">
            <div className="mach-h"><span className={`mk mk-${m.kind}`}>{KIND_TAG[m.kind]}</span><div><b>{m.tag}</b><small>{machineSummary(m)}</small></div>
              <button className="btn ghost icon sm" aria-label={`Editar ${m.tag}`} onClick={() => setEditM({ ...m })}><Icon n="doc" s={14} /></button></div>
            {(m.serial || m.year || m.desc) && <p className="muted small">{[m.serial && `Série ${m.serial}`, m.year && `Ano ${m.year}`, m.desc].filter(Boolean).join(' · ')}</p>}
            <ul className="hist">
              {mi.map(i => <li key={i.id}><a href="#inspecoes"><Pill k="mute">Checklist</Pill> {ckLabel(i)} · {fmtDate(i.date) !== '—' ? fmtDate(i.date) : 'importada'} · {i.techName}</a></li>)}
              {mp.map(p => <li key={p.id}><a href={`#proposta-${p.id}`}><Pill k={statusKind(p.status)}>{p.status}</Pill> {propLabel(p)}</a><small>{brl(pricing(p).value)}{p.date ? ` · ${fmtDate(p.date)}` : ''}</small></li>)}
              {mj.map(j => { const r = jobRange(j); return <li key={j.id}><a href={`#obra-${j.id}`}><Pill k={statusKind(j.status)}>{j.status}</Pill> {j.title}</a><small>{r ? `${fmtDate(r.from)} → ${fmtDate(r.to)}` : 'aguardando programação'} · {j.techIds.map(t => techName(db, t)).join(', ')}</small></li>; })}
              {!mi.length && !mp.length && !mj.length && <li className="muted small">Sem histórico ainda.</li>}
            </ul>
            <div className="row wrap mach-act">{(m.kind === 'extrusora' || m.kind === 'impressora') && <button className="btn sm" onClick={() => { pending.inspMachine = m.id; go('inspecoes'); }}><Icon n="inspecoes" s={14} /> Novo checklist</button>}
              <button className="btn ghost sm" onClick={() => { pending.propMachine = m.id; go('servicos'); }}><Icon n="propostas" s={14} /> Nova proposta</button></div>
          </article>; })}</section>
          : <Empty title="Nenhuma máquina cadastrada" body="Cadastre as extrusoras, impressoras e periféricos deste cliente. Eles aparecem para escolha nos checklists e propostas." action={<button className="btn primary" onClick={() => setEditM({ id: uid('m'), clientId: c.id, tag: '', kind: 'extrusora', desc: '', extruders: 3 })}><Icon n="plus" /> Cadastrar máquina</button>} />}
      </div> : <Empty title="Nenhum cliente cadastrado" body="Cadastre o primeiro cliente para começar." />}
    </div>
    {editC && <ClientForm c={editC} onClose={() => setEditC(null)} onSave={saveClient} />}
    {editM && <MachineForm m={editM} onClose={() => setEditM(null)} onSave={saveMachine} onDelete={mLinks(editM) ? undefined : () => { set(d => { d.machines = d.machines.filter(x => x.id !== editM.id); return d; }); setEditM(null); toast('Máquina removida'); }} />}
  </div>;
}

export function ClientForm({ c, onClose, onSave }: { c: Client; onClose: () => void; onSave: (c: Client) => void }) {
  const [f, setF] = useState<Client>(c); const up = (k: keyof Client, v: string) => setF(x => ({ ...x, [k]: v }));
  const isNew = !c.name;
  const [look, setLook] = useState<{ st: 'idle' | 'busy' | 'ok' | 'err' | 'bad'; msg?: string }>({ st: 'idle' });
  const buscar = async (cnpj = f.cnpj ?? '') => {
    if (!cnpjValid(cnpj)) { setLook({ st: 'bad', msg: 'CNPJ inválido: confira os números.' }); return; }
    setLook({ st: 'busy' });
    try {
      const r = await lookupCnpj(cnpj);
      setF(x => ({ ...x, razao: r.razao || x.razao, name: x.name || r.name || '', city: r.city || x.city, uf: r.uf || x.uf, address: r.address || x.address, phone: x.phone || r.phone, email: x.email || r.email,
        note: x.note || [r.atividade && `Atividade: ${r.atividade}`, r.situacao && `Situação na Receita: ${r.situacao}`].filter(Boolean).join('\n') }));
      setLook({ st: 'ok', msg: `Dados da Receita carregados${r.situacao ? ` · situação ${String(r.situacao).toLowerCase()}` : ''}. Confira e complete o contato.` });
    } catch (e: any) {
      setLook(e?.message === 'not_found' ? { st: 'err', msg: 'CNPJ não encontrado na base da Receita.' } : { st: 'err', msg: 'Não foi possível consultar a Receita agora. Nesta versão de demonstração a consulta externa é bloqueada; no sistema instalado ela funciona. Preencha os dados manualmente.' });
    }
  };
  return <Sheet title={isNew ? 'Novo cliente' : `Editar ${c.name}`} onClose={onClose}><form className="form" onSubmit={e => { e.preventDefault(); if (!f.name.trim()) return; onSave({ ...f, name: f.name.trim() }); }}>
    <Field label="CNPJ" hint="Digite o CNPJ e os dados da Receita são preenchidos automaticamente"><div className="row"><input id="cf-cnpj" className="grow" inputMode="numeric" value={f.cnpj ?? ''} onChange={e => { const v = fmtCnpj(e.target.value); up('cnpj', v); setLook({ st: 'idle' }); if (v.replace(/\D/g, '').length === 14) buscar(v); }} placeholder="00.000.000/0000-00" />
      <button type="button" className="btn sm" disabled={look.st === 'busy' || (f.cnpj ?? '').replace(/\D/g, '').length !== 14} onClick={() => buscar()}>{look.st === 'busy' ? 'Buscando…' : <><Icon n="search" s={14} /> Buscar</>}</button></div></Field>
    {look.st !== 'idle' && look.st !== 'busy' && <div className={`lookmsg lk-${look.st}`} role="status"><Icon n={look.st === 'ok' ? 'check' : 'alert'} s={15} /><span>{look.msg}</span></div>}
    <Field label="Nome do cliente *" hint="Como a equipe chama o cliente no dia a dia"><input id="cf-name" required value={f.name} onChange={e => up('name', e.target.value)} placeholder="Ex.: Metafilm" /></Field>
    <Field label="Razão social"><input id="cf-razao" value={f.razao ?? ''} onChange={e => up('razao', e.target.value)} /></Field>
    <div className="row2"><Field label="Contato"><input id="cf-contact" value={f.contact ?? ''} onChange={e => up('contact', e.target.value)} placeholder="Nome do responsável" /></Field>
      <Field label="Telefone / WhatsApp"><input id="cf-phone" inputMode="tel" value={f.phone ?? ''} onChange={e => up('phone', fmtPhone(e.target.value))} placeholder="(00) 00000-0000" /></Field></div>
    <Field label="E-mail"><input id="cf-email" type="email" value={f.email ?? ''} onChange={e => up('email', e.target.value)} /></Field>
    <div className="row2"><Field label="Cidade"><input id="cf-city" value={f.city ?? ''} onChange={e => up('city', e.target.value)} /></Field><Field label="UF"><input id="cf-uf" maxLength={2} value={f.uf ?? ''} onChange={e => up('uf', e.target.value.toUpperCase())} /></Field></div>
    <Field label="Endereço"><input id="cf-addr" value={f.address ?? ''} onChange={e => up('address', e.target.value)} /></Field>
    <Field label="Unidade / planta" hint="Ex.: Unidade Manaus, Planta 2"><input id="cf-unit" value={f.unit ?? ''} onChange={e => up('unit', e.target.value)} /></Field>
    <Field label="Observações"><textarea id="cf-note" rows={3} value={f.note ?? ''} onChange={e => up('note', e.target.value)} /></Field>
    <div className="row-end"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary">{isNew ? 'Cadastrar cliente' : 'Salvar alterações'}</button></div>
  </form></Sheet>;
}

export function MachineForm({ m, onClose, onSave, onDelete }: { m: Machine; onClose: () => void; onSave: (m: Machine) => void; onDelete?: () => void }) {
  const { db } = useDB(); const [f, setF] = useState<Machine>(m); const up = (k: keyof Machine, v: any) => setF(x => ({ ...x, [k]: v }));
  const isNew = !db.machines.some(x => x.id === m.id);
  return <Sheet title={isNew ? 'Cadastrar máquina' : `Editar ${m.tag}`} onClose={onClose}><form className="form" onSubmit={e => { e.preventDefault(); if (!f.tag.trim()) return; onSave({ ...f, tag: f.tag.trim() }); }}>
    <p className="muted small">Cliente: <b>{db.clients.find(c => c.id === f.clientId)?.name}</b></p>
    <Field label="TAG / identificação *" hint="Como a máquina é chamada na fábrica"><input id="mf-tag" required value={f.tag} onChange={e => up('tag', e.target.value)} placeholder="Ex.: Coex 307" /></Field>
    <Field label="Tipo"><select id="mf-kind" value={f.kind} onChange={e => up('kind', e.target.value)}>{(Object.keys(KIND_LABEL) as MachineKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
    {f.kind === 'extrusora' && <Field label="Extrusoras na linha" hint="Mono = 1 · coex 3, 5, 7 camadas…"><div className="seg sm">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <button type="button" key={n} className={f.extruders === n ? 'on' : ''} onClick={() => up('extruders', n)}>{n}</button>)}</div></Field>}
    {f.kind === 'impressora' && <Field label="Cores"><div className="seg sm">{[2, 4, 6, 8, 10].map(n => <button type="button" key={n} className={f.colors === n ? 'on' : ''} onClick={() => up('colors', n)}>{n}</button>)}</div></Field>}
    <div className="row2"><Field label="Fabricante"><input id="mf-maker" value={f.maker ?? ''} onChange={e => up('maker', e.target.value)} placeholder="Ex.: Bandera, Windmöller" /></Field><Field label="Modelo"><input id="mf-model" value={f.model ?? ''} onChange={e => up('model', e.target.value)} /></Field></div>
    <div className="row2"><Field label="Nº de série"><input id="mf-serial" value={f.serial ?? ''} onChange={e => up('serial', e.target.value)} /></Field><Field label="Ano"><input id="mf-year" inputMode="numeric" value={f.year ?? ''} onChange={e => up('year', e.target.value)} /></Field></div>
    <Field label="Observações"><textarea id="mf-desc" rows={2} value={f.desc} onChange={e => up('desc', e.target.value)} placeholder="Periféricos, particularidades, local na planta…" /></Field>
    <div className="row-end">{!isNew && onDelete && <button type="button" className="btn ghost" onClick={onDelete}>Remover máquina</button>}<button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary">{isNew ? 'Cadastrar' : 'Salvar'}</button></div>
  </form></Sheet>;
}
