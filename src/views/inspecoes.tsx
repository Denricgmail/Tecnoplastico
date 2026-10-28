import React, { useMemo, useState } from 'react';
import { useDB, Icon, Pill, Field, Sheet, Empty, statusKind } from '../ui';
import { clientName, fmtDate, todayISO, uid, num, brl, nextCode, takeCode, codeUsed, propLabel, ckLabel } from '../logic';
import type { CatalogItem, Inspection, InspStatus, DB, Machine, Client } from '../types';
import { pending, ClientForm, MachineForm, machineSummary } from './clientes';

export const LETTERS = 'ABCDEFGHIJKL';
export const MAX_EXTRUDERS = 12;
export const MAX_COLORS = 10;
export type CkItem = CatalogItem & { key: string; unit: string; catKey: string; catLabel: string; subLabel: string };
export function checklistFor(db: DB, insp: Inspection): CkItem[] {
  const cat = db.catalog[insp.kind];
  const n = Math.min(MAX_EXTRUDERS, Math.max(1, insp.extruders || 1));
  let list: CatalogItem[];
  if (insp.kind === 'extrusora') {
    const base = cat.filter(i => i.e === 'Extrusora A');
    const ex = Array.from({ length: n }, (_, k) => base.map((i, x) => ({ ...i, c: `1.${k + 1}.${x + 1}`, e: `Extrusora ${LETTERS[k]}`, sn: `1.${k + 1}` }))).flat();
    const painelSn = n <= 7 ? '1.8' : `1.${n + 1}`;
    const rest = cat.filter(i => i.e !== 'Extrusora A').map(i => i.sn === '1.8' ? { ...i, sn: painelSn, c: i.c.replace(/^1\.8\./, `${painelSn}.`) } : i);
    list = [...ex, ...rest];
  } else {
    const nc = Math.min(MAX_COLORS, Math.max(1, insp.colors || 1));
    const base = cat.filter(i => i.e === 'Cor 1');
    const cores = Array.from({ length: nc }, (_, k) => base.map((i, x) => ({ ...i, c: `6.${k + 1}.${x + 1}`, e: `Cor ${k + 1}`, sn: `6.${k + 1}` }))).flat();
    const at = cat.findIndex(i => i.e === 'Cor 1');
    const rest = cat.filter(i => !/^Cor \d+$/.test(i.e));
    list = [...rest.slice(0, at), ...cores, ...rest.slice(at)];
  }
  return list.map(i => {
    const gn = i.gn ?? i.c.split('.')[0];
    const catLabel = gn ? `${gn}. ${i.g}` : i.g;
    const subLabel = i.e ? `${i.sn ?? ''}${i.sn ? ' — ' : ''}${i.e}` : '';
    return { ...i, key: `${i.e || i.g}|${i.d}`, catKey: `${gn}|${i.g}`, catLabel, subLabel, unit: i.e ? `${i.g}|${i.e}` : `${i.g}|` };
  });
}

export const TEAMS = ['1 Mecânico', '1 Elétrico', '2 Elétricos', '2 Mecânicos'];
/** Converte equipes antigas do catálogo (combinações, Terceiros, vazio) para uma das 4 opções. */
export const normTeam = (t?: string) => { const x = (t ?? '').trim(); if (TEAMS.includes(x)) return x; if (/^2 Mec/i.test(x) || /2 Mec/i.test(x)) return '2 Mecânicos'; if (/^2 El/i.test(x)) return '2 Elétricos'; if (/^1 El/i.test(x) && !/Mec/i.test(x)) return '1 Elétrico'; return '1 Mecânico'; };
const ST: { k: InspStatus; l: string }[] = [{ k: 'OK', l: 'OK' }, { k: 'NOK', l: 'Não OK' }, { k: 'NI', l: 'Não instalado' }, { k: 'AN', l: 'Analisar' }];

export function Inspecoes() {
  const { db, set } = useDB(); const [editing, setEditing] = useState<string | null>(() => { const x = pending.inspOpen; pending.inspOpen = null; return x; }); const [creating, setCreating] = useState<boolean>(() => !!pending.inspMachine);
  if (editing) return <Editor id={editing} onBack={() => setEditing(null)} />;
  return <div className="stack-l">
    <header className="ph"><div><p className="eyebrow">Campo</p><h1 className="ttl"><span className="ttl-ic"><Icon n="inspecoes" s={26} /></span>Checklist / Inspeção</h1><p className="lede">O checklist usa o catálogo real da TecnoPlástico: extrusora coex organizada em categorias e subcategorias (20 serviços por extrusora, até 12 extrusoras, mais painel, cabeçote, anel de ar e demais conjuntos) e impressora flexográfica no mesmo formato (Grupo Impressor repetido por cor, até 10 cores). Cada serviço tem horas e equipe padrão. Os itens Não OK viram proposta.</p></div>
      <button className="btn primary" onClick={() => setCreating(true)}><Icon n="plus" /> Novo checklist</button></header>
    <div className="tbl-wrap card flush"><table className="tbl">
      <thead><tr><th>Nº</th><th>Máquina</th><th>Cliente</th><th>Data</th><th>Técnico</th><th>Situação</th><th /></tr></thead>
      <tbody>{db.inspections.map(i => { const items = i.legacy ? [] : checklistFor(db, i); const done = Object.values(i.marks).filter(m => m.s).length; const nok = Object.values(i.marks).filter(m => m.s === 'NOK').length;
        return <tr key={i.id} className="click" onClick={() => !i.legacy && setEditing(i.id)}>
          <td><span className="trk">{ckLabel(i)}</span></td><td><b>{i.machineTag}</b><div className="muted small">{i.kind === 'extrusora' ? `Extrusora coex · ${i.extruders} extrusoras` : `Impressora flexo · ${i.colors} cores`}</div></td>
          <td>{clientName(db, i.clientId)}</td><td className="num">{fmtDate(i.date)}</td><td>{i.techName}</td>
          <td>{i.legacy ? <span className="muted small">Importada · {i.legacy}</span> : <><b className="num">{done}/{items.length}</b> verificados{nok ? <span className="neg"> · {nok} Não OK</span> : ''}</>}</td>
          <td className="r"><div className="row-end nowrap">{!i.legacy && <button className="btn sm" onClick={e => { e.stopPropagation(); setEditing(i.id); }}><Icon n="inspecoes" s={14} /> {i.proposalId ? 'Ver checklist' : 'Continuar'}</button>}{i.legacy && <span className="muted small">Sem marcações (veio da planilha)</span>}{i.proposalId && <a className="btn ghost sm" href={`#proposta-${i.proposalId}`} onClick={e => e.stopPropagation()}><Icon n="propostas" s={14} /> Proposta</a>}</div></td></tr>; })}</tbody></table></div>
    {creating && <Nova onClose={() => setCreating(false)} onCreate={i => { set(d => { if (i.code) takeCode(d, i.code); d.inspections.unshift(i); return d; }); setCreating(false); setEditing(i.id); }} />}
  </div>;
}

function Nova({ onClose, onCreate }: { onClose: () => void; onCreate: (i: Inspection) => void }) {
  const { db, set, toast } = useDB();
  const pre = pending.inspMachine ? db.machines.find(m => m.id === pending.inspMachine) : undefined; pending.inspMachine = null;
  const [c, setC] = useState(pre?.clientId ?? db.clients[0]?.id ?? '');
  const parque = (cid: string) => db.machines.filter(m => m.clientId === cid && (m.kind === 'extrusora' || m.kind === 'impressora'));
  const [mid, setMid] = useState(pre?.id ?? parque(c)[0]?.id ?? '');
  const m = db.machines.find(x => x.id === mid);
  const [kind, setKind] = useState<'extrusora' | 'impressora'>(m?.kind === 'impressora' ? 'impressora' : 'extrusora');
  const [ex, setEx] = useState(m?.extruders ?? 3); const [cores, setCores] = useState(m?.colors ?? 8);
  const [tech, setTech] = useState('Rodolfo Gimenes Júnior'); const [resp, setResp] = useState(db.clients.find(x => x.id === c)?.contact ?? '');
  const [code, setCode] = useState(nextCode(db)); const codeErr = !/^\d{6,}$/.test(code) ? 'Use o formato AA + 4 dígitos (ex.: 261102)' : codeUsed(db, code) ? 'Este número já está em uso' : '';
  const [newC, setNewC] = useState<Client | null>(null); const [newM, setNewM] = useState<Machine | null>(null);
  const pickMachine = (id: string) => { setMid(id); const x = db.machines.find(y => y.id === id); if (x) { setKind(x.kind === 'impressora' ? 'impressora' : 'extrusora'); if (x.extruders) setEx(x.extruders); if (x.colors) setCores(x.colors); } };
  const pickClient = (id: string) => { setC(id); const first = parque(id)[0]; setMid(first?.id ?? ''); if (first) pickMachine(first.id); setResp(db.clients.find(x => x.id === id)?.contact ?? ''); };
  return <>
    <Sheet title="Novo checklist" onClose={onClose}><form className="form" onSubmit={e => { e.preventDefault(); if (!m || codeErr) return; set(d => { const x = d.machines.find(y => y.id === m.id); if (x) { if (kind === 'extrusora') x.extruders = ex; else x.colors = cores; } return d; }); onCreate({ id: uid('i'), code, clientId: c, machineId: m.id, machineTag: m.tag, kind, date: todayISO(), techName: tech, clientResp: resp, marks: {}, extruders: ex, colors: cores }); }}>
      <Field label="Número do checklist" hint={codeErr || 'Ano + sequência. O mesmo número segue na proposta (PR) e no serviço (OS).'}><div className="row"><span className="trk big">CK</span><input id="ni-code" className="grow num" inputMode="numeric" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} aria-invalid={!!codeErr} /></div></Field>
      <Field label="Cliente"><div className="row"><select id="ni-c" className="grow" value={c} onChange={e => pickClient(e.target.value)}>{[...db.clients].sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button type="button" className="btn sm" onClick={() => setNewC({ id: uid('c'), name: '', createdAt: todayISO() })}><Icon n="plus" s={14} /> Novo</button></div></Field>
      <Field label="Máquina do parque" hint={m ? machineSummary(m) : 'Este cliente ainda não tem extrusora ou impressora cadastrada'}><div className="row"><select id="ni-m" className="grow" value={mid} onChange={e => pickMachine(e.target.value)}>{!parque(c).length && <option value="">Nenhuma máquina cadastrada</option>}{parque(c).map(x => <option key={x.id} value={x.id}>{x.tag}</option>)}</select>
        <button type="button" className="btn sm" onClick={() => setNewM({ id: uid('m'), clientId: c, tag: '', kind: 'extrusora', desc: '', extruders: 3 })}><Icon n="plus" s={14} /> Nova</button></div></Field>
      <Field label="Modelo de checklist"><div className="seg sm"><button type="button" className={kind === 'extrusora' ? 'on' : ''} onClick={() => setKind('extrusora')}>Extrusora coex</button><button type="button" className={kind === 'impressora' ? 'on' : ''} onClick={() => setKind('impressora')}>Impressora flexo</button></div></Field>
      {kind === 'extrusora' ? <Field label="Extrusoras na linha" hint="Vem do cadastro da máquina; pode ajustar depois, dentro do checklist (até 12)"><div className="seg sm">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <button type="button" key={n} className={ex === n ? 'on' : ''} onClick={() => setEx(n)}>{n}</button>)}</div></Field>
        : <Field label="Cores" hint="Vem do cadastro da máquina; pode ajustar depois, dentro do checklist (até 10)"><div className="seg sm">{[2, 4, 6, 8, 10].map(n => <button type="button" key={n} className={cores === n ? 'on' : ''} onClick={() => setCores(n)}>{n}</button>)}</div></Field>}
      <Field label="Técnico responsável"><input id="ni-tech" value={tech} onChange={e => setTech(e.target.value)} /></Field>
      <Field label="Responsável no cliente"><input id="ni-resp" value={resp} onChange={e => setResp(e.target.value)} placeholder="Nome de quem acompanha" /></Field>
      <div className="row-end"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!m || !!codeErr}>Começar checklist</button></div>
    </form></Sheet>
    {newC && <ClientForm c={newC} onClose={() => setNewC(null)} onSave={x => { set(d => { d.clients.push(x); return d; }); setNewC(null); setC(x.id); setMid(''); setResp(x.contact ?? ''); toast('Cliente cadastrado'); }} />}
    {newM && <MachineForm m={newM} onClose={() => setNewM(null)} onSave={x => { set(d => { d.machines.push(x); return d; }); setNewM(null); setMid(x.id); setKind(x.kind === 'impressora' ? 'impressora' : 'extrusora'); if (x.extruders) setEx(x.extruders); if (x.colors) setCores(x.colors); toast('Máquina cadastrada no parque'); }} />}
  </>;
}


/** Seta de expandir/recolher: aponta para baixo fechada e para cima aberta. */
const Chev = ({ open, sm }: { open: boolean; sm?: boolean }) => <span className={`chev ${sm ? 'sm' : ''} ${open ? 'up' : ''}`} aria-hidden="true"><svg width={sm ? 15 : 18} height={sm ? 15 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></span>;

/** Ficha do checklist: empresa e equipamento em destaque; a seta expande os dados de cliente, máquina e inspeção. */
function Ficha({ insp, editable }: { insp: Inspection; editable: boolean }) {
  const { db, set, toast } = useDB(); const [open, setOpen] = useState(false);
  const [editC, setEditC] = useState<Client | null>(null); const [editM, setEditM] = useState<Machine | null>(null);
  const c = db.clients.find(x => x.id === insp.clientId);
  const m = db.machines.find(x => x.id === insp.machineId) ?? db.machines.find(x => x.clientId === insp.clientId && x.tag === insp.machineTag);
  const upd = (patch: Partial<Inspection>) => set(d => { Object.assign(d.inspections.find(x => x.id === insp.id)!, patch); return d; });
  const [code, setCode] = useState(insp.code ?? '');
  const codeErr = !/^\d{6,}$/.test(code) ? 'Formato AA + 4 dígitos' : codeUsed(db, code, insp.proposalId, insp.id) ? 'Número já em uso' : '';
  const lockCode = !editable || !!insp.proposalId;
  const kindTxt = insp.kind === 'extrusora' ? `Extrusora coex · ${insp.extruders} extrusora${insp.extruders > 1 ? 's' : ''}` : `Impressora flexográfica · ${insp.colors} cores`;
  const V = ({ k, v }: { k: string; v?: string | number | null }) => <><dt>{k}</dt><dd>{v || <span className="muted">—</span>}</dd></>;
  return <section className={`ficha ${open ? 'open' : ''}`}>
    <button className="ficha-top" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Recolher ficha' : 'Expandir ficha'}>
      <span className="trk big">{ckLabel(insp)}</span>
      <div className="ficha-main"><span className="ficha-k">Empresa</span><b>{c?.name ?? clientName(db, insp.clientId)}</b>{c?.city && <small>{c.city}{c.uf ? `/${c.uf}` : ''}</small>}</div>
      <div className="ficha-main"><span className="ficha-k">Equipamento</span><b>{insp.machineTag}</b><small>{kindTxt}{m?.maker ? ` · ${m.maker}` : ''}</small></div>
      <div className="ficha-meta"><span>{fmtDate(insp.date)}</span><span>{insp.techName}</span></div>
      <Chev open={open} />
    </button>
    {open && <div className="ficha-body">
      <div className="ficha-col"><h4>Cliente</h4><dl className="kv fk">
        <V k="Razão social" v={c?.razao} /><V k="CNPJ" v={c?.cnpj} /><V k="Contato" v={c?.contact} /><V k="Telefone" v={c?.phone} /><V k="E-mail" v={c?.email} /><V k="Endereço" v={c?.address} /></dl>
        {editable && c && <button className="link small" onClick={() => setEditC({ ...c })}>Editar cadastro do cliente</button>}</div>
      <div className="ficha-col"><h4>Máquina</h4><dl className="kv fk">
        <V k="TAG" v={m?.tag ?? insp.machineTag} /><V k="Tipo" v={kindTxt} /><V k="Fabricante" v={m?.maker} /><V k="Modelo" v={m?.model} /><V k="Nº de série" v={m?.serial} /><V k="Ano" v={m?.year} /></dl>
        {editable && m && <button className="link small" onClick={() => setEditM({ ...m })}>Editar cadastro da máquina</button>}</div>
      <div className="ficha-col"><h4>Inspeção</h4>
        {editable ? <div className="form ficha-form">
          <Field label="Número" hint={lockCode ? 'Já usado na proposta; não pode mudar' : codeErr || undefined}><input id="fi-code" className="num" value={code} disabled={lockCode} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} onBlur={() => { if (!codeErr && code !== insp.code) { set(d => { takeCode(d, code); d.inspections.find(x => x.id === insp.id)!.code = code; return d; }); toast(`Número alterado para CK ${code}`); } }} /></Field>
          <Field label="Data"><input id="fi-date" type="date" value={insp.date} onChange={e => upd({ date: e.target.value })} /></Field>
          <Field label="Técnico responsável"><input id="fi-tech" value={insp.techName} onChange={e => upd({ techName: e.target.value })} /></Field>
          <Field label="Responsável no cliente"><input id="fi-resp" value={insp.clientResp} onChange={e => upd({ clientResp: e.target.value })} placeholder="Quem acompanhou" /></Field>
        </div> : <dl className="kv fk"><V k="Número" v={ckLabel(insp)} /><V k="Data" v={fmtDate(insp.date)} /><V k="Técnico" v={insp.techName} /><V k="Acompanhou" v={insp.clientResp} /></dl>}
      </div>
    </div>}
    {editC && <ClientForm c={editC} onClose={() => setEditC(null)} onSave={x => { set(d => { const i = d.clients.findIndex(y => y.id === x.id); d.clients[i] = x; return d; }); setEditC(null); toast('Cliente atualizado'); }} />}
    {editM && <MachineForm m={editM} onClose={() => setEditM(null)} onSave={x => { set(d => { const i = d.machines.findIndex(y => y.id === x.id); d.machines[i] = x; d.inspections.filter(y => y.machineId === x.id && !y.proposalId).forEach(y => { y.machineTag = x.tag; }); return d; }); setEditM(null); toast('Máquina atualizada'); }} />}
  </section>;
}

const ST_LABEL: Record<string, string> = { OK: 'OK', NOK: 'Não OK', NI: 'Não instalado', AN: 'Analisar' };
const ST_PILL: Record<string, string> = { OK: 'ok', NOK: 'bad', NI: 'wait', AN: 'run' };

function Historico({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: () => void }) {
  const { db } = useDB(); const insp = db.inspections.find(i => i.id === id)!;
  const items = checklistFor(db, insp); const [all, setAll] = useState(false);
  const prop = db.proposals.find(p => p.id === insp.proposalId);
  const shown = items.filter(i => all || insp.marks[i.key]?.s || insp.marks[i.key]?.obs);
  const cnt = (k: string) => items.filter(i => insp.marks[i.key]?.s === k).length;
  const sel = items.filter(i => ['NOK', 'AN'].includes(insp.marks[i.key]?.s ?? ''));
  const h = sel.reduce((a, i) => a + (insp.marks[i.key]?.h ?? i.h), 0);
  const cats = [...new Set(shown.map(i => i.catKey))];
  return <div className="stack-l">
    <header className="ph"><div><button className="back" onClick={onBack}><Icon n="back" s={16} /> Checklist / Inspeção</button>
      <h1 className="ttl"><span className="ttl-ic"><Icon n="inspecoes" s={26} /></span>Ficha do checklist</h1><div className="row wrap"><Pill k="mute">Histórico</Pill></div></div>
      <div className="row wrap">{prop && <a className="btn" href={`#proposta-${prop.id}`}><Icon n="propostas" s={15} /> {propLabel(prop)} · {prop.status}</a>}{prop?.status !== 'Aprovada' && <button className="btn ghost" onClick={onEdit}>Editar checklist</button>}</div></header>
    <Ficha insp={insp} editable={false} />
    <div className="audit"><Icon n="doc" /><div><b>Registro do checklist</b><p>Consulta somente leitura do que foi marcado em campo. A proposta foi gerada a partir dos itens Não OK e Analisar ({sel.length} itens, {num(h, h % 1 ? 1 : 0)} h previstas). {prop?.status === 'Aprovada' ? 'Como a proposta já foi aprovada, o checklist fica travado como histórico.' : 'Alterações feitas aqui não mudam a proposta já criada.'}</p></div></div>
    <section className="kpis">
      <div className="kpi"><span>OK</span><b className="c-ok">{cnt('OK')}</b></div><div className="kpi"><span>Não OK</span><b className="c-bad">{cnt('NOK')}</b></div>
      <div className="kpi"><span>Analisar</span><b className="c-run">{cnt('AN')}</b><small>{cnt('NI')} não instalados</small></div><div className="kpi"><span>Sem marcação</span><b>{items.filter(i => !insp.marks[i.key]?.s).length}</b><small>de {items.length} itens</small></div>
    </section>
    <div className="row wrap"><div className="seg sm"><button className={!all ? 'on' : ''} onClick={() => setAll(false)}>Só itens marcados</button><button className={all ? 'on' : ''} onClick={() => setAll(true)}>Todos os itens</button></div></div>
    {cats.map(ck => { const ci = shown.filter(i => i.catKey === ck); const units = [...new Set(ci.map(i => i.unit))];
      return <section key={ck} className="card flush"><div className="card-h pad"><h2>{ci[0].catLabel}</h2></div>
        <div className="tbl-wrap"><table className="tbl hist-t"><thead><tr><th>Código</th><th>Serviço</th><th>Situação</th><th className="r">Horas</th><th>Equipe</th><th>Observação</th></tr></thead>
          <tbody>{units.map(u => { const its = ci.filter(i => i.unit === u); return <React.Fragment key={u}>
            {its[0].e && <tr className="sub-row"><td colSpan={6}>{its[0].subLabel}</td></tr>}
            {its.map(i => { const m = insp.marks[i.key] ?? {}; return <tr key={i.key}><td className="num muted">{i.c}</td><td>{i.d}</td>
              <td>{m.s ? <Pill k={ST_PILL[m.s]}>{ST_LABEL[m.s]}</Pill> : <span className="muted small">—</span>}</td>
              <td className="r num">{m.s === 'NOK' || m.s === 'AN' ? num(m.h ?? i.h, (m.h ?? i.h) % 1 ? 1 : 0) : ''}</td>
              <td className="small">{m.s === 'NOK' || m.s === 'AN' ? normTeam(m.t ?? i.t) : ''}</td><td className="small">{m.obs || ''}</td></tr>; })}
          </React.Fragment>; })}</tbody></table></div></section>; })}
    {!shown.length && <Empty title="Nenhum item marcado" body="Este checklist ainda não tem marcações. Use “Todos os itens” para ver a lista completa." />}
  </div>;
}

function Editor({ id, onBack }: { id: string; onBack: () => void }) {
  const { db } = useDB(); const insp = db.inspections.find(i => i.id === id)!;
  const [edit, setEdit] = useState(!insp.proposalId);
  return edit ? <EditorForm id={id} onBack={onBack} /> : <Historico id={id} onBack={onBack} onEdit={() => setEdit(true)} />;
}

function EditorForm({ id, onBack }: { id: string; onBack: () => void }) {
  const { db, set, go, toast } = useDB(); const insp = db.inspections.find(i => i.id === id)!;
  const items = useMemo(() => checklistFor(db, insp), [insp.kind, insp.extruders, insp.colors, db.catalog]);
  const [q, setQ] = useState(''); const [openU, setOpenU] = useState<string | null>(null); const [confirmRm, setConfirmRm] = useState<null | 'extruders' | 'colors'>(null); const [closedCats, setClosedCats] = useState<Record<string, boolean>>({});
  const anchor = (el: HTMLElement, opening: boolean) => {
    const main = document.querySelector('.main') as HTMLElement | null; if (!main) return;
    const before = el.getBoundingClientRect().top;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const tb = document.querySelector('.topbar') as HTMLElement | null; const off = (tb && tb.offsetHeight ? tb.offsetHeight : 0) + 8;
      if (opening) { const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - off; main.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
      else main.scrollBy(0, el.getBoundingClientRect().top - before);
    }));
  }; const [obsOpen, setObsOpen] = useState<Record<string, boolean>>({});
  const cats = [...new Set(items.map(i => i.catKey))];
  const setCount = (field: 'extruders' | 'colors', n: number) => set(d => { const x = d.inspections.find(i => i.id === id)!; const max = field === 'extruders' ? MAX_EXTRUDERS : MAX_COLORS; const old = x[field]; x[field] = Math.min(max, Math.max(1, n));
    for (let k = x[field]; k < old; k++) { const pre = field === 'extruders' ? `Extrusora ${LETTERS[k]}|` : `Cor ${k + 1}|`; Object.keys(x.marks).filter(m => m.startsWith(pre)).forEach(m => delete x.marks[m]); } return d; });
  const mark = (key: string, s?: InspStatus, obs?: string) => set(d => { const x = d.inspections.find(i => i.id === id)!; const cur = x.marks[key] ?? {}; x.marks[key] = { ...cur, s: s === undefined ? cur.s : (cur.s === s ? undefined : s), obs: obs ?? cur.obs }; return d; });
  const tune = (key: string, patch: { h?: number; t?: string }) => set(d => { const x = d.inspections.find(i => i.id === id)!; x.marks[key] = { ...(x.marks[key] ?? {}), ...patch }; return d; });
  const hOf = (i: typeof items[number]) => insp.marks[i.key]?.h ?? i.h; const tOf = (i: typeof items[number]) => normTeam(insp.marks[i.key]?.t ?? i.t);
  const count = (s: InspStatus) => items.filter(i => insp.marks[i.key]?.s === s).length;
  const picked = items.filter(i => ['NOK', 'AN'].includes(insp.marks[i.key]?.s ?? ''));
  const hours = picked.reduce((s, i) => s + hOf(i), 0);
  const filtered = q ? items.filter(i => (i.d + i.c + i.subLabel + i.catLabel).toLowerCase().includes(q.toLowerCase())) : null;
  const gen = () => {
    const pid = uid('p');
    set(d => {
      const code = insp.code ?? takeCode(d, nextCode(d));
      d.proposals.unshift({ id: pid, number: code, clientId: insp.clientId, machineId: d.machines.find(m => m.tag === insp.machineTag && m.clientId === insp.clientId)?.id, date: todayISO(), title: `Preventiva — ${insp.machineTag}`, status: 'Rascunho', origin: `Gerada do checklist de ${fmtDate(insp.date)} (${insp.techName})`,
        pricing: { mode: 'hora', rate: 160, factor: 1.15, techs: 3, hoursPerDay: 9, days: 0, fixed: 0 },
        lines: picked.map(i => ({ id: uid('l'), group: i.subLabel || i.catLabel, code: i.c, desc: i.d + (insp.marks[i.key]?.s === 'AN' ? ' (analisar na desmontagem)' : ''), hours: hOf(i), team: tOf(i), obs: insp.marks[i.key]?.obs })), scope: [], km: 0, meals: true, clientResp: insp.clientResp, techName: insp.techName });
      d.inspections.find(i => i.id === id)!.proposalId = pid; return d;
    });
    toast(`Proposta criada com ${picked.length} itens`); go(`proposta-${pid}`);
  };
  const Item = (i: typeof items[number]) => { const m = insp.marks[i.key] ?? {}; return <div key={i.key} className={`ck ${m.s ? `ck-${m.s}` : ''}`}>
    <div className="ck-h"><span className="code">{i.c}</span><div className="ck-d"><b>{i.d}</b>{q && <small>{i.subLabel || i.catLabel}</small>}</div></div>
    <div className="ck-st" role="group" aria-label={`Situação de ${i.d}`}>{ST.map(s => <button key={s.k} className={`st-${s.k} ${m.s === s.k ? 'on' : ''}`} onClick={() => mark(i.key, s.k)} aria-pressed={m.s === s.k}>{s.l}</button>)}
      <button className={`st-obs ${m.obs ? 'has' : ''}`} onClick={() => setObsOpen(o => ({ ...o, [i.key]: !o[i.key] }))} aria-label="Observação"><Icon n="doc" s={15} /></button></div>
    <div className="ck-tune">
      <label className="ck-team"><span>Equipe</span><select value={tOf(i)} onChange={e => tune(i.key, { t: e.target.value })} aria-label={`Equipe de ${i.d}`}>{TEAMS.map(t => <option key={t}>{t}</option>)}</select></label>
      <div className="ck-hrs"><span>Horas</span>
        <div className="stepper"><button type="button" onClick={() => tune(i.key, { h: Math.max(0, hOf(i) - 0.5) })} aria-label="Diminuir meia hora">−</button>
          <input type="number" min={0} step={0.5} value={hOf(i)} onChange={e => tune(i.key, { h: Math.max(0, +e.target.value || 0) })} aria-label={`Horas de ${i.d}`} />
          <button type="button" onClick={() => tune(i.key, { h: hOf(i) + 0.5 })} aria-label="Aumentar meia hora">+</button></div>
        {(m.h != null && m.h !== i.h) || (m.t != null && m.t !== normTeam(i.t)) ? <button type="button" className="link small" onClick={() => tune(i.key, { h: undefined, t: undefined })} title={`Padrão do catálogo: ${num(i.h, i.h % 1 ? 1 : 0)} h · ${i.t || 'sem equipe'}`}>voltar ao padrão</button> : null}
      </div>
    </div>
    {(obsOpen[i.key] || m.obs) && <textarea rows={2} value={m.obs ?? ''} placeholder={i.o || 'Observação técnica, medida, foto a anexar…'} onChange={e => mark(i.key, undefined, e.target.value)} aria-label="Observação técnica" />}
  </div>; };

  return <div className="stack insp">
    <header className="ph"><div><button className="back" onClick={onBack}><Icon n="back" s={16} /> Checklist / Inspeção</button><h1 className="ttl"><span className="ttl-ic"><Icon n="inspecoes" s={26} /></span>Ficha do checklist</h1></div></header>
    <Ficha insp={insp} editable />
    <div className="ck-sum"><span className="s-ok">{count('OK')} OK</span><span className="s-nok">{count('NOK')} Não OK</span><span className="s-ni">{count('NI')} Não instalado</span><span className="s-an">{count('AN')} Analisar</span><span className="muted">{items.filter(i => !insp.marks[i.key]?.s).length} pendentes</span></div>
    <div className="search"><Icon n="search" s={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar componente ou número do serviço" aria-label="Buscar no checklist" /></div>
    {filtered ? <div className="card flush">{filtered.slice(0, 60).map(Item)}{!filtered.length && <p className="pad muted">Nada encontrado.</p>}</div> :
      cats.map(ck => { const ci = items.filter(i => i.catKey === ck); const units = [...new Set(ci.map(i => i.unit))]; const togCat = (el: HTMLElement) => { const opening = !!closedCats[ck]; setClosedCats(c => ({ ...c, [ck]: !c[ck] })); anchor(el, opening); }; const rep = insp.kind === 'extrusora' ? (ci[0].e.startsWith('Extrusora ') ? { field: 'extruders' as const, n: insp.extruders, max: MAX_EXTRUDERS, label: 'Extrusoras no equipamento', next: `Extrusora ${LETTERS[insp.extruders]}`, last: `Extrusora ${LETTERS[insp.extruders - 1]}`, cat: 'Extrusoras' } : null)
          : (/^Cor \d+$/.test(ci[0].e) ? { field: 'colors' as const, n: insp.colors, max: MAX_COLORS, label: 'Cores na impressora', next: `Cor ${insp.colors + 1}`, last: `Cor ${insp.colors}`, cat: ci[0].g } : null);
        const cdone = ci.filter(i => insp.marks[i.key]?.s).length;
        return <section key={ck} className="cat">
          <div className="cat-h"><button className="cat-t" aria-expanded={!closedCats[ck]} onClick={e => togCat(e.currentTarget.parentElement as HTMLElement)}><h2>{ci[0].catLabel}</h2></button><span className="num small muted">{cdone}/{ci.length}</span>
            {rep && <div className="ext-ctl"><span>{rep.label}</span><div className="stepper"><button type="button" disabled={rep.n <= 1} onClick={() => setConfirmRm(rep.field)} aria-label={`Remover ${rep.last}`}>−</button><input readOnly value={rep.n} aria-label={rep.label} /><button type="button" disabled={rep.n >= rep.max} onClick={() => setCount(rep.field, rep.n + 1)} aria-label={`Adicionar ${rep.next}`}>+</button></div>
              {rep.n < rep.max && <button className="btn sm" onClick={() => { setCount(rep.field, rep.n + 1); setOpenU(`${rep.cat}|${rep.next}`); }}><Icon n="plus" s={14} /> Adicionar {rep.next}</button>}</div>}
            <button className="cat-tog" aria-expanded={!closedCats[ck]} aria-label={closedCats[ck] ? 'Expandir categoria' : 'Recolher categoria'} onClick={e => togCat(e.currentTarget.parentElement as HTMLElement)}><Chev open={!closedCats[ck]} sm /></button>
          </div>
          {rep && confirmRm === rep.field && <div className="audit bad"><Icon n="alert" /><div><b>Remover {rep.last}?</b><p>As marcações e observações dela serão apagadas.</p><div className="row"><button className="btn sm" onClick={() => { setCount(rep.field, rep.n - 1); setConfirmRm(null); }}>Remover</button><button className="btn ghost sm" onClick={() => setConfirmRm(null)}>Cancelar</button></div></div></div>}
          {!closedCats[ck] && units.map(u => { const its = ci.filter(i => i.unit === u); const done = its.filter(i => insp.marks[i.key]?.s).length; const nok = its.filter(i => insp.marks[i.key]?.s === 'NOK').length; const op = openU === u; const hasSub = !!its[0].e;
            return <div key={u} className="card flush unit">
              <button className="unit-h" onClick={e => { const el = e.currentTarget.parentElement as HTMLElement; setOpenU(op ? null : u); anchor(el, !op); }} aria-expanded={op}><div><b>{hasSub ? its[0].subLabel : 'Serviços'}</b><small>{its.length} serviços · {num(its.reduce((s, i) => s + hOf(i), 0))} h previstas</small></div><span className="unit-p"><i style={{ width: `${(done / its.length) * 100}%` }} /></span><span className="num small">{done}/{its.length}{nok ? <em> · {nok} Não OK</em> : ''}</span><Chev open={op} sm /></button>
              {op && <div>{its.map(Item)}<div className="unit-f"><button className="btn ghost sm" onClick={() => set(d => { const x = d.inspections.find(i => i.id === id)!; its.forEach(i => { if (!x.marks[i.key]?.s) x.marks[i.key] = { ...(x.marks[i.key] ?? {}), s: 'OK' }; }); return d; })}>Marcar pendentes como OK</button></div></div>}
            </div>; })}
        </section>; })}
    <div className="dock"><div><b>{picked.length} itens para a proposta</b><span>{num(hours, hours % 1 ? 1 : 0)} h previstas · ≈ {brl(hours * 160 * 1.15)} a R$ 160/h + nota</span></div>
      {insp.proposalId ? <a className="btn" href={`#proposta-${insp.proposalId}`}>Abrir proposta</a> : <button className="btn primary" disabled={!picked.length} onClick={gen}><Icon n="propostas" /> Gerar proposta</button>}</div>
  </div>;
}
