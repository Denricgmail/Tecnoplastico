export type MachineKind = 'extrusora' | 'impressora' | 'tnt' | 'outra';

export interface CatalogItem { c: string; g: string; e: string; d: string; h: number; t: string; o: string; gn?: string; sn?: string }
export type Catalog = Record<'extrusora' | 'impressora', CatalogItem[]>;

export interface Tech { id: string; name: string; full?: string; role: 'Mecânico' | 'Elétrico' | 'Líder de campo' | 'Técnico'; tone: number }
export interface Client { id: string; name: string; razao?: string; cnpj?: string; unit?: string; city?: string; uf?: string; address?: string; contact?: string; phone?: string; email?: string; note?: string; createdAt?: string }
export interface Machine { id: string; clientId: string; tag: string; kind: MachineKind; desc: string; maker?: string; model?: string; serial?: string; year?: string; extruders?: number; colors?: number }

export type PricingMode = 'hora' | 'tecnico_dia' | 'dia_equipe' | 'fechado';
export interface Pricing { mode: PricingMode; rate: number; factor: number; techs: number; hoursPerDay: number; days: number; fixed: number }
export interface PropLine { id: string; group: string; desc: string; hours: number; team: string; code?: string; obs?: string }
export interface ScopeItem { id: string; title: string; bullets: string[]; days: number; techs: number }
export type PropStatus = 'Rascunho' | 'Enviada' | 'Aprovada' | 'Recusada';
export interface Proposal {
  id: string; number: string; clientId: string; machineId?: string; date?: string; title: string;
  status: PropStatus; pricing: Pricing; lines: PropLine[]; scope: ScopeItem[];
  km: number; meals: boolean; clientResp?: string; techName?: string;
  audit?: { declaredHours?: number; declaredValue?: number; note: string; source: string };
  versions?: { label: string; days: number; value: number; hours: number; note: string }[];
  jobId?: string; origin: string;
}

export type JobStatus = 'Aguardando' | 'Executando' | 'Finalizado' | 'Cancelado';
export interface DiaryEntry { id: string; date: string; techs: string[]; hours: number; waitHours: number; waitReason: string; text: string }
export interface Expense { id: string; date: string; supplier: string; doc: string; desc: string; value: number }
export interface Material { item: number; group: string; desc: string; criteria: string; unit: string; calc: number; buy: number; obs: string }
export interface Installment { id: string; label: string; value: number; due: string; paid: boolean }
export interface Job {
  id: string; clientId: string; title: string; machine?: string; type: string; techIds: string[]; weeks: string[];
  status: JobStatus; proposalId?: string; sheetStatus?: string; location?: string; ref?: string;
  diary: DiaryEntry[]; expenses: Expense[]; materials: Material[]; installments: Installment[];
  travel?: { start: string; plan: Record<string, string> };
}
export interface Absence { id: string; techId: string; label: string; weeks: string[] }
export interface Collective { label: string; weeks: string[] }

export type InspStatus = 'OK' | 'NOK' | 'NI' | 'AN';
export interface Inspection {
  id: string; code?: string; clientId: string; machineId?: string; machineTag: string; kind: 'extrusora' | 'impressora'; date: string; techName: string; clientResp: string;
  marks: Record<string, { s?: InspStatus; obs?: string; h?: number; t?: string }>; extruders: number; colors: number; proposalId?: string; legacy?: string;
}

export interface DB {
  techs: Tech[]; clients: Client[]; machines: Machine[]; proposals: Proposal[]; jobs: Job[];
  absences: Absence[]; collective: Collective[]; inspections: Inspection[]; catalog: Catalog; seq: number; catalogVersion?: number; nextNum?: number;
}
