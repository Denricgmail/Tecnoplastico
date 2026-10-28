import catalogJson from '../data/catalog.json';
import sched from '../data/sched.json';
import type { DB, Tech, Client, Machine, Proposal, Job, Absence, Material, Expense, Catalog } from './types';

export const TECHS: Tech[] = [
  { id: 'gustavo', name: 'Gustavo', full: 'Luís Gustavo Pinheiro', role: 'Líder de campo', tone: 0 },
  { id: 'marcos', name: 'Marcos', role: 'Mecânico', tone: 1 },
  { id: 'adriano', name: 'Adriano', role: 'Técnico', tone: 2 },
  { id: 'tales', name: 'Tales', role: 'Técnico', tone: 3 },
  { id: 'alex', name: 'Alex', role: 'Técnico', tone: 4 },
  { id: 'junior', name: 'Junior', full: 'Rodolfo Gimenes Júnior', role: 'Elétrico', tone: 5 },
  { id: 'russio', name: 'Russio', role: 'Técnico', tone: 6 },
];

export const CLIENTS: Client[] = [
  { id: 'valgroup', name: 'Valgroup', note: 'Unidades Bahia e Manaus (AM)' },
  { id: 'biatex', name: 'Biatex' },
  { id: 'embrasa', name: 'Embrasa' },
  { id: 'verde', name: 'Verde Brasil', note: 'Montagem de linha Bandera' },
  { id: 'metafilm', name: 'Metafilm Embalagens Plásticas', razao: 'Metafilm Embalagens Plásticas LTDA.', contact: 'Sr. Renato', phone: '(15) 3388-3366', email: 'renatoj@metafilm.com.br' },
  { id: 'plasfan', name: 'Plasfan' },
  { id: 'braskem', name: 'Braskem' },
  { id: 'zaraplast', name: 'Zaraplast', contact: 'Carla (responsável: Anderson)' },
  { id: 'motech', name: 'Motech Brasil', contact: 'Souza' },
];

export const MACHINES: Machine[] = [
  { id: 'm-wind', clientId: 'valgroup', tag: 'Windmöller', kind: 'extrusora', desc: 'Linha Windmöller — desmontada na BA, montada em Manaus', maker: 'Windmöller' },
  { id: 'm-tnt', clientId: 'biatex', tag: 'Linha TNT', kind: 'tnt', desc: 'Montagem TNT' },
  { id: 'm-emb8', clientId: 'embrasa', tag: 'Impressora 8 cores', kind: 'impressora', desc: 'Flexográfica', colors: 8 },
  { id: 'm-bandera', clientId: 'verde', tag: 'Bandera Geo 251000300', kind: 'extrusora', desc: 'Montagem eletrônica e mecânica', maker: 'Bandera', model: 'Geo', serial: '251000300/2026' },
  ...['104', '107', '201', '214', '307'].map(n => ({ id: `m-mf${n}`, clientId: 'metafilm', tag: `Coex ${n}`, kind: 'extrusora' as const, desc: 'Coextrusora', extruders: 3 })),
  { id: 'm-mf308', clientId: 'metafilm', tag: 'Extrusora 308', kind: 'extrusora', desc: 'Recebe a impressora em linha que estava na 307' },
  { id: 'm-pf107', clientId: 'plasfan', tag: 'Coex 107', kind: 'extrusora', desc: 'Coextrusora', extruders: 3 },
  { id: 'm-pf307', clientId: 'plasfan', tag: 'Coex 307', kind: 'extrusora', desc: 'Coextrusora', extruders: 3 },
  { id: 'm-brk', clientId: 'braskem', tag: 'Tratamento corona', kind: 'outra', desc: 'Estação de tratamento' },
  { id: 'm-amazon', clientId: 'zaraplast', tag: 'Impressora Amazon 8 cores', kind: 'impressora', desc: 'Flexográfica de tambor central', maker: 'Amazon', colors: 8 },
  { id: 'm-e108', clientId: 'motech', tag: 'E 108', kind: 'extrusora', desc: 'Coextrusora 3 camadas', extruders: 3 },
];

const H = (g: string, hours: number, desc = 'Serviços conforme checklist', team = '') => ({ id: `${g}-${hours}-${Math.random().toString(36).slice(2, 6)}`, group: g, desc, hours, team });

export const PROPOSALS: Proposal[] = [
  {
    id: 'p-307', number: '261095', clientId: 'metafilm', machineId: 'm-mf307', date: '2026-09-24',
    title: 'Manutenção preventiva — Coex 307', status: 'Enviada', origin: 'Planilha "Check list Coex 307 Metafilm" (PDF de 24/09/2026)',
    pricing: { mode: 'hora', rate: 160, factor: 1.15, techs: 3, hoursPerDay: 9, days: 0, fixed: 0 },
    lines: [
      H('Extrusora A', 38), H('Extrusora B', 41), H('Extrusora C', 41), H('Painel elétrico', 57),
      H('Cabeçote', 282, 'Limpeza completa (180 h), polimento (54 h), resistências (36 h), termopares e baionetas'),
      H('Anel de ar', 23), H('Gaiola', 37), H('Saia e lemes', 18), H('Reversível', 58), H('Rolos de descida', 19),
      H('Alinhador', 7), H('Estação de tratamento', 18), H('Pré-arraste', 11), H('Bobinadeira 1', 37), H('Bobinadeira 2', 37),
      H('Gravimétricos', 68, 'Revisão elétrica, sensores, vedação de vácuo das canecas, mangueiras e bombas de vácuo'),
    ],
    scope: [], km: 0, meals: true, clientResp: 'Márcio', techName: 'Rodolfo Gimenes Júnior',
    audit: { declaredHours: 755, declaredValue: 138920, source: 'PDF Coex 307', note: 'Os totais por equipamento somam 792 h, mas o total geral da planilha mostra 755 h.' },
  },
  {
    id: 'p-1094', number: '261094', clientId: 'metafilm', machineId: 'm-mf308', date: '2026-09-21',
    title: 'Movimentação da máquina 308 e serviços adicionais', status: 'Enviada', origin: 'Orçamento 1094/2026 (.docx)',
    pricing: { mode: 'tecnico_dia', rate: 160, factor: 1.15, techs: 3, hoursPerDay: 9, days: 0, fixed: 0 },
    lines: [],
    scope: [
      { id: 's1', title: 'Movimentação da máquina 308', days: 6, techs: 3, bullets: ['Recuo da máquina em 2 m, desacoplamento do cabeçote e reposicionamento da torre (Munck/empilhadeira)', 'Desmontagem e alteração da posição do mezanino; desligamento da estação de tratamento e alinhador', 'Furação e fixação do novo suporte do mezanino (+200 mm), fornecido pela Metafilm', 'Subida do mezanino, remontagem do tratamento e alinhador com ligação elétrica', 'Geometria da parte quente'] },
      { id: 's2', title: 'Movimentação e nova alimentação da impressora em linha (307 → 308)', days: 5, techs: 3, bullets: ['Remoção da bobinadeira da 307 e desmontagem das calhas', 'Remoção e posicionamento da impressora na 308', 'Circuito de alimentação no painel principal e novo chicote de cabos', 'Identificação, anilhamento, passagem e interligação dos cabos', 'Comissionamento (esquema elétrico fornecido pela Metafilm)'] },
      { id: 's3', title: 'Bobinadeira — substituição dos cabos de interligação', days: 5, techs: 2, bullets: ['Levantamento de material e novo chicote de cabos', 'Montagem das eletrocalhas', 'Passagem, interligação e comissionamento'] },
    ],
    km: 0, meals: true, clientResp: 'Sr. Renato',
    audit: { declaredValue: 71208, source: 'Orçamento 1094/2026', note: 'Os três valores do documento batem com R$ 1.656 por técnico-dia (9 h × R$ 160 × 1,15).' },
  },
  {
    id: 'p-zara', number: '261096', clientId: 'zaraplast', machineId: 'm-amazon',
    title: 'Corretiva — Impressora Amazon 8 cores', status: 'Enviada', origin: 'Planilhas "Impressora 8 cores Zaraplast" (Interna e Plasfan) e PDF ao cliente',
    pricing: { mode: 'dia_equipe', rate: 160, factor: 1.125, techs: 3, hoursPerDay: 9, days: 30, fixed: 0 },
    lines: [
      H('Desbobinador', 37), H('Painel elétrico do desbobinador', 30), H('Alinhador', 22), H('Tambor central', 65),
      H('Grupo impressor (cores 1–8)', 200), H('Secagem', 57), H('Calandra', 32), H('Alinhador de saída', 18), H('Bobinador', 28),
    ],
    scope: [], km: 0, meals: true, clientResp: 'Anderson',
    versions: [
      { label: 'Versão Plasfan (enviada)', days: 30, value: 145800, hours: 489, note: 'Inclui painel elétrico do desbobinador' },
      { label: 'Versão Interna', days: 25, value: 121500, hours: 447, note: 'Sem o painel elétrico do desbobinador' },
    ],
    audit: { declaredValue: 145800, source: 'PDF ao cliente', note: 'Cotado por dia: 30 dias × R$ 4.860. A diária bate com 3 técnicos × 9 h × R$ 160 × 1,125 (fator diferente do 1,15 da Metafilm). As 489 h do checklist não entram no cálculo.' },
  },
  {
    id: 'p-e108', number: '261097', clientId: 'motech', machineId: 'm-e108',
    title: 'Preventiva — Coextrusora 3 camadas E 108', status: 'Enviada', origin: 'Relatório de Preventiva E 108 (checklist + OS, PDF)',
    pricing: { mode: 'hora', rate: 120, factor: 1, techs: 3, hoursPerDay: 9, days: 0, fixed: 0 },
    lines: [
      H('Extrusora A', 17.5), H('Extrusora B', 16.5), H('Extrusora C', 16.25), H('Painel elétrico principal', 56),
      H('Cabeçote', 170, 'Limpeza (108 h), polimento (54 h), parafusos, calibração da matriz, giratório'), H('Anel de ar', 12),
      H('Gaiola', 14), H('Medidor de espessura', 5), H('Saia e lemes', 18), H('Reversível', 23), H('Rolos de descida', 13),
      H('Alinhador', 5), H('Estação de tratamento', 6), H('Pré-arraste', 15), H('Bobinadeira 1', 23), H('Bobinadeira 2', 23),
      H('Estrutural — pintura', 250, 'Colunas, vigas, guarda-corpo e pisos', '2 Pintores'), H('Geladeira', 5), H('Ventilador do IBC', 5),
      H('Trocador de calor do IBC', 10), H('Exaustor do IBC', 7), H('Ventilador do anel de ar', 5), H('Trocador de calor', 10),
    ],
    scope: [], km: 0, meals: true, clientResp: 'Souza',
    audit: { declaredHours: 715.25, declaredValue: 85830, source: 'PDF OS E 108', note: 'Cabeçote soma 170 h (planilha: 165) e trocador de calor soma 10 h (planilha: 5). Cobrado a R$ 120/h sem fator de nota.' },
  },
];

const BANDERA: Material[] = [
  [1, 'Eletrocalhas', 'Eletrocalha perfurada galvanizada 400 × 75 × 3000 mm', '1º piso (+8.645): 16,375 m + reserva', 'barra', 5.46, 7, 'Previsão para maior concentração de cabos no 1º piso'],
  [2, 'Eletrocalhas', 'Eletrocalha perfurada galvanizada 200 × 75 × 3000 mm', 'Demais níveis e subidas', 'barra', 13.35, 15, 'Distribuição nos níveis superiores'],
  [3, 'Eletrocalhas', 'Redução 400 × 75 → 200 × 75 mm', 'Transições do 1º piso para ramais/subidas', 'pç', 2, 3, 'Uma peça de reserva'],
  [4, 'Eletrocalhas', 'Curva horizontal 90° 400 × 75 mm', 'Mudanças de direção do 1º piso', 'pç', 2, 2, ''],
  [5, 'Eletrocalhas', 'Curva horizontal 90° 200 × 75 mm', 'Mudanças de direção dos níveis superiores', 'pç', 4, 6, 'Com reserva técnica'],
  [6, 'Eletrocalhas', 'Curva vertical 90° interna/externa 200 × 75 mm', 'Transições entre pisos', 'pç', 10, 10, ''],
  [7, 'Eletrocalhas', 'Jogo de tala/emenda 400 × 75 mm', 'Barras + acessórios do 1º piso', 'jogo', 8, 10, 'Reserva para montagem'],
  [8, 'Eletrocalhas', 'Jogo de tala/emenda 200 × 75 mm', 'Barras + acessórios dos demais níveis', 'jogo', 28, 32, 'Reserva para montagem'],
  [9, 'Suportes', 'Travessa/suporte horizontal 400 mm', '1º piso, espaçamento máx. 1,50 m', 'conj.', 12, 14, ''],
  [10, 'Suportes', 'Travessa/suporte horizontal 200 mm', 'Demais trechos horizontais', 'conj.', 33, 36, 'Com reserva'],
  [11, 'Suportes', 'Suporte vertical 200 × 75 mm', 'Subida total 15,355 m', 'conj.', 12, 14, 'Fixação na estrutura'],
  [12, 'Perfilado', 'Perfilado galvanizado 38 × 38 × 3000 mm', 'Travessas 400/200 mm + ajustes', 'barra', 8.8, 10, 'Revisado pelo aumento da largura no 1º piso'],
  [13, 'Barra roscada', 'Barra roscada galvanizada M10 × 3000 mm', 'Suportes suspensos; 500 mm/tirante', 'barra', 16.5, 18, 'Confirmar comprimento em campo'],
  [14, 'Fixação M10', 'Porca sextavada galvanizada M10', '2 por tirante + reserva', 'pç', 180, 220, ''],
  [15, 'Fixação M10', 'Arruela lisa galvanizada M10', '2 por tirante + reserva', 'pç', 180, 220, ''],
  [16, 'Fixação eletrocalha', 'Parafuso cabeça lentilha M6 × 20 mm galvanizado', 'Emendas + acessórios + reserva', 'pç', 260, 300, ''],
  [17, 'Fixação eletrocalha', 'Porca sextavada M6 galvanizada', '1 por parafuso', 'pç', 260, 300, ''],
  [18, 'Fixação eletrocalha', 'Arruela lisa M6 galvanizada', '1 por parafuso', 'pç', 260, 300, ''],
  [19, 'Aterramento', 'Trança flexível de equipotencialização 250–300 mm', 'Emendas principais + reserva', 'pç', 26, 30, 'Garantir continuidade elétrica'],
  [20, 'Aterramento', 'Kit parafuso/porca/arruela M6', '2 pontos por trança', 'jogo', 52, 60, ''],
  [21, 'Consumível', 'Spray galvanização a frio / zinco', 'Proteção de cortes e furações', 'lata', 2, 2, 'Aplicar em cortes feitos em campo'],
  [22, 'Fixação em viga', 'Grampo de viga tipo jacaré M10 galvanizado', '1 por tirante + reserva', 'pç', 90, 100, 'Evita furar vigas H/I; confirmar carga e espessura da aba'],
].map(([item, group, desc, criteria, unit, calc, buy, obs]) => ({ item, group, desc, criteria, unit, calc, buy, obs } as Material));

const VALGROUP_NOTAS: Expense[] = [
  ['2026-08-17', 'VitoTáxi — Cooperativa dos Taxistas do Amazonas', 'Recibo s/n', 'Transporte aeroporto → Distrito Industrial', 88],
  ['2026-08-17', 'Motorista Uber 99 / Mercado Pago', 'Op. 173315589243', 'Transporte', 195],
  ['2026-08-17', 'Uber', 'Recibo', 'Transporte — Distrito Industrial', 21.99],
  ['2026-08-17', 'Canoas Peixaria Regional', '34281', 'Alimentação', 60],
  ['2026-08-22', 'Sendas Distribuidora', '52747', 'Água / bebidas', 48.84],
  ['2026-08-22', 'Empreendimentos Pague Menos', '202083', 'Farmácia', 53.98],
  ['2026-08-23', 'Vinus Bar e Restaurante', '53255', 'Alimentação', 205],
  ['2026-08-27', 'Maxi Droga', '33372', 'Farmácia', 37],
  ['2026-08-27', 'Posto Anel Leste', '135555', 'Combustível — etanol', 206.64],
  ['2026-08-28', 'SINART — estacionamento', 'RPS 163174', 'Estacionamento', 17],
  ['2026-08-28', 'RAL Empreendimentos', '212800', 'Alimentação e bebidas', 259.41],
  ['2026-08-29', 'Sendas Distribuidora', '32492', 'Alimentação e bebidas', 153.12],
  ['2026-08-30', 'Sendas Distribuidora', '82912', 'Bebidas', 60.84],
].map(([date, supplier, doc, desc, value], i) => ({ id: `nf${i}`, date, supplier, doc, desc, value } as Expense));

const norm = (s: string) => s.trim().toLowerCase().replace('russios', 'russio').replace('júnior', 'junior');
const techIdsFrom = (team: string) => [...new Set(team.split(/[\/,]/).map(norm).filter(Boolean))].filter(t => TECHS.some(x => x.id === t));

function clientFor(name: string): { clientId: string; title: string; machine?: string; location?: string } {
  const n = name.toLowerCase();
  if (n.startsWith('valgroup ba')) return { clientId: 'valgroup', title: name.split('/')[1].trim().replace('Windmoller', 'Windmöller'), machine: 'Windmöller', location: 'Bahia' };
  if (n.startsWith('valgroup ma')) return { clientId: 'valgroup', title: 'Montagem Windmöller', machine: 'Windmöller', location: 'Manaus (AM)' };
  if (n.startsWith('biatex')) return { clientId: 'biatex', title: 'Montagem TNT', machine: 'Linha TNT' };
  if (n.includes('bandera')) return { clientId: 'verde', title: 'Montagem Bandera', machine: 'Bandera Geo 251000300' };
  if (n.startsWith('embrasa')) return { clientId: 'embrasa', title: 'Impressora 8 cores', machine: 'Impressora 8 cores' };
  if (n.startsWith('metafilm')) return { clientId: 'metafilm', title: `Preventiva ${name.replace('Metafilm ', '')}`, machine: name.replace('Metafilm ', '') };
  if (n.startsWith('plasfan')) return { clientId: 'plasfan', title: `Preventiva ${name.replace('Plasfan ', '')}`, machine: name.replace('Plasfan ', '') };
  if (n.startsWith('braskem')) return { clientId: 'braskem', title: 'Estação de tratamento', machine: 'Tratamento corona' };
  return { clientId: 'valgroup', title: name };
}

export function buildSeed(): DB {
  const jobs: Job[] = []; const absences: Absence[] = []; const collective = [];
  (sched as any).jobs.forEach((r: any, i: number) => {
    if (r.name.toLowerCase().startsWith('ferias')) { collective.push({ label: 'Férias coletivas 21/12 a 03/01/2027', weeks: r.weeks }); return; }
    if (r.kind === 'ausencia') {
      const tid = techIdsFrom(r.team)[0];
      absences.push({ id: `a${i}`, techId: tid, label: r.name.replace(/Compromisso\s*/i, '').replace(/^(Gustavo|Junior)\s*/i, '').replace('dia ', '').trim() || 'Compromisso', weeks: r.weeks });
      return;
    }
    const c = clientFor(r.name);
    const st = (r.status === 'Finalizado' ? 'Finalizado' : r.status === 'Executando' ? 'Executando' : 'Aguardando') as Job['status'];
    jobs.push({
      id: `j${i}`, ...c, type: /montagem|desmontagem|carregamento/i.test(r.name) ? 'Montagem / desmontagem' : /preventiva|coex/i.test(r.name) ? 'Preventiva' : 'Assistência técnica',
      techIds: techIdsFrom(r.team), weeks: r.weeks, status: st, sheetStatus: r.status,
      diary: [], expenses: [], materials: [], installments: [],
    });
  });
  // vincular dados reais
  const wind = jobs.find(j => j.title === 'Montagem Windmöller' && j.techIds.length === 3)!;
  wind.expenses = VALGROUP_NOTAS; wind.ref = 'Objeto 67880/2026'; wind.travel = (sched as any).travel;
  const band = jobs.find(j => j.clientId === 'verde')!; band.materials = BANDERA; band.ref = 'Bandera Geo 251000300/2026';
  const j307 = jobs.find(j => j.machine === 'Coex 307' && j.clientId === 'metafilm');
  if (j307) j307.proposalId = 'p-307';
  const proposals = PROPOSALS.map(p => ({ ...p, jobId: p.id === 'p-307' ? j307?.id : undefined }));
  return {
    techs: TECHS, clients: CLIENTS, machines: MACHINES, proposals, jobs, absences, collective,
    inspections: [
      { id: 'i-307', code: '261095', clientId: 'metafilm', machineTag: 'Coex 307', kind: 'extrusora', date: '2026-09-24', techName: 'Rodolfo Gimenes Júnior', clientResp: 'Márcio', marks: {}, extruders: 3, colors: 8, proposalId: 'p-307', legacy: 'Planilha (PDF)' },
      { id: 'i-e108', code: '261097', clientId: 'motech', machineTag: 'E 108', kind: 'extrusora', date: '', techName: '—', clientResp: 'Souza', marks: {}, extruders: 3, colors: 8, proposalId: 'p-e108', legacy: 'Planilha (PDF)' },
      { id: 'i-zara', code: '261096', clientId: 'zaraplast', machineTag: 'Impressora Amazon 8 cores', kind: 'impressora', date: '', techName: '—', clientResp: 'Anderson', marks: {}, extruders: 3, colors: 8, proposalId: 'p-zara', legacy: 'Planilha (xlsx)' },
    ],
    catalog: catalogJson as Catalog, seq: 100, nextNum: 1098,
  };
}
