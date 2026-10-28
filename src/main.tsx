import './styles.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useDB, Icon } from './ui';
import { LOGO } from './logo';
import { Bell } from './views/bell';
import { Painel } from './views/painel';
import { Servicos, ServicoDetail, svcHrefForJob } from './views/servicos';
import { Inspecoes } from './views/inspecoes';
import { Cronograma } from './views/cronograma';
import { Financeiro } from './views/financeiro';
import { Catalogo, Medicoes } from './views/outros';
import { Clientes } from './views/clientes';
import { alerts } from './logic';

const NAV = [
  ['painel', 'Painel'], ['servicos', 'Serviços'], ['inspecoes', 'Checklist / Inspeção'], ['cronograma', 'Cronograma'],
  ['financeiro', 'Financeiro'], ['clientes', 'Clientes e máquinas'], ['catalogo', 'Catálogo de serviços'], ['medicoes', 'Resistências'],
];

function useRoute() {
  const get = () => (location.hash.replace('#', '') || 'painel');
  const [r, setR] = useState(get);
  useEffect(() => { const f = () => { setR(get()); document.querySelector('.main')?.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}

function Shell() {
  const route = useRoute(); const { db } = useDB(); const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => { try { return localStorage.getItem('tp-tema') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); try { localStorage.setItem('tp-tema', theme); } catch { } }, [theme]);
  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const themeBtn = (cls: string) => <button className={cls} onClick={toggle} aria-label={theme === 'light' ? 'Mudar para tela escura' : 'Mudar para tela clara'}><Icon n={theme === 'light' ? 'moon' : 'sun'} s={15} /><span>{theme === 'light' ? 'Tela escura' : 'Tela clara'}</span></button>;
  const base = route.split('-')[0];
  const nAlerts = alerts(db).filter(a => a.level !== 'info').length;
  let view: React.ReactNode;
  if (route.startsWith('servico-')) view = <ServicoDetail key={route} sid={route.slice(8)} />;
  else if (route.startsWith('proposta-')) view = <ServicoDetail key={route} sid={`p-${route.slice(9)}`} />;
  else if (route.startsWith('obra-')) { const h = svcHrefForJob(db, route.slice(5)).slice(9); view = <ServicoDetail key={route} sid={h} />; }
  else view = ({ painel: <Painel />, servicos: <Servicos />, propostas: <Servicos />, obras: <Servicos />, inspecoes: <Inspecoes />, cronograma: <Cronograma />, financeiro: <Financeiro />, clientes: <Clientes />, catalogo: <Catalogo />, medicoes: <Medicoes /> } as any)[base] ?? <Painel />;
  const active = ['proposta', 'obra', 'servico', 'propostas', 'obras'].includes(base) ? 'servicos' : base;
  return <div className={`app ${open ? 'nav-open' : ''}`}>
    <aside className="side">
      <div className="brand"><img src={LOGO} alt="" /><div><b>TecnoPlástico</b><span>Gestão de serviços</span></div></div>
      <nav onClick={() => setOpen(false)}>
        {NAV.map(([k, l]) => <a key={k} href={`#${k}`} className={active === k ? 'on' : ''}><Icon n={k} /><span>{l}</span>{k === 'painel' && nAlerts > 0 && <em>{nAlerts}</em>}</a>)}
      </nav>
      <div className="side-foot">
        <p>Os dados ficam salvos neste navegador.</p>
        {themeBtn('btn ghost sm theme-btn')}
      </div>
    </aside>
    <div className="scrim" onClick={() => setOpen(false)} />
    <main className="main">
      <div className="topbar"><button className="btn ghost icon only-m" onClick={() => setOpen(true)} aria-label="Abrir menu"><Icon n="menu" /></button><img src={LOGO} alt="" className="only-m tb-logo" /><b className="only-m">TecnoPlástico</b>{themeBtn('btn ghost sm only-m theme-top')}<Bell /></div>
      <div className="appbar"><Bell /></div>
      <div className="page">{view}</div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<Provider><Shell /></Provider>);
