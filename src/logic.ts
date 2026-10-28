import type { DB, Proposal, Job, Tech } from './types';

export const brl = (v: number, cents = false) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(v || 0);
export const num = (v: number, d = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0);
export const hrs = (v: number) => `${num(v, v % 1 ? (v * 4 % 1 ? 2 : 2) : 0)} h`;

export const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fmtDate = (s?: string) => s ? s.split('-').reverse().join('/') : '—';
export const fmtShort = (s: string) => { const d = parse(s); return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0, 3).toLowerCase()}`; };
export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const mondayOf = (s: string) => { const d = parse(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
export function yearMondays(year: number) { const out: string[] = []; let m = mondayOf(`${year}-01-01`); if (parse(m).getFullYear() < year) m = addDays(m, 7); while (parse(m).getFullYear() === year) { out.push(m); m = addDays(m, 7); } return out; }

/* ---------- motor de preço ---------- */
export function pricing(p: Proposal) {
  const pr = p.pricing;
  const hours = p.lines.reduce((s, l) => s + (Number(l.hours) || 0), 0);
  const teamDayHours = pr.techs * pr.hoursPerDay;
  let value = 0, days = 0, techDays = 0;
  if (pr.mode === 'hora') { value = hours * pr.rate * pr.factor; days = teamDayHours ? Math.ceil(hours / teamDayHours) : 0; techDays = days * pr.techs; }
  else if (pr.mode === 'tecnico_dia') {
    techDays = p.scope.reduce((s, i) => s + i.days * i.techs, 0);
    days = p.scope.reduce((s, i) => s + i.days, 0);
    value = techDays * pr.hoursPerDay * pr.rate * pr.factor;
  } else if (pr.mode === 'dia_equipe') { days = pr.days; techDays = days * pr.techs; value = days * teamDayHours * pr.rate * pr.factor; }
  else { value = pr.fixed; days = pr.days; techDays = days * pr.techs; }
  const techDayValue = pr.hoursPerDay * pr.rate * pr.factor;
  const teamDayValue = teamDayHours * pr.rate * pr.factor;
  const tax = value - value / (pr.factor || 1);
  const meals = p.meals ? techDays * 2 * 75 : 0;
  const km = p.km * 3.2;
  const impliedHourly = hours ? value / hours : 0;
  return { hours, value, days, techDays, techDayValue, teamDayValue, tax, meals, km, impliedHourly };
}

export const MODE_LABEL: Record<string, string> = { hora: 'Por hora técnica', tecnico_dia: 'Por técnico-dia', dia_equipe: 'Por dia de equipe', fechado: 'Valor fechado' };

/* ---------- alocação e conflitos ---------- */
export interface Slot { techId: string; week: string; items: { kind: 'obra' | 'ausencia'; label: string; id: string }[] }
export function occupancy(db: DB) {
  const map = new Map<string, Slot>();
  const push = (techId: string, week: string, it: Slot['items'][number]) => {
    const k = `${techId}|${week}`; if (!map.has(k)) map.set(k, { techId, week, items: [] }); map.get(k)!.items.push(it);
  };
  db.jobs.filter(j => j.status !== 'Cancelado').forEach(j => j.techIds.forEach(t => j.weeks.forEach(w => push(t, w, { kind: 'obra', label: jobLabel(db, j), id: j.id }))));
  db.absences.forEach(a => a.weeks.forEach(w => push(a.techId, w, { kind: 'ausencia', label: a.label, id: a.id })));
  return map;
}
export function conflicts(db: DB) {
  return [...occupancy(db).values()].filter(s => s.items.length > 1).sort((a, b) => a.week.localeCompare(b.week));
}
export const clientName = (db: DB, id: string) => db.clients.find(c => c.id === id)?.name ?? '—';
export const jobLabel = (db: DB, j: Job) => `${clientName(db, j.clientId).split(' ')[0]} · ${j.title}`;
export const techName = (db: DB, id: string) => db.techs.find(t => t.id === id)?.name ?? id;

export function jobRange(j: Job) { if (!j.weeks.length) return null; const s = [...j.weeks].sort(); return { from: s[0], to: addDays(s[s.length - 1], 4) }; }

export function freeTeamFrom(db: DB, techIds: string[], startMonday: string, weeksNeeded: number) {
  const occ = occupancy(db); let m = startMonday;
  for (let guard = 0; guard < 80; guard++) {
    let ok = true;
    for (let k = 0; k < weeksNeeded; k++) { const w = addDays(m, 7 * k); if (techIds.some(t => occ.has(`${t}|${w}`)) || db.collective.some(c => c.weeks.includes(w))) { ok = false; break; } }
    if (ok) return m; m = addDays(m, 7);
  }
  return startMonday;
}

/* ---------- alertas inteligentes ---------- */
export interface Alert { id: string; level: 'crit' | 'warn' | 'info'; title: string; body: string; go?: string; value?: number }
export function alerts(db: DB): Alert[] {
  const out: Alert[] = []; const today = todayISO();
  const groups = new Map<string, { techId: string; weeks: string[]; labels: string[] }>();
  conflicts(db).forEach(s => { const labels = s.items.map(i => i.label); const k = `${s.techId}|${[...labels].sort().join('|')}`; if (!groups.has(k)) groups.set(k, { techId: s.techId, weeks: [], labels }); groups.get(k)!.weeks.push(s.week); });
  groups.forEach((g, k) => out.push({ id: `c-${k}`, level: 'crit', title: `${techName(db, g.techId)} escalado em dois lugares — ${g.weeks.map(fmtShort).join(' e ')}`, body: g.labels.join('  ×  '), go: 'cronograma' }));
  db.proposals.forEach(p => {
    const pr = pricing(p);
    if (p.audit?.declaredHours && Math.abs(p.audit.declaredHours - pr.hours) > 0.01) {
      const diff = pr.hours - p.audit.declaredHours;
      out.push({ id: `h-${p.id}`, level: 'warn', title: `${diff > 0 ? `${num(diff, diff % 1 ? 2 : 0)} h fora do total` : 'Horas a mais no total'} — ${clientName(db, p.clientId)} ${propLabel(p)}`, body: p.audit.note, go: `proposta-${p.id}`, value: Math.abs(diff) * p.pricing.rate * p.pricing.factor });
    }
    if (p.status === 'Enviada' && p.date) { const d = daysBetween(p.date, today); if (d > 14) out.push({ id: `s-${p.id}`, level: 'info', title: `Proposta parada há ${d} dias — ${clientName(db, p.clientId)} ${propLabel(p)}`, body: `${brl(pr.value)} aguardando resposta. Vale um contato com ${p.clientResp ?? 'o cliente'}.`, go: `proposta-${p.id}` }); }
  });
  db.jobs.forEach(j => {
    const r = jobRange(j);
    if (j.status === 'Finalizado' && r && r.to > today) out.push({ id: `st-${j.id}`, level: 'warn', title: `Status "Finalizado" com semanas até ${fmtDate(r.to)}`, body: `${jobLabel(db, j)}: o cronograma marca como finalizada, mas há semanas programadas à frente.`, go: `obra-${j.id}` });
    const pend = j.expenses.reduce((s, e) => s + e.value, 0);
    if (pend > 0 && !j.installments.some(i => i.label.startsWith('Reembolso'))) out.push({ id: `r-${j.id}`, level: 'info', title: `Reembolso a cobrar — ${jobLabel(db, j)}`, body: `${j.expenses.length} notas somam ${brl(pend, true)}. Gere a cobrança no Financeiro.`, go: `obra-${j.id}`, value: pend });
  });
  const rank = { crit: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

export const toneOf = (t?: Tech) => `var(--t${(t?.tone ?? 0) % 7})`;
export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/* ---------- numeração de trajeto: AA + sequência de 4 dígitos (não zera na virada do ano) ---------- */
export const codeFor = (n: number, dateISO = todayISO()) => `${dateISO.slice(2, 4)}${String(n).padStart(4, '0')}`;
export const seqOf = (code?: string) => { const m = (code ?? '').match(/^\d{2}(\d{4,})$/); return m ? +m[1] : 0; };
export const nextCode = (db: DB, dateISO = todayISO()) => codeFor(db.nextNum ?? 1098, dateISO);
/** Reserva o número no banco (chamar dentro de set). Se o usuário digitou outro número, a sequência continua a partir dele. */
export const takeCode = (d: DB, code: string) => { d.nextNum = Math.max(d.nextNum ?? 1098, seqOf(code) + 1); return code; };
export const codeUsed = (db: DB, code: string, exceptProposal?: string, exceptInsp?: string) =>
  db.proposals.some(p => p.number === code && p.id !== exceptProposal) || db.inspections.some(i => i.code === code && i.id !== exceptInsp);
export const propLabel = (p: { number: string; status: string }) => `${p.status === 'Aprovada' ? 'OS' : 'PR'} ${p.number}`;
export const ckLabel = (i: { code?: string }) => `CK ${i.code ?? 's/n'}`;
