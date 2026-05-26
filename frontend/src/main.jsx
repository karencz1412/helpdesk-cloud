import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, ClipboardList, Home, LogOut, PlusCircle, ShieldCheck, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';
const priorities = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
const statuses = ['NUEVO', 'ASIGNADO', 'EN_PROCESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO', 'REABIERTO'];

function request(path, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
    return data;
  });
}

function App() {
  const [route, setRoute] = useState(location.pathname);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(() => {
    const onPop = () => setRoute(location.pathname);
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  function nav(path) {
    history.pushState({}, '', path);
    setRoute(path);
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    nav('/login');
  }

  if (!user && route !== '/register') return <AuthPage mode="login" setUser={setUser} nav={nav} />;
  if (!user && route === '/register') return <AuthPage mode="register" setUser={setUser} nav={nav} />;

  return <Shell user={user} nav={nav} route={route} logout={logout} setUser={setUser} />;
}

function AuthPage({ mode, setUser, nav }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const data = await request(path, { method: 'POST', body: JSON.stringify(payload) });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      nav('/dashboard');
    } catch (err) { setError(err.message); }
  }

  return <main className="auth-layout">
    <section className="auth-card">
      <h1>HelpDesk Cloud kc 💜</h1>
      <p>Sistema de Tickets y Soporte DevOps</p>
      <form onSubmit={submit} className="form">
        {mode === 'register' && <input placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />}
        <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
        <input placeholder="Contraseña" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
        {error && <div className="alert">{error}</div>}
        <button>{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
      </form>
      <button className="link" onClick={() => nav(mode === 'login' ? '/register' : '/login')}>
        {mode === 'login' ? 'Crear una cuenta' : 'Ya tengo cuenta'}
      </button>
      
    </section>
  </main>;
}

function Shell({ user, nav, route, logout }) {
  const menu = [
    ['Dashboard', '/dashboard', Home],
    ['Tickets', '/tickets', ClipboardList],
    ['Crear ticket', '/tickets/new', PlusCircle],
    ...(user.role !== 'USER' ? [['Admin tickets', '/admin/tickets', ShieldCheck], ['Usuarios', '/admin/users', Users], ['Reportes', '/reports', BarChart3]] : [])
  ];
  return <div className="app-layout">
    <aside className="sidebar">
      <h2>HelpDesk Cloud</h2>
      <p className="role">{user.name}<br /><span>{user.role}</span></p>
      <nav>{menu.map(([label, path, Icon]) => <button key={path} className={route===path?'active':''} onClick={() => nav(path)}><Icon size={18}/>{label}</button>)}</nav>
      <button onClick={logout}><LogOut size={18}/>Salir</button>
    </aside>
    <main className="content">
      {route === '/dashboard' && <Dashboard user={user} />}
      {route === '/tickets' && <TicketsPage user={user} />}
      {route === '/tickets/new' && <NewTicket />}
      {route.startsWith('/tickets/') && route !== '/tickets/new' && <TicketDetail id={route.split('/').pop()} user={user} />}
      {route === '/admin/tickets' && <TicketsPage user={user} admin />}
      {route === '/admin/users' && <UsersPage />}
      {route === '/reports' && <Reports />}
    </main>
  </div>;
}

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { request('/dashboard/stats').then(setStats).catch(console.error); }, []);
  if (!stats) return <p>Cargando...</p>;
  const cards = [
    ['Total', stats.summary.total], ['Nuevos', stats.summary.nuevos], ['En proceso', stats.summary.en_proceso],
    ['Resueltos', stats.summary.resueltos], ['Urgentes', stats.summary.urgentes], ['Vencidos', stats.summary.vencidos]
  ];
  return <section>
    <h1>Dashboard</h1>
    <p>Resumen rápido de tickets según tu rol: <strong>{user.role}</strong></p>
    <div className="cards">{cards.map(([t,v]) => <div className="card" key={t}><span>{t}</span><strong>{v}</strong></div>)}</div>
    <div className="panel"><h3>Tickets por estado</h3><Chart data={stats.byStatus.map(x => ({ name: x.status, total: x.total }))} /></div>
  </section>;
}

function Chart({ data }) {
  return <div style={{width:'100%', height:260}}><ResponsiveContainer><BarChart data={data}><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="total" /></BarChart></ResponsiveContainer></div>;
}

function TicketsPage({ admin=false }) {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ q:'', status:'', priority:'' });
  const [techs, setTechs] = useState([]);
  const [error, setError] = useState('');
  const qs = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([,v]) => v)).toString(), [filters]);
  useEffect(() => { load(); }, [qs]);
  useEffect(() => { request('/users/technicians').then(setTechs).catch(()=>{}); }, []);
  async function load(){ try { setTickets(await request(`/tickets?${qs}`)); } catch(e){ setError(e.message); } }
  async function update(id, patch){ await request(`/tickets/${id}`, { method:'PUT', body: JSON.stringify(patch)}); load(); }
  return <section>
    <h1>{admin ? 'Administración de tickets' : 'Mis tickets'}</h1>
    <div className="filters">
      <input placeholder="Buscar" value={filters.q} onChange={e=>setFilters({...filters,q:e.target.value})}/>
      <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Estado</option>{statuses.map(s=><option key={s}>{s}</option>)}</select>
      <select value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})}><option value="">Prioridad</option>{priorities.map(p=><option key={p}>{p}</option>)}</select>
    </div>
    {error && <div className="alert">{error}</div>}
    <div className="table-wrap"><table><thead><tr><th>Título</th><th>Prioridad</th><th>Estado</th><th>Categoría</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{tickets.map(t => <tr key={t.id}>
      <td><a onClick={() => {history.pushState({},'',`/tickets/${t.id}`); dispatchEvent(new PopStateEvent('popstate'));}}>{t.title}</a><br/><small>{t.creator_name}</small></td>
      <td><span className={`badge p-${t.priority}`}>{t.priority}</span></td>
      <td><span className="badge">{t.status}</span></td>
      <td>{t.category}</td><td>{t.assigned_name || 'Sin asignar'}</td>
      <td>{admin && <div className="row-actions"><select onChange={e=>update(t.id,{status:e.target.value})} value={t.status}>{statuses.map(s=><option key={s}>{s}</option>)}</select><select onChange={e=>update(t.id,{assigned_to:e.target.value})} value={t.assigned_to||''}><option value="">Asignar</option>{techs.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></div>}</td>
    </tr>)}</tbody></table></div>
  </section>;
}

function NewTicket() {
  const [form, setForm] = useState({ title:'', description:'', category:'Acceso', priority:'MEDIA' });
  const [msg, setMsg] = useState('');
  async function submit(e){
    e.preventDefault();
    try { await request('/tickets', { method:'POST', body: JSON.stringify(form)}); setMsg('Ticket creado correctamente.'); setForm({ title:'', description:'', category:'Acceso', priority:'MEDIA' }); }
    catch(e){ setMsg(e.message); }
  }
  return <section className="panel"><h1>Crear nuevo ticket</h1><form onSubmit={submit} className="form wide">
    <input placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
    <textarea placeholder="Descripción" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
    <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Acceso','Sistema','Facturación','Hardware','Software','Otro'].map(c=><option key={c}>{c}</option>)}</select>
    <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{priorities.map(p=><option key={p}>{p}</option>)}</select>
    <button>Guardar ticket</button>{msg && <div className="info">{msg}</div>}
  </form></section>;
}

function TicketDetail({ id, user }) {
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  async function load(){ setTicket(await request(`/tickets/${id}`)); }
  useEffect(()=>{ load().catch(console.error); }, [id]);
  async function addComment(e){ e.preventDefault(); await request(`/tickets/${id}/comments`, { method:'POST', body: JSON.stringify({ comment, is_internal: internal })}); setComment(''); load(); }
  if(!ticket) return <p>Cargando...</p>;
  return <section><h1>{ticket.title}</h1><div className="cards"><div className="card"><span>Estado</span><strong>{ticket.status}</strong></div><div className="card"><span>Prioridad</span><strong>{ticket.priority}</strong></div><div className="card"><span>Técnico</span><strong>{ticket.assigned_name || 'Sin asignar'}</strong></div></div>
  <div className="panel"><h3>Descripción</h3><p>{ticket.description}</p></div>
  <div className="panel"><h3>Comentarios</h3>{ticket.comments?.map(c=><p className="comment" key={c.id}><strong>{c.user_name}</strong> {c.is_internal && <em>Nota interna</em>}<br/>{c.comment}</p>)}<form onSubmit={addComment} className="form wide"><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Responder solicitud"/>{user.role!=='USER' && <label><input type="checkbox" checked={internal} onChange={e=>setInternal(e.target.checked)}/> Nota interna</label>}<button>Enviar comentario</button></form></div>
  <div className="panel"><h3>Historial</h3>{ticket.history?.map(h=><p className="history" key={h.id}>{h.action}: {h.old_value || '-'} → {h.new_value || '-'}</p>)}</div>
  </section>;
}

function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(()=>{ request('/users').then(setUsers).catch(console.error); }, []);
  return <section><h1>Usuarios</h1><div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Creado</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div></section>;
}

function Reports() {
  const [stats, setStats] = useState(null);
  useEffect(()=>{ request('/dashboard/stats').then(setStats).catch(console.error); }, []);
  if(!stats) return <p>Cargando reportes...</p>;
  return <section><h1>Reportes</h1><div className="panel"><h3>Por prioridad</h3><Chart data={stats.byPriority.map(x => ({ name: x.priority, total: x.total }))}/></div><div className="panel"><h3>Tiempo promedio de resolución</h3><p className="big-number">{stats.summary.tiempo_promedio_horas} horas</p></div></section>;
}

createRoot(document.getElementById('root')).render(<App />);
