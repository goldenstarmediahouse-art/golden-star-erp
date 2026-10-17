'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

type Role = 'worker' | 'boss' | 'admin'
type Department = 'Finance' | 'Media' | 'Photography' | 'Miscellaneous'
type ReportStatus = 'Submitted' | 'Reviewed' | 'Needs attention'
type View = 'overview' | 'reports' | 'submit' | 'finance' | 'staff' | 'admin'
type AuthMode = 'login' | 'signup'

type Report = {
  id: string
  title: string
  department: Department
  employee: string
  employeeEmail: string
  date: string
  status: ReportStatus
  fields: { label: string; value: string }[]
  reviewHistory: { label: string; date: string; tone: 'blue' | 'green' | 'amber' }[]
}

type Transaction = { id: string; date: string; description: string; category: string; amount: number; type: 'Income' | 'Expense'; status: 'Cleared' | 'Pending' }

const departments: { name: Department; description: string; color: string; icon: typeof BriefcaseBusiness }[] = [
  { name: 'Finance', description: 'Budgets, cash flow and reconciliations', color: 'blue', icon: CircleDollarSign },
  { name: 'Media', description: 'Production, campaigns and publishing', color: 'purple', icon: BriefcaseBusiness },
  { name: 'Photography', description: 'Shoots, edits and delivery schedules', color: 'orange', icon: BarChart3 },
  { name: 'Miscellaneous', description: 'Operations, facilities and support', color: 'slate', icon: Building2 },
]

const reportFields: Record<Department, { label: string; placeholder: string; type?: string }[]> = {
  Finance: [
    { label: 'Reporting period', placeholder: 'e.g. 01–15 October 2026' },
    { label: 'Income collected', placeholder: 'Amount received this period', type: 'number' },
    { label: 'Key expense or variance', placeholder: 'Describe any notable movement' },
    { label: 'Finance notes', placeholder: 'Reconciliation notes, risks or follow-ups', type: 'textarea' },
  ],
  Media: [
    { label: 'Reporting period', placeholder: 'e.g. Week 42, 2026' },
    { label: 'Active productions', placeholder: 'List projects currently in production' },
    { label: 'Content delivered', placeholder: 'Campaigns, episodes or assets delivered' },
    { label: 'Production notes', placeholder: 'Blockers, milestones and next steps', type: 'textarea' },
  ],
  Photography: [
    { label: 'Reporting period', placeholder: 'e.g. 01–15 October 2026' },
    { label: 'Shoots completed', placeholder: 'Number and names of shoots' },
    { label: 'Deliverables outstanding', placeholder: 'Client galleries or edits in progress' },
    { label: 'Photography notes', placeholder: 'Equipment, scheduling or client notes', type: 'textarea' },
  ],
  Miscellaneous: [
    { label: 'Reporting period', placeholder: 'e.g. Week 42, 2026' },
    { label: 'Operational activity', placeholder: 'Summarize work completed' },
    { label: 'Requests or incidents', placeholder: 'Open requests, incidents or support needs' },
    { label: 'General notes', placeholder: 'Additional updates for management', type: 'textarea' },
  ],
}

const initialReports: Report[] = [
  { id: 'RPT-1048', title: 'Week 42 production update', department: 'Media', employee: 'Tendai Moyo', employeeEmail: 'tendai@gsmedia.co.zw', date: '17 Oct 2026', status: 'Submitted', fields: [{ label: 'Reporting period', value: 'Week 42, 2026' }, { label: 'Active productions', value: 'ZimConnect brand film, City Beats S2' }, { label: 'Content delivered', value: '12 social cuts and 1 broadcast master' }, { label: 'Production notes', value: 'City Beats edit is awaiting final audio mix.' }], reviewHistory: [{ label: 'Submitted by Tendai Moyo', date: '17 Oct, 09:18', tone: 'blue' }] },
  { id: 'RPT-1047', title: 'October cash position', department: 'Finance', employee: 'Rudo Chikore', employeeEmail: 'rudo@gsmedia.co.zw', date: '16 Oct 2026', status: 'Reviewed', fields: [{ label: 'Reporting period', value: '01–15 October 2026' }, { label: 'Income collected', value: '$18,450' }, { label: 'Key expense or variance', value: 'Studio utilities 8% above plan' }, { label: 'Finance notes', value: 'All bank reconciliations are current.' }], reviewHistory: [{ label: 'Submitted by Rudo Chikore', date: '16 Oct, 14:06', tone: 'blue' }, { label: 'Reviewed by David M.', date: '16 Oct, 16:12', tone: 'green' }] },
  { id: 'RPT-1046', title: 'Client delivery status', department: 'Photography', employee: 'Nyasha Dube', employeeEmail: 'nyasha@gsmedia.co.zw', date: '15 Oct 2026', status: 'Needs attention', fields: [{ label: 'Reporting period', value: '01–15 October 2026' }, { label: 'Shoots completed', value: '6 — Kuda Retail, Amara Hotel, 4 private sessions' }, { label: 'Deliverables outstanding', value: 'Amara Hotel gallery — client feedback pending' }, { label: 'Photography notes', value: 'Two softboxes need replacement before next weekend.' }], reviewHistory: [{ label: 'Submitted by Nyasha Dube', date: '15 Oct, 11:32', tone: 'blue' }, { label: 'Flagged by David M.', date: '15 Oct, 13:10', tone: 'amber' }] },
  { id: 'RPT-1045', title: 'Office operations summary', department: 'Miscellaneous', employee: 'Brian Chirwa', employeeEmail: 'brian@gsmedia.co.zw', date: '14 Oct 2026', status: 'Reviewed', fields: [{ label: 'Reporting period', value: 'Week 41, 2026' }, { label: 'Operational activity', value: 'Vendor renewals, asset inventory and vehicle bookings' }, { label: 'Requests or incidents', value: 'New access cards requested for two contractors' }, { label: 'General notes', value: 'Office maintenance completed without disruption.' }], reviewHistory: [{ label: 'Submitted by Brian Chirwa', date: '14 Oct, 15:44', tone: 'blue' }, { label: 'Reviewed by David M.', date: '15 Oct, 08:25', tone: 'green' }] },
]

const initialTransactions: Transaction[] = [
  { id: 'TX-883', date: '17 Oct 2026', description: 'ZimConnect campaign retainer', category: 'Client income', amount: 12500, type: 'Income', status: 'Cleared' },
  { id: 'TX-882', date: '16 Oct 2026', description: 'Studio lease — October', category: 'Facilities', amount: 4200, type: 'Expense', status: 'Cleared' },
  { id: 'TX-881', date: '15 Oct 2026', description: 'City Beats production milestone', category: 'Client income', amount: 8400, type: 'Income', status: 'Cleared' },
  { id: 'TX-880', date: '14 Oct 2026', description: 'Production equipment service', category: 'Equipment', amount: 1350, type: 'Expense', status: 'Pending' },
]

const accountByRole: Record<Role, { name: string; title: string; department: Department; initials: string }> = {
  worker: { name: 'Tendai Moyo', title: 'Media Producer', department: 'Media', initials: 'TM' },
  boss: { name: 'David M. Chisango', title: 'Managing Director', department: 'Miscellaneous', initials: 'DC' },
  admin: { name: 'Amara Ncube', title: 'Developer / Administrator', department: 'Miscellaneous', initials: 'AN' },
}

function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) }
function statusClass(status: ReportStatus) { return status === 'Reviewed' ? 'status-green' : status === 'Needs attention' ? 'status-amber' : 'status-blue' }
function deptClass(dept: Department) { return `dept-${dept.toLowerCase().replace(' ', '-')}` }

function AuthScreen({ mode, setMode, onAuthenticated }: { mode: AuthMode; setMode: (mode: AuthMode) => void; onAuthenticated: (role: Role) => void }) {
  const [selectedRole, setSelectedRole] = useState<Role>('worker')
  const [email, setEmail] = useState('tendai@gsmedia.co.zw')
  const [password, setPassword] = useState('demo1234')
  const [name, setName] = useState('')
  const isLogin = mode === 'login'
  return <main className="auth-shell"><section className="auth-brand-panel"><Image className="auth-brand-mark" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House" width={720} height={333} priority /><p className="auth-kicker">INTERNAL BUSINESS SYSTEM</p><p>ERP System</p><div className="auth-brand-rule" /><span>Operational reporting, financial control and department performance.</span></section><section className="auth-form-panel"><div className="auth-form-wrap"><div className="auth-mobile-brand"><Image className="auth-brand-mark" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House" width={720} height={333} priority /></div><p className="eyebrow">{isLogin ? 'Welcome back' : 'Create an account'}</p><h2>{isLogin ? 'Sign in to ERP System' : 'Register for ERP access'}</h2><p className="auth-subtitle">{isLogin ? 'Use your company account to continue.' : 'Create a local prototype account. No production access is created.'}</p>{!isLogin && <label className="auth-label">Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></label>}<label className="auth-label">Work email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@goldstarmedia.co.zw" /></label><label className="auth-label">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" /></label>{isLogin && <label className="auth-label">Demo account<select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}><option value="worker">Worker — Tendai Moyo</option><option value="boss">Boss — David M. Chisango</option><option value="admin">Developer / Admin — Amara Ncube</option></select></label>}<button className="auth-submit" onClick={() => onAuthenticated(isLogin ? selectedRole : 'worker')}>{isLogin ? 'Sign in' : 'Create demo account'} <ArrowUpRight /></button><p className="auth-switch">{isLogin ? 'New to the system?' : 'Already have an account?'} <button onClick={() => setMode(isLogin ? 'signup' : 'login')}>{isLogin ? 'Create an account' : 'Sign in instead'}</button></p><p className="auth-demo-note">Demo prototype · No production authentication or server-side security</p></div></section></main>
}

export default function ErpApp() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [role, setRole] = useState<Role>('boss')
  const [view, setView] = useState<View>('overview')
  const [reports, setReports] = useState(initialReports)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All departments')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [notice, setNotice] = useState('')
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const account = accountByRole[role]
  const isWorker = role === 'worker'

  useEffect(() => {
    if (window.localStorage.getItem('gs-demo-authenticated') === 'true') setAuthenticated(true)
  }, [])
  useEffect(() => { if (authenticated) window.localStorage.setItem('gs-demo-authenticated', 'true') }, [authenticated])

  useEffect(() => {
    const saved = window.localStorage.getItem('gs-demo-reports')
    if (saved) setReports(JSON.parse(saved))
  }, [])
  useEffect(() => { window.localStorage.setItem('gs-demo-reports', JSON.stringify(reports)) }, [reports])
  useEffect(() => { if (notice) { const timer = window.setTimeout(() => setNotice(''), 3500); return () => window.clearTimeout(timer) } }, [notice])

  const visibleReports = useMemo(() => reports.filter((report) => {
    const ownReport = !isWorker || report.employee === accountByRole.worker.name
    const matchesSearch = `${report.title} ${report.employee} ${report.id}`.toLowerCase().includes(search.toLowerCase())
    return ownReport && matchesSearch && (departmentFilter === 'All departments' || report.department === departmentFilter) && (statusFilter === 'All statuses' || report.status === statusFilter)
  }), [reports, isWorker, search, departmentFilter, statusFilter])

  const totals = useMemo(() => transactions.reduce((acc, tx) => { acc[tx.type] += tx.amount; return acc }, { Income: 0, Expense: 0 }), [transactions])
  const navItems: { id: View; label: string; icon: typeof Home; roles: Role[] }[] = [
    { id: 'overview', label: isWorker ? 'My dashboard' : 'Overview', icon: Home, roles: ['worker', 'boss', 'admin'] },
    { id: 'reports', label: isWorker ? 'My reports' : 'Reports review', icon: ClipboardList, roles: ['worker', 'boss', 'admin'] },
    { id: 'submit', label: 'Submit report', icon: FileText, roles: ['worker', 'boss', 'admin'] },
    { id: 'finance', label: 'Financial overview', icon: WalletCards, roles: ['boss', 'admin'] },
    { id: 'staff', label: 'Staff directory', icon: Users, roles: ['boss', 'admin'] },
    { id: 'admin', label: 'Admin controls', icon: ShieldCheck, roles: ['admin'] },
  ]
  const go = (next: View) => { setView(next); setSelectedReport(null); setMobileNav(false) }
  const reviewReport = (report: Report, status: ReportStatus) => { setReports(reports.map((item) => item.id === report.id ? { ...item, status, reviewHistory: [...item.reviewHistory, { label: `${status} by David M.`, date: 'Just now', tone: status === 'Reviewed' ? 'green' : 'amber' }] } : item)); setSelectedReport({ ...report, status }); setNotice(`Report ${report.id} marked ${status.toLowerCase()}.`) }
  const submitReport = () => { const fields = reportFields[account.department].map((field) => ({ label: field.label, value: formValues[field.label] || 'Not provided' })); const newReport: Report = { id: `RPT-${1050 + reports.length}`, title: `${account.department} report — ${fields[0].value}`, department: account.department, employee: account.name, employeeEmail: role === 'worker' ? 'tendai@gsmedia.co.zw' : 'demo@gsmedia.co.zw', date: '17 Oct 2026', status: 'Submitted', fields, reviewHistory: [{ label: `Submitted by ${account.name}`, date: 'Just now', tone: 'blue' }] }; setReports([newReport, ...reports]); setFormValues({}); setNotice('Your report has been submitted for management review.'); go('reports') }

  if (!authenticated) return <AuthScreen mode={authMode} setMode={setAuthMode} onAuthenticated={(nextRole) => { setRole(nextRole); setAuthenticated(true) }} />

  return (
    <div className="erp-shell">
      <aside className={`erp-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><Image className="brand-mark" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House" width={720} height={333} priority /><button className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">{navItems.filter((item) => item.roles.includes(role)).map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => go(item.id)}><Icon />{item.label}</button> })}</nav>
        <div className="sidebar-footer"><div className="demo-box"><div className="demo-label"><span className="live-dot" /> DEMO MODE</div><p>Prototype records only. Not connected to production systems.</p></div><button className="nav-item"><Settings /> Settings</button></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      <main className="erp-main">
        <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu /></button><div className="breadcrumb"><span>Golden Star Media House</span><ChevronDown /><strong>{navItems.find((item) => item.id === view)?.label}</strong></div><div className="topbar-actions"><button className="icon-button" aria-label="Notifications"><Bell /><span className="notification-dot" /></button><div className="user-menu"><div className="avatar">{account.initials}</div><div className="user-copy"><strong>{account.name}</strong><span>{account.title}</span></div><ChevronDown /></div></div></header>
        <div className="page-body">
          <div className="page-heading"><div><p className="eyebrow">{role === 'worker' ? 'Employee workspace' : role === 'admin' ? 'System administration' : 'Management workspace'}</p><h1>{view === 'overview' ? (isWorker ? `Employee dashboard — ${account.name.split(' ')[0]}` : 'Operations overview') : navItems.find((item) => item.id === view)?.label}</h1><p className="page-subtitle">{view === 'overview' ? (isWorker ? 'Reports, deadlines and department activity.' : 'Current reports, finance and staff activity across the company.') : 'Internal records and operating controls.'}</p></div><div className="role-switcher"><label htmlFor="demo-role">Demo account</label><select id="demo-role" value={role} onChange={(e) => { setRole(e.target.value as Role); setView('overview') }}><option value="worker">Worker — Tendai Moyo</option><option value="boss">Boss — David M. Chisango</option><option value="admin">Developer / Admin — Amara Ncube</option></select></div></div>
          {notice && <div className="notice"><Check /> {notice}</div>}
          {view === 'overview' && <Overview role={role} reports={reports} transactions={transactions} totals={totals} onNavigate={go} />}
          {view === 'reports' && <ReportsView role={role} reports={visibleReports} search={search} setSearch={setSearch} departmentFilter={departmentFilter} setDepartmentFilter={setDepartmentFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSelect={setSelectedReport} />}
          {view === 'submit' && <SubmitView account={account} formValues={formValues} setFormValues={setFormValues} onSubmit={submitReport} />}
          {view === 'finance' && <FinanceView transactions={transactions} totals={totals} onAdd={() => { setTransactions([{ id: `TX-${884 + transactions.length}`, date: '17 Oct 2026', description: 'Demo operating expense', category: 'Operations', amount: 650, type: 'Expense', status: 'Pending' }, ...transactions]); setNotice('Demo transaction added.') }} />}
          {view === 'staff' && <StaffView onNotice={setNotice} />}
          {view === 'admin' && <AdminView onNotice={setNotice} />}
        </div>
      </main>
      {selectedReport && <ReportDrawer report={selectedReport} canReview={role !== 'worker'} onClose={() => setSelectedReport(null)} onReview={reviewReport} />}
    </div>
  )
}

function Overview({ role, reports, transactions, totals, onNavigate }: { role: Role; reports: Report[]; transactions: Transaction[]; totals: { Income: number; Expense: number }; onNavigate: (view: View) => void }) {
  const worker = role === 'worker'
  const ownReports = worker ? reports.filter((r) => r.employee === 'Tendai Moyo') : reports
  const pending = ownReports.filter((r) => r.status === 'Submitted').length
  return <div className="content-stack"><div className="metric-grid"><Metric label={worker ? 'Reports submitted' : 'Reports this period'} value={ownReports.length.toString()} change={worker ? '1 this week' : '+12% vs last month'} icon={ClipboardCheck} tone="blue" /><Metric label={worker ? 'Awaiting review' : 'Needs attention'} value={worker ? pending.toString() : reports.filter((r) => r.status === 'Needs attention').length.toString()} change={worker ? 'Keep your updates current' : 'Across 4 departments'} icon={FileBarChart} tone="amber" /><Metric label={worker ? 'Department' : 'Active staff'} value={worker ? 'Media' : '18'} change={worker ? 'Your assigned workspace' : '16 active today'} icon={Users} tone="green" /><Metric label={worker ? 'Next deadline' : 'Net position'} value={worker ? 'Fri 18 Oct' : money(totals.Income - totals.Expense)} change={worker ? 'Weekly report due' : 'From demo transactions'} icon={CircleDollarSign} tone="purple" /></div>{worker ? <div className="two-col"><Card title="My recent reports" action="View all" onAction={() => onNavigate('reports')}><ReportList reports={ownReports.slice(0, 3)} /></Card><Card title="Quick actions"><div className="quick-actions"><button onClick={() => onNavigate('submit')}><Plus /> Submit department report</button><button onClick={() => onNavigate('reports')}><ClipboardList /> View report history</button></div></Card></div> : <><div className="section-row"><div><h2>Department performance</h2><p className="muted">Current reporting cycle · 01–17 October 2026</p></div><button className="outline-button" onClick={() => onNavigate('reports')}>View all reports <ArrowUpRight /></button></div><div className="department-grid">{departments.map((dept) => { const Icon = dept.icon; const count = reports.filter((r) => r.department === dept.name).length; const reviewed = reports.filter((r) => r.department === dept.name && r.status === 'Reviewed').length; return <button className="department-card" key={dept.name} onClick={() => onNavigate('reports')}><div className={`dept-icon ${dept.color}`}><Icon /></div><div className="department-info"><div className="card-title-row"><h3>{dept.name}</h3><ArrowUpRight /></div><p>{dept.description}</p><div className="progress-label"><span>{reviewed}/{Math.max(count, 4)} reviewed</span><strong>{Math.round((reviewed / Math.max(count, 4)) * 100)}%</strong></div><div className="progress-track"><span style={{ width: `${Math.max(18, (reviewed / Math.max(count, 4)) * 100)}%` }} /></div></div></button> })}</div><div className="two-col"><Card title="Latest reports" action="Review reports" onAction={() => onNavigate('reports')}><ReportList reports={reports.slice(0, 4)} /></Card><Card title="Financial snapshot" action="Open finance" onAction={() => onNavigate('finance')}><div className="finance-snapshot"><div><span>Total income</span><strong>{money(totals.Income)}</strong><small><ArrowUpRight /> 8.4% this month</small></div><div><span>Total expenses</span><strong>{money(totals.Expense)}</strong><small className="expense"><ArrowDownRight /> 3.1% this month</small></div><div className="mini-bars"><i style={{ height: '48%' }} /><i style={{ height: '70%' }} /><i style={{ height: '52%' }} /><i style={{ height: '88%' }} /><i style={{ height: '64%' }} /><i style={{ height: '100%' }} /></div></div></Card></div></>}</div>
}
function Metric({ label, value, change, icon: Icon, tone }: { label: string; value: string; change: string; icon: typeof Home; tone: string }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon /></div><div><span>{label}</span><strong>{value}</strong><small>{change}</small></div></div> }
function Card({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <section className="panel"><div className="panel-heading"><h2>{title}</h2>{action && <button className="text-button" onClick={onAction}>{action} <ArrowUpRight /></button>}</div>{children}</section> }
function ReportList({ reports }: { reports: Report[] }) { return <div className="report-list">{reports.map((report) => <button className="report-row" key={report.id}><div className={`report-type ${deptClass(report.department)}`}>{report.department[0]}</div><div className="report-row-copy"><strong>{report.title}</strong><span>{report.employee} · {report.date}</span></div><span className={`status-pill ${statusClass(report.status)}`}>{report.status}</span><MoreHorizontal /></button>)}</div> }

function ReportsView({ role, reports, search, setSearch, departmentFilter, setDepartmentFilter, statusFilter, setStatusFilter, onSelect }: { role: Role; reports: Report[]; search: string; setSearch: (v: string) => void; departmentFilter: string; setDepartmentFilter: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; onSelect: (r: Report) => void }) { return <div className="content-stack"><div className="filter-bar"><div className="search-field"><Search /><input aria-label="Search reports" placeholder="Search reports, employees or IDs" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select aria-label="Filter by department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option>All departments</option>{departments.map((d) => <option key={d.name}>{d.name}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option><option>Submitted</option><option>Reviewed</option><option>Needs attention</option></select></div><section className="panel table-panel"><div className="table-meta"><div><h2>{role === 'worker' ? 'My report history' : 'All submitted reports'}</h2><p className="muted">{reports.length} records �� Demonstration data</p></div><button className="outline-button" onClick={() => window.print()}><FileText /> Export view</button></div><div className="table-wrap"><table><thead><tr><th>Report</th><th>Department</th><th>Submitted by</th><th>Date</th><th>Status</th><th /></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><button className="table-link" onClick={() => onSelect(report)}><strong>{report.title}</strong><span>{report.id}</span></button></td><td><span className={`department-tag ${deptClass(report.department)}`}>{report.department}</span></td><td>{report.employee}</td><td>{report.date}</td><td><span className={`status-pill ${statusClass(report.status)}`}>{report.status}</span></td><td><button className="row-action" aria-label={`Open ${report.id}`} onClick={() => onSelect(report)}><ArrowUpRight /></button></td></tr>)}</tbody></table>{reports.length === 0 && <div className="empty-state">No reports match your current filters.</div>}</div></section></div> }

function SubmitView({ account, formValues, setFormValues, onSubmit }: { account: typeof accountByRole.worker; formValues: Record<string, string>; setFormValues: (v: Record<string, string>) => void; onSubmit: () => void }) { const fields = reportFields[account.department]; return <div className="form-layout"><section className="panel form-panel"><div className="form-intro"><div className={`dept-icon ${departments.find((d) => d.name === account.department)?.color}`}><FileText /></div><div><h2>{account.department} department report</h2><p>Complete the fields below. This report will be visible to management for review.</p></div></div><div className="form-fields">{fields.map((field) => <label key={field.label}>{field.label}<span className="required">*</span>{field.type === 'textarea' ? <textarea rows={4} placeholder={field.placeholder} value={formValues[field.label] || ''} onChange={(e) => setFormValues({ ...formValues, [field.label]: e.target.value })} /> : <input type={field.type || 'text'} placeholder={field.placeholder} value={formValues[field.label] || ''} onChange={(e) => setFormValues({ ...formValues, [field.label]: e.target.value })} />}</label>)}</div><div className="form-footer"><span>Submitting as <strong>{account.name}</strong> · {account.department}</span><button className="primary-button" onClick={onSubmit}><ClipboardCheck /> Submit report</button></div></section><aside className="info-card"><ShieldCheck /><h3>Reporting guidance</h3><p>Be concise, factual and include any blockers that management should know about.</p><ul><li>Submit one report per reporting period</li><li>Use the department-specific fields provided</li><li>Management may return reports for clarification</li></ul></aside></div> }

function FinanceView({ transactions, totals, onAdd }: { transactions: Transaction[]; totals: { Income: number; Expense: number }; onAdd: () => void }) { return <div className="content-stack"><div className="demo-banner"><CircleDollarSign /><div><strong>Demonstration financial records</strong><span>These figures are mock transactions for the frontend prototype and do not represent live company accounts.</span></div><button className="outline-button" onClick={onAdd}><Plus /> Add demo entry</button></div><div className="metric-grid"><Metric label="Total income" value={money(totals.Income)} change="Across recorded receipts" icon={ArrowUpRight} tone="green" /><Metric label="Total expenses" value={money(totals.Expense)} change="Across operating costs" icon={ArrowDownRight} tone="amber" /><Metric label="Net position" value={money(totals.Income - totals.Expense)} change="Income less expenses" icon={WalletCards} tone="blue" /><Metric label="Pending items" value={transactions.filter((t) => t.status === 'Pending').length.toString()} change="Need reconciliation" icon={ClipboardList} tone="purple" /></div><section className="panel table-panel"><div className="table-meta"><div><h2>Transaction register</h2><p className="muted">Calculated from {transactions.length} mock transactions</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}><td>{tx.date}</td><td><strong>{tx.description}</strong><span className="table-sub">{tx.id}</span></td><td>{tx.category}</td><td><span className={`type-label ${tx.type === 'Income' ? 'income' : 'expense'}`}>{tx.type}</span></td><td className="amount-cell">{tx.type === 'Income' ? '+' : '-'}{money(tx.amount)}</td><td><span className={`status-pill ${tx.status === 'Cleared' ? 'status-green' : 'status-amber'}`}>{tx.status}</span></td></tr>)}</tbody></table></div></section></div> }

function StaffView({ onNotice }: { onNotice: (s: string) => void }) { const [staff, setStaff] = useState([{ name: 'Tendai Moyo', role: 'Media Producer', dept: 'Media', status: 'Active' }, { name: 'Rudo Chikore', role: 'Finance Officer', dept: 'Finance', status: 'Active' }, { name: 'Nyasha Dube', role: 'Lead Photographer', dept: 'Photography', status: 'Active' }, { name: 'Brian Chirwa', role: 'Operations Coordinator', dept: 'Miscellaneous', status: 'On leave' }, { name: 'Kudzai Ncube', role: 'Content Editor', dept: 'Media', status: 'Active' }]); return <div className="content-stack"><div className="section-row"><div><h2>Staff directory</h2><p className="muted">Manage demo staff assignments and account status.</p></div><button className="primary-button" onClick={() => onNotice('Invite flow is represented in this frontend prototype.')}><Plus /> Add staff member</button></div><section className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>Staff member</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr></thead><tbody>{staff.map((person) => <tr key={person.name}><td><div className="staff-cell"><div className="avatar small">{person.name.split(' ').map((n) => n[0]).join('')}</div><strong>{person.name}</strong></div></td><td>{person.role}</td><td><select value={person.dept} onChange={(e) => { setStaff(staff.map((p) => p.name === person.name ? { ...p, dept: e.target.value } : p)); onNotice(`${person.name}'s department updated.`) }}><option>Finance</option><option>Media</option><option>Photography</option><option>Miscellaneous</option></select></td><td><button className={`status-pill ${person.status === 'Active' ? 'status-green' : 'status-amber'}`} onClick={() => { setStaff(staff.map((p) => p.name === person.name ? { ...p, status: p.status === 'Active' ? 'On leave' : 'Active' } : p)); onNotice('Demo account status updated.') }}>{person.status}</button></td><td><button className="row-action" onClick={() => onNotice(`Opened profile for ${person.name}.`)}><UserCog /></button></td></tr>)}</tbody></table></div></section></div> }
function AdminView({ onNotice }: { onNotice: (s: string) => void }) { return <div className="content-stack"><div className="demo-banner admin"><ShieldCheck /><div><strong>Developer / Administrator area</strong><span>These controls only affect the local prototype session. They are not server administration or production security.</span></div></div><div className="admin-grid"><AdminCard icon={UserCog} title="Demo accounts" text="Switch between preconfigured worker, boss and administrator roles." action="Manage demo accounts" onClick={() => onNotice('Demo account configuration is already available in the top bar.')} /><AdminCard icon={Settings} title="System preferences" text="Configure reporting periods, department labels and notification preferences." action="Open preferences" onClick={() => onNotice('Preferences panel is represented for the prototype.')} /><AdminCard icon={ShieldCheck} title="Access model" text="Review the role visibility model used by this frontend demonstration." action="View access notes" onClick={() => onNotice('Workers see only their own reports; management sees company-wide records.')} /></div></div> }
function AdminCard({ icon: Icon, title, text, action, onClick }: { icon: typeof Home; title: string; text: string; action: string; onClick: () => void }) { return <section className="panel admin-card"><div className="admin-card-icon"><Icon /></div><h2>{title}</h2><p>{text}</p><button className="outline-button" onClick={onClick}>{action} <ArrowUpRight /></button></section> }
function ReportDrawer({ report, canReview, onClose, onReview }: { report: Report; canReview: boolean; onClose: () => void; onReview: (r: Report, s: ReportStatus) => void }) { return <div className="drawer-scrim" onClick={onClose}><aside className="report-drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-header"><div><span className={`department-tag ${deptClass(report.department)}`}>{report.department}</span><h2>{report.title}</h2><p>{report.id} · Submitted {report.date}</p></div><button className="icon-button" onClick={onClose} aria-label="Close report"><X /></button></div><div className="drawer-body"><div className="submitter"><div className="avatar">{report.employee.split(' ').map((n) => n[0]).join('')}</div><div><span>Submitted by</span><strong>{report.employee}</strong><small>{report.employeeEmail}</small></div><span className={`status-pill ${statusClass(report.status)}`}>{report.status}</span></div><div className="field-summary">{report.fields.map((field) => <div key={field.label}><span>{field.label}</span><p>{field.value}</p></div>)}</div><div className="review-history"><h3>Review history</h3>{report.reviewHistory.map((item, index) => <div className="history-row" key={`${item.label}-${index}`}><span className={`history-dot ${item.tone}`} /><div><strong>{item.label}</strong><small>{item.date}</small></div></div>)}</div></div>{canReview && <div className="drawer-footer"><button className="outline-button" onClick={() => onReview(report, 'Needs attention')}>Request changes</button><button className="primary-button" onClick={() => onReview(report, 'Reviewed')}><Check /> Mark reviewed</button></div>}</aside></div> }
