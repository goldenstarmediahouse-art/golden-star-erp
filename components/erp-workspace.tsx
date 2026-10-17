'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  Plus,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export type WorkspaceRole = 'worker' | 'boss' | 'admin'
type Tab = 'overview' | 'reports' | 'submit' | 'finance' | 'staff' | 'admin' | 'print'
type ReportStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'revision_requested' | 'rejected'
type FieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'checkbox'

type Account = {
  id: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  jobTitle: string | null
  departmentId: string | null
  role: WorkspaceRole
}

type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  job_title: string | null
  department_id: string | null
  status: string
}

type Department = {
  id: string
  name: string
  code: string
  manager_user_id: string | null
  is_active: boolean
}

type Template = {
  id: string
  organization_id: string
  department_id: string
  name: string
  version: number
  is_active: boolean
}

type ReportField = {
  id: string
  template_id: string
  field_key: string
  label: string
  field_type: FieldType
  is_required: boolean
  sort_order: number
  options: unknown
  validation_rules: unknown
}

type Report = {
  id: string
  organization_id: string
  template_id: string
  department_id: string
  submitted_by: string
  report_period_start: string
  report_period_end: string
  status: ReportStatus
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

type ReportAnswer = {
  report_id: string
  field_id: string
  value_text: string | null
  value_number: number | string | null
  value_date: string | null
  value_boolean: boolean | null
  value_json: unknown
}

type ReportReview = {
  id: string
  report_id: string
  reviewer_id: string
  previous_status: string
  new_status: string
  review_comment: string | null
  created_at: string
}

type Category = {
  id: string
  name: string
  category_type: 'income' | 'expense'
  is_active: boolean
}

type Transaction = {
  id: string
  category_id: string
  created_by: string
  transaction_date: string
  description: string
  amount: number | string
  type: 'income' | 'expense'
  payment_status: 'recorded' | 'pending' | 'paid' | 'cancelled'
}

type EmployeeAssignment = {
  id: string
  user_id: string
  previous_department_id: string | null
  new_department_id: string | null
  changed_by: string
  reason: string | null
  created_at: string
}

type Notification = {
  id: string
  recipient_id: string
  title: string
  message: string
  notification_type: string
  is_read: boolean
  created_at: string
}

type AuditEntry = {
  id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

type WorkspaceData = {
  departments: Department[]
  profiles: Profile[]
  assignments: EmployeeAssignment[]
  templates: Template[]
  fields: ReportField[]
  reports: Report[]
  answers: ReportAnswer[]
  reviews: ReportReview[]
  categories: Category[]
  transactions: Transaction[]
  notifications: Notification[]
  audit: AuditEntry[]
  roleByUser: Record<string, string[]>
}

type PrintDataset = Pick<WorkspaceData, 'departments' | 'profiles' | 'templates' | 'fields' | 'reports' | 'answers' | 'reviews'>

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

const emptyData: WorkspaceData = {
  departments: [],
  profiles: [],
  assignments: [],
  templates: [],
  fields: [],
  reports: [],
  answers: [],
  reviews: [],
  categories: [],
  transactions: [],
  notifications: [],
  audit: [],
  roleByUser: {},
}

async function fetchAllPages<T>(
  createRequest: (from: number, to: number) => PromiseLike<PageResult<T>>,
  operation: string,
  pageSize = 200,
) {
  const rows: T[] = []
  for (let offset = 0; ; offset += pageSize) {
    const result = await createRequest(offset, offset + pageSize - 1)
    ensureNoQueryError(result, operation)
    const page = result.data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

async function fetchByIdBatches<T>(
  ids: string[],
  createRequest: (batch: string[], from: number, to: number) => PromiseLike<PageResult<T>>,
  operation: string,
) {
  const rows: T[] = []
  const batchSize = 100
  for (let index = 0; index < ids.length; index += batchSize) {
    const batch = ids.slice(index, index + batchSize)
    rows.push(...await fetchAllPages((from, to) => createRequest(batch, from, to), operation))
  }
  return rows
}

const statusLabels: Record<ReportStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  revision_requested: 'Revision requested',
  rejected: 'Rejected',
}

const statusStyles: Record<ReportStatus, string> = {
  draft: 'status-neutral',
  submitted: 'status-blue',
  under_review: 'status-blue',
  approved: 'status-green',
  revision_requested: 'status-amber',
  rejected: 'status-red',
}

const ecoCashOrganizationId = '825dcc70-7f64-4da5-806f-3e43fcb9f0db'
const ecoCashDepartmentId = '1d871f18-18d3-452b-8974-6b9182410880'
const ecoCashTemplateName = 'EcoCash Weekly Float Register'
const ecoCashDays = [
  { id: 'monday', label: 'Monday', short: 'mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'wed' },
  { id: 'thursday', label: 'Thursday', short: 'thu' },
  { id: 'friday', label: 'Friday', short: 'fri' },
  { id: 'saturday', label: 'Saturday', short: 'sat' },
  { id: 'sunday', label: 'Sunday', short: 'sun' },
] as const
const ecoCashColumns = [
  { id: 'date', label: 'Date' },
  { id: 'deductions', label: 'Cash Deductions' },
  { id: 'cashInFloat', label: 'Cash in Float' },
  { id: 'cashInHand', label: 'Cash in Hand' },
  { id: 'finalFloat', label: 'Final Float' },
  { id: 'manager', label: "Manager's Signature / Approval" },
  { id: 'assistant', label: "Shop Assistant's Signature / Sign-off" },
] as const
type EcoCashColumn = (typeof ecoCashColumns)[number]['id']

const hiddenMediaFieldLabels = new Set([
  'priorities for next week',
  'supporting links or evidence',
  'platforms managed',
  'content published and campaigns',
  'total reach',
  'total engagement',
  'audience growth',
  'content performance summary',
])

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function ensureNoQueryError(result: { error: { message: string } | null }, operation: string) {
  if (result.error) throw new Error(`${operation}: ${result.error.message}`)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function amountText(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)
}

function answerDisplay(answer: ReportAnswer | undefined) {
  if (!answer) return 'No answer'
  if (answer.value_text !== null) return answer.value_text
  if (answer.value_number !== null) return String(answer.value_number)
  if (answer.value_date !== null) return formatDate(answer.value_date)
  if (answer.value_boolean !== null) return answer.value_boolean ? 'Yes' : 'No'
  if (answer.value_json !== null) return JSON.stringify(answer.value_json)
  return 'No answer'
}

function readSelectOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((option) => {
    if (typeof option === 'string') return [option]
    if (option && typeof option === 'object' && 'label' in option && typeof option.label === 'string') return [option.label]
    return []
  })
}

function isEcoCashTemplate(template: Template | undefined, account: Account) {
  return Boolean(
    template
    && account.organizationId === ecoCashOrganizationId
    && account.departmentId === ecoCashDepartmentId
    && template.organization_id === ecoCashOrganizationId
    && template.department_id === ecoCashDepartmentId
    && template.name === ecoCashTemplateName,
  )
}

function isMediaReport(template: Template | undefined, department: Department | undefined) {
  return Boolean(
    template?.name.toLowerCase().includes('media')
    && !template.name.toLowerCase().includes('ecocash')
    && department?.name.toLowerCase() === 'media',
  )
}

function shouldHideMediaField(template: Template | undefined, department: Department | undefined, field: ReportField) {
  return isMediaReport(template, department) && hiddenMediaFieldLabels.has(field.label.trim().toLowerCase())
}

function dateIsValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function dateForWeekDay(weekStart: string, offset: number) {
  if (!dateIsValid(weekStart)) return ''
  const date = new Date(`${weekStart}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function isMondayToSunday(start: string, end: string) {
  if (!dateIsValid(start) || !dateIsValid(end)) return false
  const startDate = new Date(`${start}T00:00:00Z`)
  return startDate.getUTCDay() === 1 && dateForWeekDay(start, 6) === end
}

function mapEcoCashFields(fields: ReportField[]) {
  const mapped = new Map<string, Partial<Record<EcoCashColumn, ReportField>>>()
  const candidates = new Map<string, ReportField[]>()
  const dailyFieldIds = new Set<string>()
  const unmappedDailyFields: ReportField[] = []

  for (const field of fields) {
    const fieldName = `${field.field_key.replace(/[_-]/g, ' ')} ${field.label}`.toLowerCase()
    const days = ecoCashDays.filter((day) => new RegExp(`\\b(?:${day.id}|${day.short})\\b`).test(fieldName))
    if (days.length !== 1) continue
    dailyFieldIds.add(field.id)

    let column: EcoCashColumn | undefined
    if (/shop assistant/.test(fieldName) && /(signature|sign.?off)/.test(fieldName)) column = 'assistant'
    else if (/manager/.test(fieldName) && /(signature|approval|sign.?off)/.test(fieldName)) column = 'manager'
    else if (/\bdate\b/.test(fieldName)) column = 'date'
    else if (/cash\s*deductions?|\bdeductions?\b/.test(fieldName)) column = 'deductions'
    else if (/cash\s*in\s*float|float\s*cash|cash_float/.test(fieldName)) column = 'cashInFloat'
    else if (/cash\s*in\s*hand|cash_hand/.test(fieldName)) column = 'cashInHand'
    else if (/final\s*float|closing\s*float/.test(fieldName)) column = 'finalFloat'

    if (!column) {
      unmappedDailyFields.push(field)
      continue
    }

    const key = `${days[0].id}:${column}`
    const matchingFields = candidates.get(key) ?? []
    matchingFields.push(field)
    candidates.set(key, matchingFields)
  }

  for (const [key, matchingFields] of candidates) {
    if (matchingFields.length !== 1) continue
    const [dayId, column] = key.split(':') as [string, EcoCashColumn]
    mapped.set(dayId, { ...mapped.get(dayId), [column]: matchingFields[0] })
  }

  const duplicateCells = [...candidates.entries()]
    .filter(([, matchingFields]) => matchingFields.length > 1)
    .map(([key]) => key.replace(':', ' / '))
  const missingCells = ecoCashDays.flatMap((day) =>
    ecoCashColumns
      .filter((column) => column.id !== 'date' && !mapped.get(day.id)?.[column.id])
      .map((column) => `${day.label} ${column.label}`),
  )

  return {
    mapped,
    dailyFieldIds,
    unmappedDailyFields,
    duplicateCells,
    missingCells,
    canSubmit: !unmappedDailyFields.length && !duplicateCells.length && !missingCells.length,
  }
}

export default function ErpWorkspace({ account }: { account: Account }) {
  const router = useRouter()
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [data, setData] = useState<WorkspaceData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedReportId, setSelectedReportId] = useState('')
  const [search, setSearch] = useState('')
  const [editingReportId, setEditingReportId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [reviewComment, setReviewComment] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income')
  const [transactionCategory, setTransactionCategory] = useState('')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10))
  const [transactionDescription, setTransactionDescription] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income')
  const [paymentStatus, setPaymentStatus] = useState<'recorded' | 'pending' | 'paid' | 'cancelled'>('recorded')
  const [departmentName, setDepartmentName] = useState('')
  const [departmentCode, setDepartmentCode] = useState('')
  const saveInProgress = useRef(false)
  const printInProgress = useRef(false)
  const [printData, setPrintData] = useState<PrintDataset | null>(null)
  const [printLoading, setPrintLoading] = useState(false)
  const [printError, setPrintError] = useState('')
  const [printDepartment, setPrintDepartment] = useState('')
  const [printTemplate, setPrintTemplate] = useState('')
  const [printEmployee, setPrintEmployee] = useState('')
  const [printStatus, setPrintStatus] = useState('')
  const [printDateStart, setPrintDateStart] = useState('')
  const [printDateEnd, setPrintDateEnd] = useState('')
  const [previewReportId, setPreviewReportId] = useState('')
  const [printReportIds, setPrintReportIds] = useState<string[]>([])
  const [printRequested, setPrintRequested] = useState(false)

  const canManage = account.role === 'boss' || account.role === 'admin'
  const isAdmin = account.role === 'admin'
  const accountName = `${account.firstName} ${account.lastName}`.trim() || account.email

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const reportsRequest = supabase
        .from('reports')
        .select('id, organization_id, template_id, department_id, submitted_by, report_period_start, report_period_end, status, submitted_at, reviewed_at, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200)
      const departmentsRequest = supabase
        .from('departments')
        .select('id, name, code, manager_user_id, is_active')
        .order('name')
        .limit(200)
      const templatesRequest = supabase
        .from('report_templates')
        .select('id, organization_id, department_id, name, version, is_active')
        .eq('organization_id', account.organizationId)
        .order('name')
        .limit(200)
      const profilesRequest = supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, job_title, department_id, status')
        .order('first_name')
        .limit(500)
      const assignmentsRequest = supabase
        .from('employee_assignments')
        .select('id, user_id, previous_department_id, new_department_id, changed_by, reason, created_at')
        .order('created_at', { ascending: false })
        .limit(200)
      const notificationsRequest = supabase
        .from('notifications')
        .select('id, recipient_id, title, message, notification_type, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      const categoriesRequest = canManage
        ? supabase.from('transaction_categories').select('id, name, category_type, is_active').order('name').limit(200)
        : Promise.resolve({ data: [], error: null })
      const transactionsRequest = canManage
        ? supabase.from('financial_transactions').select('id, category_id, created_by, transaction_date, description, amount, type, payment_status').order('transaction_date', { ascending: false }).limit(200)
        : Promise.resolve({ data: [], error: null })
      const auditRequest = isAdmin
        ? supabase.from('audit_logs').select('id, actor_user_id, action, entity_type, entity_id, created_at').order('created_at', { ascending: false }).limit(100)
        : Promise.resolve({ data: [], error: null })
      const rolesRequest = isAdmin
        ? supabase.from('user_roles').select('user_id, role_id').eq('organization_id', account.organizationId)
        : Promise.resolve({ data: [], error: null })

      const [reportsResult, departmentsResult, templatesResult, profilesResult, assignmentsResult, notificationsResult, categoriesResult, transactionsResult, auditResult, rolesResult] = await Promise.all([
        reportsRequest,
        departmentsRequest,
        templatesRequest,
        profilesRequest,
        assignmentsRequest,
        notificationsRequest,
        categoriesRequest,
        transactionsRequest,
        auditRequest,
        rolesRequest,
      ])

      ensureNoQueryError(reportsResult, 'Could not load reports')
      ensureNoQueryError(departmentsResult, 'Could not load departments')
      ensureNoQueryError(templatesResult, 'Could not load report templates')
      ensureNoQueryError(profilesResult, 'Could not load employee profiles')
      ensureNoQueryError(assignmentsResult, 'Could not load employee assignments')
      ensureNoQueryError(notificationsResult, 'Could not load notifications')
      ensureNoQueryError(categoriesResult, 'Could not load transaction categories')
      ensureNoQueryError(transactionsResult, 'Could not load financial transactions')
      ensureNoQueryError(auditResult, 'Could not load audit history')
      ensureNoQueryError(rolesResult, 'Could not load role assignments')

      const reports = (reportsResult.data ?? []) as Report[]
      const templates = (templatesResult.data ?? []) as Template[]
      const reportIds = reports.map((report) => report.id)
      const templateIds = templates.map((template) => template.id)

      const [fieldsResult, answersResult, reviewsResult, roleNamesResult] = await Promise.all([
        templateIds.length
          ? supabase.from('report_fields').select('id, template_id, field_key, label, field_type, is_required, sort_order, options, validation_rules').in('template_id', templateIds).order('sort_order', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        reportIds.length
          ? supabase.from('report_answers').select('report_id, field_id, value_text, value_number, value_date, value_boolean, value_json').in('report_id', reportIds)
          : Promise.resolve({ data: [], error: null }),
        reportIds.length
          ? supabase.from('report_reviews').select('id, report_id, reviewer_id, previous_status, new_status, review_comment, created_at').in('report_id', reportIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        isAdmin && rolesResult.data?.length
          ? supabase.from('roles').select('id, name').in('id', rolesResult.data.map((membership) => membership.role_id))
          : Promise.resolve({ data: [], error: null }),
      ])

      ensureNoQueryError(fieldsResult, 'Could not load report fields')
      ensureNoQueryError(answersResult, 'Could not load report answers')
      ensureNoQueryError(reviewsResult, 'Could not load report review history')
      ensureNoQueryError(roleNamesResult, 'Could not resolve employee roles')

      const roleNames = new Map((roleNamesResult.data ?? []).map((roleRow) => [roleRow.id, roleRow.name]))
      const roleByUser: Record<string, string[]> = {}
      for (const membership of rolesResult.data ?? []) {
        const roleName = roleNames.get(membership.role_id)
        if (!roleName) continue
        roleByUser[membership.user_id] ??= []
        roleByUser[membership.user_id].push(roleName)
      }

      setData({
        departments: (departmentsResult.data ?? []) as Department[],
        profiles: (profilesResult.data ?? []) as Profile[],
        assignments: (assignmentsResult.data ?? []) as EmployeeAssignment[],
        templates,
        fields: (fieldsResult.data ?? []) as ReportField[],
        reports,
        answers: (answersResult.data ?? []) as ReportAnswer[],
        reviews: (reviewsResult.data ?? []) as ReportReview[],
        categories: (categoriesResult.data ?? []) as Category[],
        transactions: (transactionsResult.data ?? []) as Transaction[],
        notifications: (notificationsResult.data ?? []) as Notification[],
        audit: (auditResult.data ?? []) as AuditEntry[],
        roleByUser,
      })
    } catch (cause) {
      setError(messageOf(cause, 'Could not load ERP information.'))
    } finally {
      setLoading(false)
    }
  }, [account.organizationId, canManage, isAdmin, supabase])

  const loadPrintData = useCallback(async () => {
    if (!canManage) {
      setPrintError('Reports & Printing is available only to authorized Boss and Admin accounts.')
      return
    }
    if (printInProgress.current) return
    printInProgress.current = true
    setPrintLoading(true)
    setPrintError('')
    setPrintData(null)
    setPreviewReportId('')
    setPrintReportIds([])
    try {
      const reports = await fetchAllPages(
        (from, to) => supabase
          .from('reports')
          .select('id, organization_id, template_id, department_id, submitted_by, report_period_start, report_period_end, status, submitted_at, reviewed_at, created_at, updated_at')
          .eq('organization_id', account.organizationId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to),
        'Could not load every report permitted by your account',
      ) as Report[]
      const templateIds = [...new Set(reports.map((report) => report.template_id))]
      const departmentIds = [...new Set(reports.map((report) => report.department_id))]
      const employeeIds = [...new Set(reports.map((report) => report.submitted_by))]
      const reportIds = reports.map((report) => report.id)
      const [templates, departments, submitterProfiles, answers, reviews] = await Promise.all([
        fetchByIdBatches(templateIds, (ids, from, to) => supabase
          .from('report_templates')
          .select('id, organization_id, department_id, name, version, is_active')
          .eq('organization_id', account.organizationId)
          .in('id', ids)
          .range(from, to), 'Could not load report templates for printing') as Promise<Template[]>,
        fetchByIdBatches(departmentIds, (ids, from, to) => supabase
          .from('departments')
          .select('id, name, code, manager_user_id, is_active')
          .eq('organization_id', account.organizationId)
          .in('id', ids)
          .range(from, to), 'Could not load report departments for printing') as Promise<Department[]>,
        fetchByIdBatches(employeeIds, (ids, from, to) => supabase
          .from('profiles')
          .select('id, email, first_name, last_name, phone, job_title, department_id, status')
          .eq('organization_id', account.organizationId)
          .in('id', ids)
          .range(from, to), 'Could not load report employee names for printing') as Promise<Profile[]>,
        fetchByIdBatches(reportIds, (ids, from, to) => supabase
          .from('report_answers')
          .select('report_id, field_id, value_text, value_number, value_date, value_boolean, value_json')
          .eq('organization_id', account.organizationId)
          .in('report_id', ids)
          .order('report_id', { ascending: true })
          .order('field_id', { ascending: true })
          .range(from, to), 'Could not load report answers for printing') as Promise<ReportAnswer[]>,
        fetchByIdBatches(reportIds, (ids, from, to) => supabase
          .from('report_reviews')
          .select('id, report_id, reviewer_id, previous_status, new_status, review_comment, created_at')
          .eq('organization_id', account.organizationId)
          .in('report_id', ids)
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, to), 'Could not load report approvals for printing') as Promise<ReportReview[]>,
      ])
      const submitterProfileIds = new Set(submitterProfiles.map((profile) => profile.id))
      const reviewerIds = [...new Set(reviews.map((review) => review.reviewer_id))]
        .filter((reviewerId) => !submitterProfileIds.has(reviewerId))
      const reviewerProfiles = await fetchByIdBatches(reviewerIds, (ids, from, to) => supabase
        .from('profiles')
        .select('id, email, first_name, last_name, phone, job_title, department_id, status')
        .eq('organization_id', account.organizationId)
        .in('id', ids)
        .range(from, to), 'Could not load report reviewer names for printing') as Profile[]
      const fields = await fetchByIdBatches(templateIds, (ids, from, to) => supabase
        .from('report_fields')
        .select('id, template_id, field_key, label, field_type, is_required, sort_order, options, validation_rules')
        .in('template_id', ids)
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to), 'Could not load sorted report fields for printing') as ReportField[]

      setPrintData({ reports, templates, departments, profiles: [...submitterProfiles, ...reviewerProfiles], fields, answers, reviews })
    } catch (cause) {
      setPrintError(messageOf(cause, 'Could not load all authorized print records. No print action is available until loading succeeds.'))
    } finally {
      printInProgress.current = false
      setPrintLoading(false)
    }
  }, [account.organizationId, canManage, supabase])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (tab === 'print' && canManage && !printData && !printLoading && !printError) {
      void loadPrintData()
    }
  }, [canManage, loadPrintData, printData, printError, printLoading, tab])

  useEffect(() => {
    if (!printRequested || !printReportIds.length) return
    setPrintRequested(false)
    window.requestAnimationFrame(() => {
      const images = [...document.querySelectorAll<HTMLImageElement>('.print-document img')]
      void Promise.all(images.map((image) => image.decode())).then(() => {
        window.print()
      }).catch(() => {
        setPrintError('The company logo could not be loaded for printing. Check the logo asset and try again.')
      })
    })
  }, [printReportIds, printRequested])

  const selectedReport = data.reports.find((report) => report.id === selectedReportId)
  const selectedTemplate = data.templates.find((template) => template.id === templateId)
  const selectedFields = data.fields.filter((field) => field.template_id === templateId)
  const selectedDepartment = data.departments.find((department) => department.id === account.departmentId)
  const availableTemplates = data.templates.filter((template) => template.is_active && template.organization_id === account.organizationId && template.department_id === account.departmentId)
  const visibleReports = data.reports.filter((report) => {
    const templateName = data.templates.find((template) => template.id === report.template_id)?.name ?? ''
    const employee = data.profiles.find((profile) => profile.id === report.submitted_by)
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : ''
    return `${templateName} ${employeeName} ${report.status}`.toLowerCase().includes(search.toLowerCase())
  })
  const incomeCount = data.transactions.filter((transaction) => transaction.type === 'income').length
  const expenseCount = data.transactions.filter((transaction) => transaction.type === 'expense').length
  const pendingReports = data.reports.filter((report) => report.status === 'submitted' || report.status === 'under_review').length
  const unreadNotifications = data.notifications.filter((notification) => !notification.is_read).length
  const printDateRangeValid = !printDateStart || !printDateEnd || printDateStart <= printDateEnd
  const printReports = printData?.reports.filter((report) => {
    const statusMatch = !printStatus || report.status === printStatus
    const dateMatch = (!printDateStart || report.report_period_end >= printDateStart)
      && (!printDateEnd || report.report_period_start <= printDateEnd)
    return printDateRangeValid
      && (!printDepartment || report.department_id === printDepartment)
      && (!printTemplate || report.template_id === printTemplate)
      && (!printEmployee || report.submitted_by === printEmployee)
      && statusMatch
      && dateMatch
  }) ?? []
  const printPreviewReports = printData
    ? printReportIds.length
      ? printReportIds.flatMap((id) => {
        const report = printData.reports.find((item) => item.id === id)
        return report ? [report] : []
      })
      : previewReportId
        ? printData.reports.filter((report) => report.id === previewReportId)
        : []
    : []

  function requestPrint(reportIds: string[]) {
    if (!canManage || !printData || !reportIds.length || reportIds.some((id) => !printData.reports.some((report) => report.id === id))) {
      setPrintError('No authorized records are ready to print. Reload the filtered records and try again.')
      return
    }
    setPrintError('')
    setPreviewReportId(reportIds.length === 1 ? reportIds[0] : '')
    setPrintReportIds(reportIds)
    setPrintRequested(true)
  }

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.replace('/login')
      router.refresh()
    } catch (cause) {
      setError(messageOf(cause, 'Sign out failed.'))
    } finally {
      setBusy(false)
    }
  }

  function openDraft(report: Report) {
    const answers = data.answers.filter((answer) => answer.report_id === report.id)
    const values: Record<string, string> = {}
    for (const answer of answers) {
      const field = data.fields.find((candidate) => candidate.id === answer.field_id)
      if (!field) continue
      if (answer.value_text !== null) values[field.id] = answer.value_text
      else if (answer.value_number !== null) values[field.id] = String(answer.value_number)
      else if (answer.value_date !== null) values[field.id] = answer.value_date
      else if (answer.value_boolean !== null) values[field.id] = String(answer.value_boolean)
      else if (answer.value_json !== null) {
        values[field.id] = typeof answer.value_json === 'string'
          ? answer.value_json
          : JSON.stringify(answer.value_json)
      } else values[field.id] = ''
    }
    setEditingReportId(report.id)
    setTemplateId(report.template_id)
    setPeriodStart(report.report_period_start)
    setPeriodEnd(report.report_period_end)
    setFieldValues(values)
    setSelectedReportId('')
    setTab('submit')
    setError('')
  }

  function clearDraftForm() {
    setEditingReportId('')
    setTemplateId(availableTemplates[0]?.id ?? '')
    setPeriodStart('')
    setPeriodEnd('')
    setFieldValues({})
  }

  async function saveReport(event: FormEvent<HTMLFormElement>, submit: boolean) {
    event.preventDefault()
    if (saveInProgress.current) return
    if (!selectedTemplate || !account.departmentId) {
      setError('Choose an active report template for your assigned department.')
      return
    }
    if (!dateIsValid(periodStart) || !dateIsValid(periodEnd) || periodEnd < periodStart) {
      setError('Enter a valid reporting period. The end date must not be before the start date.')
      return
    }
    const invalidDateField = selectedFields.find((field) =>
      field.field_type === 'date'
      && Boolean(fieldValues[field.id]?.trim())
      && !dateIsValid(fieldValues[field.id].trim()),
    )
    if (invalidDateField) {
      setError(`Enter a valid date for ${invalidDateField.label}.`)
      return
    }
    const ecoCashReport = isEcoCashTemplate(selectedTemplate, account)
    if (ecoCashReport && !isMondayToSunday(periodStart, periodEnd)) {
      setError('EcoCash reporting periods must start on Monday and end on the following Sunday.')
      return
    }
    if (ecoCashReport) {
      const ecoCashMapping = mapEcoCashFields(selectedFields)
      const invalidEcoCashDate = ecoCashDays
        .map((day) => ecoCashMapping.mapped.get(day.id)?.date)
        .find((field) => {
          if (!field) return false
          const value = fieldValues[field.id]?.trim()
          return value ? !dateIsValid(value) : false
        })
      if (invalidEcoCashDate) {
        setError(`Enter a valid date for ${invalidEcoCashDate.label}.`)
        return
      }
      const invalidRegisterDate = ecoCashDays
        .map((day, dayIndex) => {
          const field = ecoCashMapping.mapped.get(day.id)?.date
          const value = field ? fieldValues[field.id]?.trim() : ''
          return field && value && value !== dateForWeekDay(periodStart, dayIndex) ? field : undefined
        })
        .find((field) => field !== undefined)
      if (invalidRegisterDate) {
        setError(`${invalidRegisterDate.label} must match its date in the selected Monday-to-Sunday week.`)
        return
      }
      if (submit && !ecoCashMapping.canSubmit) {
        setError('The EcoCash template fields could not be mapped unambiguously to every daily register column. Save a draft if needed, and ask an administrator to verify the template field labels before submitting.')
        return
      }
    }
    if (submit) {
      const department = data.departments.find((item) => item.id === selectedTemplate.department_id)
      const hiddenRequiredField = selectedFields.find((field) =>
        field.is_required
        && shouldHideMediaField(selectedTemplate, department, field)
        && !fieldValues[field.id]?.trim(),
      )
      if (hiddenRequiredField) {
        setError(`This Media template still marks “${hiddenRequiredField.label}” as required in Supabase. It is hidden in the form, so this report cannot be submitted until the template requirement is changed by an administrator. You can still save a draft.`)
        return
      }
      const missing = selectedFields.find((field) =>
        field.is_required
        && !shouldHideMediaField(selectedTemplate, department, field)
        && !fieldValues[field.id]?.trim(),
      )
      if (missing) {
        setError(`Complete the required field: ${missing.label}.`)
        return
      }
    }
    const invalidNumericField = selectedFields.find((field) => {
      if (field.field_type !== 'number' && field.field_type !== 'currency') return false
      const value = fieldValues[field.id]?.trim()
      return Boolean(value) && !Number.isFinite(Number(value))
    })
    if (invalidNumericField) {
      setError(`Enter a valid number for ${invalidNumericField.label}.`)
      return
    }

    saveInProgress.current = true
    setBusy(true)
    setError('')
    setNotice('')
    let savedReportId = editingReportId
    try {
      if (savedReportId) {
        const { error: updateError } = await supabase
          .from('reports')
          .update({ report_period_start: periodStart, report_period_end: periodEnd })
          .eq('id', savedReportId)
        if (updateError) throw updateError
      } else {
        if (ecoCashReport) {
          const { data: duplicate, error: duplicateError } = await supabase
            .from('reports')
            .select('id, status')
            .eq('organization_id', account.organizationId)
            .eq('template_id', selectedTemplate.id)
            .eq('submitted_by', account.id)
            .eq('report_period_start', periodStart)
            .eq('report_period_end', periodEnd)
            .maybeSingle()
          if (duplicateError) throw duplicateError
          if (duplicate) {
            throw new Error(`An EcoCash report already exists for this week (${statusLabels[duplicate.status as ReportStatus] ?? duplicate.status}). Open Reports to continue an existing draft or review its status.`)
          }
        }
        const { data: inserted, error: insertError } = await supabase
          .from('reports')
          .insert({
            organization_id: account.organizationId,
            template_id: selectedTemplate.id,
            department_id: account.departmentId,
            submitted_by: account.id,
            report_period_start: periodStart,
            report_period_end: periodEnd,
            status: 'draft',
          })
          .select('id')
          .single()
        if (insertError) throw insertError
        savedReportId = inserted.id
      }

      const answerRows = selectedFields.map((field) => {
        const rawValue = fieldValues[field.id] ?? ''
        const value = rawValue.trim()
        const answer: Record<string, unknown> = {
          report_id: savedReportId,
          organization_id: account.organizationId,
          field_id: field.id,
          value_text: null,
          value_number: null,
          value_date: null,
          value_boolean: null,
          value_json: null,
        }
        const mediaDepartment = data.departments.find((department) => department.id === selectedTemplate.department_id)
        const hideMediaField = shouldHideMediaField(selectedTemplate, mediaDepartment, field)
        if (hideMediaField && !value) {
          const existingAnswer = data.answers.find((answer) => answer.report_id === savedReportId && answer.field_id === field.id)
          if (existingAnswer) {
            answer.value_text = existingAnswer.value_text
            answer.value_number = existingAnswer.value_number
            answer.value_date = existingAnswer.value_date
            answer.value_boolean = existingAnswer.value_boolean
            answer.value_json = existingAnswer.value_json
          }
        } else if (value) {
          if (field.field_type === 'number' || field.field_type === 'currency') {
            const numericValue = Number(value)
            if (!Number.isFinite(numericValue)) throw new Error(`Enter a valid number for ${field.label}.`)
            answer.value_number = numericValue
          } else if (field.field_type === 'date') {
            answer.value_date = value
          } else if (field.field_type === 'checkbox') {
            answer.value_boolean = value === 'true'
          } else {
            answer.value_text = value
          }
        }
        return answer
      })

      if (answerRows.length) {
        const { error: answerError } = await supabase
          .from('report_answers')
          .upsert(answerRows, { onConflict: 'report_id,field_id' })
        if (answerError) throw answerError
      }

      if (submit) {
        const { error: submitError } = await supabase.rpc('submit_report', { _report_id: savedReportId })
        if (submitError) throw submitError
      }

      setNotice(submit ? 'Report submitted for review.' : 'Draft saved.')
      setSelectedReportId('')
      if (submit) clearDraftForm()
      else setEditingReportId(savedReportId)
      await loadData()
    } catch (cause) {
      const savedState = savedReportId && !editingReportId ? ' The draft record may have been created; reload reports before retrying.' : ''
      setError(`${messageOf(cause, 'Could not save the report.')}${savedState}`)
      if (savedReportId && !editingReportId) setEditingReportId(savedReportId)
      await loadData()
    } finally {
      saveInProgress.current = false
      setBusy(false)
    }
  }

  async function reviewReport(report: Report, newStatus: 'under_review' | 'approved' | 'revision_requested' | 'rejected') {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const { error: reviewError } = await supabase.rpc('review_report', {
        _report_id: report.id,
        _new_status: newStatus,
        _comment: reviewComment.trim() || null,
      })
      if (reviewError) throw reviewError
      setReviewComment('')
      setNotice(`Report marked ${statusLabels[newStatus].toLowerCase()}.`)
      await loadData()
    } catch (cause) {
      setError(messageOf(cause, 'Could not review this report.'))
    } finally {
      setBusy(false)
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('transaction_categories').insert({
        organization_id: account.organizationId,
        name: categoryName.trim(),
        category_type: categoryType,
        is_active: true,
      })
      if (insertError) throw insertError
      setCategoryName('')
      setNotice('Transaction category added.')
      await loadData()
    } catch (cause) {
      setError(messageOf(cause, 'Could not add the transaction category.'))
    } finally {
      setBusy(false)
    }
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(transactionAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a transaction amount greater than zero.')
      return
    }
    if (!transactionCategory || !data.categories.some((category) => category.id === transactionCategory && category.is_active && category.category_type === transactionType)) {
      setError('Choose an active category that matches the transaction type.')
      return
    }

    setBusy(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('financial_transactions').insert({
        organization_id: account.organizationId,
        category_id: transactionCategory,
        created_by: account.id,
        transaction_date: transactionDate,
        description: transactionDescription.trim(),
        amount,
        type: transactionType,
        payment_status: paymentStatus,
      })
      if (insertError) throw insertError
      setTransactionDescription('')
      setTransactionAmount('')
      setNotice('Financial transaction recorded.')
      await loadData()
    } catch (cause) {
      setError(messageOf(cause, 'Could not record the transaction.'))
    } finally {
      setBusy(false)
    }
  }

  async function addDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('departments').insert({
        organization_id: account.organizationId,
        name: departmentName.trim(),
        code: departmentCode.trim(),
        is_active: true,
      })
      if (insertError) throw insertError
      setDepartmentName('')
      setDepartmentCode('')
      setNotice('Department added.')
      await loadData()
    } catch (cause) {
      setError(messageOf(cause, 'Could not add the department.'))
    } finally {
      setBusy(false)
    }
  }

  async function setDepartmentActive(department: Department) {
    setBusy(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('departments')
        .update({ is_active: !department.is_active })
        .eq('id', department.id)
      if (updateError) throw updateError
      setNotice(`Department ${department.is_active ? 'deactivated' : 'activated'}.`)
      await loadData()
    } catch (cause) {
      setError(messageOf(cause, 'Could not update the department.'))
    } finally {
      setBusy(false)
    }
  }

  const navigation: { id: Tab; label: string; icon: typeof Home; roles: WorkspaceRole[] }[] = [
    { id: 'overview', label: 'Overview', icon: Home, roles: ['worker', 'boss', 'admin'] },
    { id: 'reports', label: 'Reports', icon: ClipboardList, roles: ['worker', 'boss', 'admin'] },
    { id: 'submit', label: 'Submit report', icon: FileText, roles: ['worker'] },
    { id: 'print', label: 'Reports & Printing', icon: Printer, roles: ['boss', 'admin'] },
    { id: 'finance', label: 'Finance', icon: WalletCards, roles: ['boss', 'admin'] },
    { id: 'staff', label: 'Employees', icon: Users, roles: ['boss', 'admin'] },
    { id: 'admin', label: 'Departments & audit', icon: ShieldCheck, roles: ['admin'] },
  ]

  return (
    <div className="erp-shell">
      <aside className={`erp-sidebar workspace-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><Image className="brand-mark" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House" width={720} height={333} priority /></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="ERP navigation">
          {navigation.filter((item) => item.roles.includes(account.role)).map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setSelectedReportId(''); setError(''); setMobileNav(false) }}>
              <Icon />{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="demo-box workspace-account">
            <div className="demo-label">{account.role.toUpperCase()} ACCOUNT</div>
            <p>{accountName}<br />{selectedDepartment?.name ?? 'Department not assigned'}</p>
          </div>
          <button type="button" className="mobile-close" aria-label="Close navigation" onClick={() => setMobileNav(false)}><X /></button>
          <button type="button" className="nav-item" onClick={signOut} disabled={busy}><LogOut />Sign out</button>
        </div>
      </aside>
      {mobileNav && <button className="mobile-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="erp-main">
        <header className="topbar">
          <button type="button" className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><ClipboardList /></button>
          <div className="breadcrumb"><span>Golden Star Media House</span><ArrowUpRight /><strong>{navigation.find((item) => item.id === tab)?.label}</strong></div>
          <div className="user-menu"><div className="avatar">{account.firstName.slice(0, 1).toUpperCase()}</div><div className="user-copy"><strong>{accountName}</strong><span>{account.jobTitle ?? account.role}</span></div></div>
        </header>
        <div className="page-body">
          <div className="page-heading">
            <div><p className="eyebrow">{account.role === 'worker' ? 'Employee workspace' : account.role === 'admin' ? 'System administration' : 'Management workspace'}</p>
              <h1>{tab === 'overview' ? (account.role === 'worker' ? `My dashboard — ${account.firstName}` : 'Operations overview') : navigation.find((item) => item.id === tab)?.label}</h1>
              <p className="page-subtitle">Live organization data. Access to each record is enforced by Supabase Row Level Security.</p>
            </div>
          </div>

          {error && <div className="workspace-alert error" role="alert"><strong>Action could not be completed</strong><span>{error}</span></div>}
          {notice && <div className="workspace-alert success" role="status"><Check /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">Dismiss</button></div>}
          {loading ? <div className="panel workspace-loading" role="status">Loading authorized ERP records…</div> : (
            <>
              {tab === 'overview' && <Overview account={account} data={data} pendingReports={pendingReports} unreadNotifications={unreadNotifications} incomeCount={incomeCount} expenseCount={expenseCount} onTab={setTab} onReport={(id) => { setSelectedReportId(id); setTab('reports') }} />}
              {tab === 'reports' && <ReportsPanel account={account} data={data} reports={visibleReports} search={search} setSearch={setSearch} selectedReport={selectedReport} onSelect={setSelectedReportId} onEdit={openDraft} onReview={reviewReport} reviewComment={reviewComment} setReviewComment={setReviewComment} busy={busy} />}
              {tab === 'print' && <PrintReportsPanel
                account={account}
                data={printData}
                reports={printReports}
                loading={printLoading}
                error={printError}
                department={printDepartment}
                setDepartment={setPrintDepartment}
                template={printTemplate}
                setTemplate={setPrintTemplate}
                employee={printEmployee}
                setEmployee={setPrintEmployee}
                status={printStatus}
                setStatus={setPrintStatus}
                dateStart={printDateStart}
                setDateStart={setPrintDateStart}
                dateEnd={printDateEnd}
                setDateEnd={setPrintDateEnd}
                previewReportId={previewReportId}
                setPreviewReportId={(id) => { setPreviewReportId(id); setPrintReportIds([]) }}
                previewReports={printPreviewReports}
                onReload={loadPrintData}
                onPrint={requestPrint}
              />}
              {tab === 'submit' && <SubmitPanel account={account} departments={data.departments} templates={availableTemplates} allTemplates={data.templates} fields={data.fields} templateId={templateId} setTemplateId={setTemplateId} periodStart={periodStart} setPeriodStart={setPeriodStart} periodEnd={periodEnd} setPeriodEnd={setPeriodEnd} values={fieldValues} setValues={setFieldValues} editingReportId={editingReportId} reportStatus={data.reports.find((report) => report.id === editingReportId)?.status ?? 'draft'} onSave={saveReport} onNew={clearDraftForm} busy={busy} />}
              {tab === 'finance' && <FinancePanel data={data} categoryName={categoryName} setCategoryName={setCategoryName} categoryType={categoryType} setCategoryType={setCategoryType} onAddCategory={addCategory} transactionCategory={transactionCategory} setTransactionCategory={setTransactionCategory} transactionDate={transactionDate} setTransactionDate={setTransactionDate} transactionDescription={transactionDescription} setTransactionDescription={setTransactionDescription} transactionAmount={transactionAmount} setTransactionAmount={setTransactionAmount} transactionType={transactionType} setTransactionType={setTransactionType} paymentStatus={paymentStatus} setPaymentStatus={setPaymentStatus} onAddTransaction={addTransaction} busy={busy} />}
              {tab === 'staff' && <StaffPanel account={account} data={data} />}
              {tab === 'admin' && <AdminPanel data={data} departmentName={departmentName} setDepartmentName={setDepartmentName} departmentCode={departmentCode} setDepartmentCode={setDepartmentCode} onAddDepartment={addDepartment} onDepartmentActive={setDepartmentActive} busy={busy} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Overview({ account, data, pendingReports, unreadNotifications, incomeCount, expenseCount, onTab, onReport }: {
  account: Account
  data: WorkspaceData
  pendingReports: number
  unreadNotifications: number
  incomeCount: number
  expenseCount: number
  onTab: (tab: Tab) => void
  onReport: (id: string) => void
}) {
  const ownReports = account.role === 'worker' ? data.reports.filter((report) => report.submitted_by === account.id) : data.reports
  const metricCards = [
    { label: 'Reports loaded', value: String(ownReports.length), note: 'Among the latest 200 authorized records', icon: ClipboardList },
    { label: account.role === 'worker' ? 'Awaiting review' : 'Review queue', value: String(account.role === 'worker' ? ownReports.filter((report) => report.status === 'submitted' || report.status === 'under_review').length : pendingReports), note: 'Among the latest 200 authorized records', icon: FileText },
    { label: account.role === 'worker' ? 'Department' : 'Employees', value: account.role === 'worker' ? (data.departments.find((department) => department.id === account.departmentId)?.name ?? 'Unassigned') : String(data.profiles.length), note: 'From authorized profile records', icon: Users },
    { label: account.role === 'worker' ? 'Notifications' : 'Transactions', value: account.role === 'worker' ? String(unreadNotifications) : String(data.transactions.length), note: account.role === 'worker' ? 'Unread notifications' : `${incomeCount} income · ${expenseCount} expense records`, icon: WalletCards },
  ]
  return (
    <div className="content-stack">
      <div className="metric-grid">
        {metricCards.map(({ label, value, note, icon: Icon }) => <div className="metric-card" key={label}><div className="metric-icon blue"><Icon /></div><div><span>{label}</span><strong className="metric-value">{value}</strong><small>{note}</small></div></div>)}
      </div>
      {account.role !== 'worker' && <section className="panel print-access-card">
        <div><p className="eyebrow">Management tools</p><h2>Reports & Printing</h2><p className="muted">Filter authorized reports across departments, preview a record, or print a complete filtered set.</p></div>
        <button className="primary-button" type="button" onClick={() => onTab('print')}><Printer /> Open Reports & Printing</button>
      </section>}
      <section className="panel">
        <div className="panel-heading"><div><h2>Recent reports</h2><p className="muted">Records visible to your signed-in account</p></div><button className="text-button" type="button" onClick={() => onTab('reports')}>Open reports <ArrowUpRight /></button></div>
        {ownReports.length ? <div className="table-wrap"><table><thead><tr><th>Template</th><th>Department</th><th>Reporting period</th><th>Status</th></tr></thead><tbody>
          {ownReports.slice(0, 6).map((report) => <ReportRow key={report.id} report={report} data={data} onSelect={() => onReport(report.id)} />)}
        </tbody></table></div> : <EmptyState>No reports are currently visible.</EmptyState>}
      </section>
      <div className="two-col">
        <section className="panel">
          <div className="panel-heading"><div><h2>Departments</h2><p className="muted">Active department records</p></div></div>
          <div className="workspace-list">
            {data.departments.filter((department) => department.is_active).map((department) => <div className="workspace-list-row" key={department.id}><Building2 /><span>{department.name}</span><small>{department.code}</small></div>)}
            {!data.departments.some((department) => department.is_active) && <EmptyState>No active departments are visible.</EmptyState>}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h2>Notifications</h2><p className="muted">Notifications addressed to your account</p></div><span className="status-pill status-blue">{unreadNotifications} unread</span></div>
          <div className="workspace-list">
            {data.notifications.slice(0, 5).map((notification) => <div className="workspace-list-row notification-row" key={notification.id}><Bell /><span><strong>{notification.title}</strong><small>{notification.message}</small></span><time>{formatTimestamp(notification.created_at)}</time></div>)}
            {!data.notifications.length && <EmptyState>No notifications are currently visible.</EmptyState>}
          </div>
        </section>
      </div>
      {account.role !== 'worker' && <section className="panel">
        <div className="panel-heading"><div><h2>Financial records</h2><p className="muted">No totals calculated without currency and settlement rules</p></div><button className="text-button" type="button" onClick={() => onTab('finance')}>Open finance <ArrowUpRight /></button></div>
        <div className="finance-summary"><div><span>Income transactions</span><strong>{incomeCount}</strong><small>Authorized records visible</small></div><div><span>Expense transactions</span><strong>{expenseCount}</strong><small>Authorized records visible</small></div></div>
      </section>}
    </div>
  )
}

function ReportRow({ report, data, onSelect }: { report: Report; data: WorkspaceData; onSelect: () => void }) {
  const template = data.templates.find((item) => item.id === report.template_id)
  const department = data.departments.find((item) => item.id === report.department_id)
  const profile = data.profiles.find((item) => item.id === report.submitted_by)
  return <tr><td><button className="table-link" type="button" onClick={onSelect}><strong>{template?.name ?? 'Report'}</strong><span>{profile ? `${profile.first_name} ${profile.last_name}` : 'Authorized employee'}</span></button></td><td>{department?.name ?? '—'}</td><td>{formatDate(report.report_period_start)} – {formatDate(report.report_period_end)}</td><td><span className={`status-pill ${statusStyles[report.status]}`}>{statusLabels[report.status]}</span></td></tr>
}

function ReportsPanel({ account, data, reports, search, setSearch, selectedReport, onSelect, onEdit, onReview, reviewComment, setReviewComment, busy }: {
  account: Account
  data: WorkspaceData
  reports: Report[]
  search: string
  setSearch: (value: string) => void
  selectedReport: Report | undefined
  onSelect: (id: string) => void
  onEdit: (report: Report) => void
  onReview: (report: Report, status: 'under_review' | 'approved' | 'revision_requested' | 'rejected') => void
  reviewComment: string
  setReviewComment: (value: string) => void
  busy: boolean
}) {
  const reportAnswers = selectedReport ? data.answers.filter((answer) => answer.report_id === selectedReport.id) : []
  const reportFields = selectedReport ? data.fields.filter((field) => field.template_id === selectedReport.template_id) : []
  const reportReviews = selectedReport ? data.reviews.filter((review) => review.report_id === selectedReport.id) : []
  const canEdit = selectedReport && account.role === 'worker' && selectedReport.submitted_by === account.id && (selectedReport.status === 'draft' || selectedReport.status === 'revision_requested')
  const canReview = account.role !== 'worker' && selectedReport && selectedReport.submitted_by !== account.id && ['submitted', 'under_review', 'revision_requested'].includes(selectedReport.status)
  const ownReportManager = account.role !== 'worker' && selectedReport?.submitted_by === account.id
  return (
    <div className="content-stack">
      <section className="panel table-panel">
        <div className="table-meta"><div><h2>Reports</h2><p className="muted">Report visibility and updates are governed by database policies.</p></div><div className="search-field"><input aria-label="Search reports" placeholder="Search template, employee or status" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
        {reports.length ? <div className="table-wrap"><table><thead><tr><th>Template / employee</th><th>Department</th><th>Reporting period</th><th>Submitted</th><th>Status</th></tr></thead><tbody>
          {reports.map((report) => <ReportRow key={report.id} report={report} data={data} onSelect={() => onSelect(report.id)} />)}
        </tbody></table></div> : <EmptyState>No reports match your search or are visible to this account.</EmptyState>}
      </section>
      {selectedReport && <section className="panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Report details</p><h2>{data.templates.find((template) => template.id === selectedReport.template_id)?.name ?? 'Report'}</h2><p className="muted">{formatDate(selectedReport.report_period_start)} – {formatDate(selectedReport.report_period_end)} · {data.departments.find((department) => department.id === selectedReport.department_id)?.name ?? 'Department'}</p></div>
          <div className="detail-actions"><span className={`status-pill ${statusStyles[selectedReport.status]}`}>{statusLabels[selectedReport.status]}</span><button className="outline-button" type="button" onClick={() => onSelect('')}>Close</button></div>
        </div>
        <div className="report-detail-fields">
          {reportFields.filter((field) => !shouldHideMediaField(
            data.templates.find((template) => template.id === selectedReport.template_id),
            data.departments.find((department) => department.id === selectedReport.department_id),
            field,
          )).map((field) => <div key={field.id}><span>{field.label}</span><p>{answerDisplay(reportAnswers.find((answer) => answer.field_id === field.id))}</p></div>)}
          {!reportFields.length && <EmptyState>No template fields are available for this report.</EmptyState>}
        </div>
        {ownReportManager && <p className="schema-footnote self-review-warning">Review actions are disabled for your own report in this interface. The exported review_report function does not itself reject self-review for a boss/admin account that also holds the worker role; a database-side guard is needed to enforce this against direct RPC calls.</p>}
        <div className="panel-heading"><div><h2>Review history</h2></div></div>
        <div className="workspace-list">
          {reportReviews.map((review) => <div className="workspace-list-row" key={`${review.report_id}-${review.created_at}`}><ClipboardList /><span><strong>{statusLabels[review.new_status as ReportStatus] ?? review.new_status}</strong><small>{review.review_comment || 'No comment'}</small></span><time>{formatTimestamp(review.created_at)}</time></div>)}
          {!reportReviews.length && <EmptyState>No review actions are recorded yet.</EmptyState>}
        </div>
        <div className="report-detail-footer">
          {canEdit && <button type="button" className="primary-button" onClick={() => onEdit(selectedReport)}>Edit draft</button>}
          {canReview && <div className="review-actions">
            <label className="workspace-label-dark">Review comment<textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={2} placeholder="Optional comment recorded with this review" /></label>
            <div className="button-row">
              {selectedReport.status === 'submitted' && <button type="button" className="outline-button" disabled={busy} onClick={() => onReview(selectedReport, 'under_review')}>Start review</button>}
              <button type="button" className="primary-button" disabled={busy} onClick={() => onReview(selectedReport, 'approved')}>Approve</button>
              <button type="button" className="outline-button" disabled={busy} onClick={() => onReview(selectedReport, 'revision_requested')}>Request revision</button>
              <button type="button" className="danger-button" disabled={busy} onClick={() => onReview(selectedReport, 'rejected')}>Reject</button>
            </div>
          </div>}
        </div>
      </section>}
    </div>
  )
}

function photographyWeeklyTotals(report: Report, department: Department | undefined, fields: ReportField[], answers: ReportAnswer[]) {
  if (!department?.name.toLowerCase().includes('photograph')) return []
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const totals: { label: string; value: number }[] = []
  const measures = [
    { label: 'Derived weekly income total', matches: (name: string) => /\b(income|revenue|sales)\b/.test(name) },
    { label: 'Derived weekly client count', matches: (name: string) => /\bclients?\b/.test(name) && /\b(count|number|total|clients?)\b/.test(name) },
  ]
  for (const measure of measures) {
    const dailyFields = days.map((day) => fields.filter((field) => {
      const name = `${field.field_key.replace(/[_-]/g, ' ')} ${field.label}`.toLowerCase()
      return new RegExp(`\\b${day}\\b`).test(name)
        && measure.matches(name)
        && (field.field_type === 'number' || field.field_type === 'currency')
    }))
    if (dailyFields.some((matches) => matches.length !== 1)) continue
    const dailyValues = dailyFields.map(([field]) => {
      const answer = answers.find((candidate) => candidate.report_id === report.id && candidate.field_id === field.id)
      if (answer?.value_number === null || answer?.value_number === undefined) return undefined
      const value = Number(answer.value_number)
      return Number.isFinite(value) ? value : undefined
    })
    if (dailyValues.every((value): value is number => value !== undefined)) {
      totals.push({ label: measure.label, value: dailyValues.reduce((sum, value) => sum + value, 0) })
    }
  }
  return totals
}

function PrintReportDocument({ report, data, variant = 'print' }: { report: Report; data: PrintDataset; variant?: 'screen' | 'print' }) {
  const template = data.templates.find((item) => item.id === report.template_id)
  const department = data.departments.find((item) => item.id === report.department_id)
  const employee = data.profiles.find((item) => item.id === report.submitted_by)
  const fields = data.fields
    .filter((field) => field.template_id === report.template_id)
    .filter((field) => !shouldHideMediaField(template, department, field))
    .sort((left, right) => left.sort_order - right.sort_order)
  const answers = data.answers.filter((answer) => answer.report_id === report.id)
  const reviews = data.reviews.filter((review) => review.report_id === report.id)
  const employeeLabel = employee ? `${employee.first_name} ${employee.last_name}`.trim() || employee.email : 'Authorized employee'
  const reviewerName = (reviewerId: string) => {
    const reviewer = data.profiles.find((profile) => profile.id === reviewerId)
    return reviewer ? `${reviewer.first_name} ${reviewer.last_name}`.trim() || reviewer.email : 'Authorized reviewer'
  }
  const weeklyTotals = photographyWeeklyTotals(report, department, fields, answers)
  const printTimestamp = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())

  return (
    <article className={`print-document print-document-${variant}`}>
      <header className="print-company-header">
        <Image className="print-company-logo" src="/logo/golden%20star%20logo.png" alt="Golden Star Media House logo" width={240} height={111} />
        <div><p className="print-company-name">GOLDEN STAR MEDIA HOUSE</p><p>Everything We Touch Turns into Pure Gold</p><p>387 Robert Mugabe Way, Masvingo · +263783469831 / +263783604545</p></div>
      </header>
      <div className="print-title-row">
        <div><p className="eyebrow">Report</p><h2>{template?.name ?? 'Report'}</h2></div>
        <span className={`status-pill ${statusStyles[report.status]}`}>{statusLabels[report.status] ?? report.status}</span>
      </div>
      <dl className="print-metadata">
        <div><dt>Department</dt><dd>{department?.name ?? '—'}</dd></div>
        <div><dt>Employee</dt><dd>{employeeLabel}</dd></div>
        <div><dt>Reporting period</dt><dd>{formatDate(report.report_period_start)} – {formatDate(report.report_period_end)}</dd></div>
        <div><dt>Submitted</dt><dd>{formatTimestamp(report.submitted_at)}</dd></div>
        <div><dt>Last reviewed</dt><dd>{formatTimestamp(report.reviewed_at)}</dd></div>
        <div><dt>Printed</dt><dd>{printTimestamp}</dd></div>
      </dl>
      <table className="print-fields-table">
        <thead><tr><th scope="col">Field</th><th scope="col">Recorded value</th></tr></thead>
        <tbody>{fields.map((field) => {
          const answer = answers.find((candidate) => candidate.field_id === field.id)
          return <tr key={field.id}><th scope="row">{field.label}</th><td>{answerDisplay(answer)}</td></tr>
        })}{!fields.length && <tr><td colSpan={2}>No report fields are available.</td></tr>}</tbody>
      </table>
      {weeklyTotals.length > 0 && <section className="print-weekly-totals">
        <h3>Photography weekly totals</h3>
        <dl>{weeklyTotals.map((total) => <div key={total.label}><dt>{total.label}</dt><dd>{amountText(total.value)}</dd></div>)}</dl>
      </section>}
      {!weeklyTotals.length && department?.name.toLowerCase().includes('photograph') && <p className="print-total-note">Photography weekly totals were not calculated because the template did not provide all seven unambiguous daily numeric values.</p>}
      <section className="print-approval-section">
        <h3>Review and approval history</h3>
        {reviews.length
          ? <table className="print-reviews-table"><thead><tr><th>Action</th><th>Reviewer</th><th>Comment</th><th>Date</th></tr></thead><tbody>
            {reviews.map((review) => <tr key={`${review.report_id}-${review.created_at}`}><td>{statusLabels[review.new_status as ReportStatus] ?? review.new_status}</td><td>{reviewerName(review.reviewer_id)}</td><td>{review.review_comment ?? '—'}</td><td>{formatTimestamp(review.created_at)}</td></tr>)}
          </tbody></table>
          : <p>No review actions are recorded.</p>}
      </section>
    </article>
  )
}

function PrintReportsPanel({ account, data, reports, loading, error, department, setDepartment, template, setTemplate, employee, setEmployee, status, setStatus, dateStart, setDateStart, dateEnd, setDateEnd, previewReportId, setPreviewReportId, previewReports, onReload, onPrint }: {
  account: Account
  data: PrintDataset | null
  reports: Report[]
  loading: boolean
  error: string
  department: string
  setDepartment: (value: string) => void
  template: string
  setTemplate: (value: string) => void
  employee: string
  setEmployee: (value: string) => void
  status: string
  setStatus: (value: string) => void
  dateStart: string
  setDateStart: (value: string) => void
  dateEnd: string
  setDateEnd: (value: string) => void
  previewReportId: string
  setPreviewReportId: (value: string) => void
  previewReports: Report[]
  onReload: () => void
  onPrint: (reportIds: string[]) => void
}) {
  const dateRangeValid = !dateStart || !dateEnd || dateStart <= dateEnd
  return (
    <div className="content-stack reports-printing">
      <section className="panel print-controls">
        <div className="panel-heading">
          <div><p className="eyebrow">{account.role} reporting</p><h2>Reports & Printing</h2><p className="muted">Records are loaded from the existing report tables. Supabase RLS determines which reports this account may access.</p></div>
          <button className="outline-button" type="button" onClick={onReload} disabled={loading}><RefreshCw />{loading ? 'Loading records…' : 'Reload authorized records'}</button>
        </div>
        {error && <div className="workspace-alert error" role="alert"><strong>Records could not be loaded</strong><span>{error}</span></div>}
        {loading && <div className="workspace-loading" role="status">Loading every authorized report and its fields, answers, employees and review history in pages…</div>}
        {!loading && !error && !data && <p className="muted">Report records are not loaded yet.</p>}
        {!loading && data && <div className="print-filter-grid">
          <label>Department<select value={department} onChange={(event) => setDepartment(event.target.value)}><option value="">All departments</option>{data.departments.slice().sort((a, b) => a.name.localeCompare(b.name)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Report type<select value={template} onChange={(event) => setTemplate(event.target.value)}><option value="">All report types</option>{data.templates.slice().sort((a, b) => a.name.localeCompare(b.name)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Employee<select value={employee} onChange={(event) => setEmployee(event.target.value)}><option value="">All employees</option>{data.profiles.slice().sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)).map((item) => <option key={item.id} value={item.id}>{`${item.first_name} ${item.last_name}`.trim() || item.email}</option>)}</select></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Week/date from<input type="date" value={dateStart} onChange={(event) => setDateStart(event.target.value)} /></label>
          <label>Week/date to<input type="date" value={dateEnd} onChange={(event) => setDateEnd(event.target.value)} /></label>
        </div>}
        {!dateRangeValid && <p className="print-filter-error" role="alert">The end date must not be before the start date.</p>}
      </section>

      {!loading && data && !error && <>
        <section className="panel table-panel">
          <div className="table-meta print-results-heading"><div><h2>Matching records</h2><p className="muted">{dateRangeValid ? `${reports.length} authorized record${reports.length === 1 ? '' : 's'} match the current filters.` : 'Correct the date range to see matching reports.'}</p></div>
            <button className="primary-button" type="button" disabled={!reports.length || !dateRangeValid} onClick={() => onPrint(reports.map((report) => report.id))}><Printer /> Print All Filtered Records ({reports.length})</button>
          </div>
          {reports.length ? <div className="table-wrap"><table><thead><tr><th>Report</th><th>Department</th><th>Employee</th><th>Reporting period</th><th>Status</th><th className="print-control-cell">Actions</th></tr></thead><tbody>
            {reports.map((report) => {
              const reportTemplate = data.templates.find((item) => item.id === report.template_id)
              const reportDepartment = data.departments.find((item) => item.id === report.department_id)
              const reportEmployee = data.profiles.find((item) => item.id === report.submitted_by)
              return <tr key={report.id}>
                <td>{reportTemplate?.name ?? 'Report'}</td>
                <td>{reportDepartment?.name ?? '—'}</td>
                <td>{reportEmployee ? `${reportEmployee.first_name} ${reportEmployee.last_name}`.trim() || reportEmployee.email : 'Authorized employee'}</td>
                <td>{formatDate(report.report_period_start)} – {formatDate(report.report_period_end)}</td>
                <td><span className={`status-pill ${statusStyles[report.status]}`}>{statusLabels[report.status] ?? report.status}</span></td>
                <td className="print-control-cell"><div className="print-row-actions">
                  <button type="button" className="outline-button compact-button" onClick={() => setPreviewReportId(report.id)}>Preview</button>
                  <button type="button" className="primary-button compact-button" onClick={() => onPrint([report.id])}><Printer /> Print Report</button>
                </div></td>
              </tr>
            })}
          </tbody></table></div> : <EmptyState>{dateRangeValid ? 'No authorized reports match these filters.' : 'Choose a valid date range.'}</EmptyState>}
        </section>
        {previewReportId && <section className="panel print-preview-panel">
          <div className="panel-heading print-controls"><div><p className="eyebrow">Print preview</p><h2>{previewReports[0] ? data.templates.find((item) => item.id === previewReports[0].template_id)?.name ?? 'Report' : 'Report preview'}</h2><p className="muted">Preview values are rendered as text and print using the official company logo.</p></div><div className="button-row"><button className="primary-button" type="button" disabled={!previewReports.length} onClick={() => onPrint([previewReportId])}><Printer /> Print Report</button><button className="outline-button" type="button" onClick={() => setPreviewReportId('')}>Close preview</button></div></div>
          {previewReports.map((report) => <PrintReportDocument key={report.id} report={report} data={data} variant="screen" />)}
        </section>}
      </>}
      <div className="print-document-list" aria-hidden="true">
        {data && previewReports.map((report) => <PrintReportDocument key={report.id} report={report} data={data} variant="print" />)}
      </div>
    </div>
  )
}

function SubmitPanel({ account, departments, templates, allTemplates, fields, templateId, setTemplateId, periodStart, setPeriodStart, periodEnd, setPeriodEnd, values, setValues, editingReportId, reportStatus, onSave, onNew, busy }: {
  account: Account
  departments: Department[]
  templates: Template[]
  allTemplates: Template[]
  fields: ReportField[]
  templateId: string
  setTemplateId: (value: string) => void
  periodStart: string
  setPeriodStart: (value: string) => void
  periodEnd: string
  setPeriodEnd: (value: string) => void
  values: Record<string, string>
  setValues: (value: Record<string, string>) => void
  editingReportId: string
  reportStatus: ReportStatus
  onSave: (event: FormEvent<HTMLFormElement>, submit: boolean) => void
  onNew: () => void
  busy: boolean
}) {
  const template = allTemplates.find((item) => item.id === templateId)
  const templateFields = fields.filter((field) => field.template_id === templateId)
  const department = departments.find((item) => item.id === template?.department_id)
  const displayedFields = templateFields.filter((field) => !shouldHideMediaField(template, department, field))
  const hiddenRequiredFields = templateFields.filter((field) => field.is_required && shouldHideMediaField(template, department, field))
  const ecoCash = isEcoCashTemplate(template, account)
  const ecoCashMapping = ecoCash ? mapEcoCashFields(templateFields) : undefined
  return (
    <div className="content-stack">
      <div className="schema-notice"><strong>{editingReportId ? 'Editing an existing draft' : 'Drafts are saved before submission'}</strong><p>New reports are inserted with status draft. Answers can be edited under RLS; submitting calls the database submit_report workflow, which validates ownership, department and required answers.</p></div>
      {hiddenRequiredFields.length > 0 && <div className="workspace-alert error media-hidden-required-warning" role="status"><strong>Hidden fields are still required by the database</strong><span>This Media report form omits the selected fields, but Supabase still marks {hiddenRequiredFields.map((field) => field.label).join(', ')} as required. Drafts can be saved; submission will remain blocked until an administrator updates the template’s required settings.</span></div>}
      {!templates.length && <div className="workspace-alert error"><strong>No active template is available</strong><span>No active report template is visible for your assigned department. Contact an administrator.</span></div>}
      <form className="panel form-panel workspace-form" onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent).submitter
        onSave(event, submitter instanceof HTMLButtonElement && submitter.value === 'submit')
      }}>
        <div className="form-intro"><div className="metric-icon blue"><FileText /></div><div><h2>{editingReportId ? 'Update report draft' : 'Create a report draft'}</h2><p>{account.firstName} {account.lastName} · {account.role} · {template?.name ?? 'Choose a report template'}</p></div>{editingReportId && <button className="outline-button" type="button" onClick={onNew}>New draft</button>}</div>
        <label className="workspace-template-field">Report template<select required value={templateId} onChange={(event) => { setTemplateId(event.target.value); setValues({}) }} disabled={Boolean(editingReportId)}><option value="">Choose an active template</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name} · v{item.version}</option>)}</select></label>
        {ecoCash ? (
          <EcoCashReportForm
            account={account}
            reportStatus={reportStatus}
            fields={templateFields}
            mapping={ecoCashMapping!}
            periodStart={periodStart}
            setPeriodStart={setPeriodStart}
            periodEnd={periodEnd}
            setPeriodEnd={setPeriodEnd}
            values={values}
            setValues={setValues}
          />
        ) : (
          <div className="form-fields">
            <label>Reporting period start<input type="date" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
            <label>Reporting period end<input type="date" required min={periodStart || undefined} value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
            {displayedFields.map((field) => <ReportFieldInput key={field.id} field={field} value={values[field.id] ?? ''} onChange={(value) => setValues({ ...values, [field.id]: value })} />)}
            {!displayedFields.length && templateId && <p className="muted">This template has no visible fields.</p>}
          </div>
        )}
        <div className="form-footer"><span>{selectedTemplatesNote(template, templates.length)}</span><div className="button-row"><button className="outline-button" type="submit" value="draft" formNoValidate disabled={busy || !templateId}>Save draft</button><button className="primary-button" type="submit" value="submit" disabled={busy || !templateId || Boolean(ecoCashMapping && !ecoCashMapping.canSubmit)}>Save and submit</button></div></div>
      </form>
    </div>
  )
}

function EcoCashReportForm({ account, reportStatus, fields, mapping, periodStart, setPeriodStart, periodEnd, setPeriodEnd, values, setValues }: {
  account: Account
  reportStatus: ReportStatus
  fields: ReportField[]
  mapping: ReturnType<typeof mapEcoCashFields>
  periodStart: string
  setPeriodStart: (value: string) => void
  periodEnd: string
  setPeriodEnd: (value: string) => void
  values: Record<string, string>
  setValues: (value: Record<string, string>) => void
}) {
  const summaryFields = fields.filter((field) => !mapping.dailyFieldIds.has(field.id))
  const setFieldValue = (field: ReportField, value: string) => setValues({ ...values, [field.id]: value })

  return (
    <div className="ecocash-report">
      <header className="ecocash-company-header">
        <p className="eyebrow">GOLDEN STAR MEDIA HOUSE</p>
        <p>Everything We Touch Turns into Pure Gold</p>
        <p>387 Robert Mugabe Way, Masvingo</p>
        <p>+263783469831 / +263783604545</p>
        <h2>ECOCASH FLOAT REGISTER</h2>
      </header>

      <section className="ecocash-period" aria-labelledby="ecocash-period-title">
        <h3 id="ecocash-period-title">Reporting period</h3>
        <label>Week commencing<input type="date" required value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
        <label>Week ending<input type="date" required value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
        <div><span>Assigned Finance employee</span><strong>{`${account.firstName} ${account.lastName}`.trim() || account.email}</strong></div>
        <div><span>Report status</span><strong><span className={`status-pill ${statusStyles[reportStatus]}`}>{statusLabels[reportStatus]}</span></strong></div>
      </section>

      <section className="ecocash-register" aria-labelledby="ecocash-register-title">
        <div className="ecocash-section-heading">
          <div><h3 id="ecocash-register-title">Daily register</h3><p>Fields and answer IDs are loaded from this template in Supabase.</p></div>
        </div>
        <div className="ecocash-table-scroll" role="region" aria-label="Seven-day EcoCash float register" tabIndex={0}>
          <table className="ecocash-table">
            <thead><tr>{ecoCashColumns.map((column) => <th scope="col" key={column.id}>{column.label}</th>)}</tr></thead>
            <tbody>
              {ecoCashDays.map((day, dayIndex) => {
                const dayFields = mapping.mapped.get(day.id)
                const dateField = dayFields?.date
                return (
                  <tr key={day.id}>
                    {ecoCashColumns.map((column) => {
                      if (column.id === 'date') {
                        return <td className="ecocash-date-cell" key={column.id}>
                          <strong>{day.label}</strong>
                          {dateField
                            ? <EcoCashFieldInput field={dateField} value={values[dateField.id] ?? ''} onChange={(value) => setFieldValue(dateField, value)} accessibleLabel={`${day.label} date`} />
                            : <span>{formatDate(dateForWeekDay(periodStart, dayIndex))}</span>}
                        </td>
                      }
                      const field = dayFields?.[column.id]
                      return (
                        <td key={column.id}>
                          {field
                            ? <EcoCashFieldInput field={field} value={values[field.id] ?? ''} onChange={(value) => setFieldValue(field, value)} accessibleLabel={`${day.label} ${column.label}`} />
                            : <span className="ecocash-unmapped" aria-label={`${day.label} ${column.label} field not found in template`}>Not configured</span>}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {(!mapping.canSubmit) && <div className="ecocash-template-warning" role="status">
          <strong>Template field mapping needs review</strong>
          <p>The visible template fields do not unambiguously cover each daily register column. Drafts remain available, but submission is disabled until the template labels are verified.</p>
          {mapping.duplicateCells.length > 0 && <p>Duplicate matches: {mapping.duplicateCells.join(', ')}.</p>}
          {mapping.missingCells.length > 0 && <p>Missing template fields: {mapping.missingCells.slice(0, 8).join(', ')}{mapping.missingCells.length > 8 ? ', and others' : ''}.</p>}
          {mapping.unmappedDailyFields.length > 0 && <p>Unrecognized weekday fields: {mapping.unmappedDailyFields.map((field) => field.label).join(', ')}.</p>}
        </div>}
      </section>

      <section className="ecocash-summary" aria-labelledby="ecocash-summary-title">
        <h3 id="ecocash-summary-title">Weekly summary</h3>
        <div className="form-fields">
          {summaryFields.map((field) => <ReportFieldInput key={field.id} field={field} value={values[field.id] ?? ''} onChange={(value) => setFieldValue(field, value)} />)}
          {!summaryFields.length && <p className="muted">No weekly summary fields are defined in this template.</p>}
        </div>
      </section>

      <aside className="ecocash-accounting-warning" role="note">
        <strong>Reconciliation and sign-off</strong>
        <p>No float-balance formula or total is calculated. Enter the values supplied by the register and reconcile them using your approved Finance procedure.</p>
        <p>Names entered in signature fields are typed acknowledgements only and are not verified digital signatures.</p>
      </aside>
    </div>
  )
}

function EcoCashFieldInput({ field, value, onChange, accessibleLabel }: {
  field: ReportField
  value: string
  onChange: (value: string) => void
  accessibleLabel: string
}) {
  if (field.field_type === 'checkbox') {
    return <input aria-label={accessibleLabel} type="checkbox" required={field.is_required} checked={value === 'true'} onChange={(event) => onChange(String(event.target.checked))} />
  }
  if (field.field_type === 'select') {
    const options = readSelectOptions(field.options)
    if (options.length) {
      return <select aria-label={accessibleLabel} required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>
    }
  }
  if (field.field_type === 'textarea') {
    return <textarea aria-label={accessibleLabel} required={field.is_required} rows={2} value={value} onChange={(event) => onChange(event.target.value)} />
  }
  const inputType = field.field_type === 'currency' || field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'
  return <input aria-label={accessibleLabel} type={inputType} step={inputType === 'number' ? 'any' : undefined} required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)} />
}

function selectedTemplatesNote(template: Template | undefined, count: number) {
  if (!count) return 'No active template in the assigned department'
  return template ? `Template version ${template.version}` : `${count} active template${count === 1 ? '' : 's'} available`
}

function ReportFieldInput({ field, value, onChange }: { field: ReportField; value: string; onChange: (value: string) => void }) {
  const label = <>{field.label}{field.is_required && <span className="required"> *</span>}</>
  if (field.field_type === 'textarea') return <label className="workspace-full-field">{label}<textarea required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)} rows={4} /></label>
  if (field.field_type === 'checkbox') return <label className="checkbox-field"><input type="checkbox" checked={value === 'true'} onChange={(event) => onChange(String(event.target.checked))} />{label}</label>
  if (field.field_type === 'select') {
    const options = readSelectOptions(field.options)
    return <label>{label}{options.length ? <select required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Choose an option</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Enter a value (template options are not a string array)" />}</label>
  }
  const inputType = field.field_type === 'currency' || field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'
  return <label>{label}<input type={inputType} step={inputType === 'number' ? 'any' : undefined} required={field.is_required} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function FinancePanel({ data, categoryName, setCategoryName, categoryType, setCategoryType, onAddCategory, transactionCategory, setTransactionCategory, transactionDate, setTransactionDate, transactionDescription, setTransactionDescription, transactionAmount, setTransactionAmount, transactionType, setTransactionType, paymentStatus, setPaymentStatus, onAddTransaction, busy }: {
  data: WorkspaceData
  categoryName: string
  setCategoryName: (value: string) => void
  categoryType: 'income' | 'expense'
  setCategoryType: (value: 'income' | 'expense') => void
  onAddCategory: (event: FormEvent<HTMLFormElement>) => void
  transactionCategory: string
  setTransactionCategory: (value: string) => void
  transactionDate: string
  setTransactionDate: (value: string) => void
  transactionDescription: string
  setTransactionDescription: (value: string) => void
  transactionAmount: string
  setTransactionAmount: (value: string) => void
  transactionType: 'income' | 'expense'
  setTransactionType: (value: 'income' | 'expense') => void
  paymentStatus: 'recorded' | 'pending' | 'paid' | 'cancelled'
  setPaymentStatus: (value: 'recorded' | 'pending' | 'paid' | 'cancelled') => void
  onAddTransaction: (event: FormEvent<HTMLFormElement>) => void
  busy: boolean
}) {
  const filteredCategories = data.categories.filter((category) => category.is_active && category.category_type === transactionType)
  return (
    <div className="content-stack">
      <div className="metric-grid"><MetricCard label="Income records" value={String(data.transactions.filter((transaction) => transaction.type === 'income').length)} icon={ArrowUpRight} /><MetricCard label="Expense records" value={String(data.transactions.filter((transaction) => transaction.type === 'expense').length)} icon={ArrowDownRight} /><MetricCard label="Categories" value={String(data.categories.length)} icon={WalletCards} /><MetricCard label="Transactions" value={String(data.transactions.length)} icon={ClipboardList} /></div>
      <div className="schema-notice"><strong>Finance permissions and amount interpretation</strong><p>Transaction and category reads and writes are protected by database role policies. The schema has no currency column or documented settlement/recognition rule, so amounts below are raw numeric values and are not totalled or treated as a net balance.</p></div>
      <div className="two-col">
        <form className="panel form-panel" onSubmit={onAddTransaction}>
          <h2>Record transaction</h2><div className="workspace-fields">
            <label>Type<select value={transactionType} onChange={(event) => { setTransactionType(event.target.value as 'income' | 'expense'); setTransactionCategory('') }}><option value="income">Income</option><option value="expense">Expense</option></select></label>
            <label>Category<select required value={transactionCategory} onChange={(event) => setTransactionCategory(event.target.value)}><option value="">Choose category</option>{filteredCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Date<input type="date" required value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} /></label>
            <label>Amount<input type="number" min="0.01" step="0.01" required value={transactionAmount} onChange={(event) => setTransactionAmount(event.target.value)} /></label>
            <label className="workspace-full-field">Description<input maxLength={255} required value={transactionDescription} onChange={(event) => setTransactionDescription(event.target.value)} /></label>
            <label>Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}><option value="recorded">Recorded</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label>
          </div><button className="primary-button" disabled={busy || !filteredCategories.length} type="submit"><Plus /> Record transaction</button>
        </form>
        <div className="panel form-panel">
          <h2>Transaction categories</h2><div className="workspace-list">{data.categories.map((category) => <div className="workspace-list-row" key={category.id}><WalletCards /><span>{category.name}</span><small>{category.category_type} · {category.is_active ? 'Active' : 'Inactive'}</small></div>)}{!data.categories.length && <EmptyState>No categories are visible.</EmptyState>}</div>
          <form className="workspace-inline-form" onSubmit={onAddCategory}><label>New category name<input required maxLength={80} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label><label>Type<select value={categoryType} onChange={(event) => setCategoryType(event.target.value as 'income' | 'expense')}><option value="income">Income</option><option value="expense">Expense</option></select></label><button className="outline-button" disabled={busy} type="submit"><Plus /> Add category</button></form>
        </div>
      </div>
      <section className="panel table-panel"><div className="table-meta"><div><h2>Transactions</h2><p className="muted">Up to 200 most recent authorized transaction records</p></div></div>
        {data.transactions.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Status</th><th>Amount</th></tr></thead><tbody>
          {data.transactions.map((transaction) => <tr key={transaction.id}><td>{formatDate(transaction.transaction_date)}</td><td>{transaction.description}</td><td>{data.categories.find((category) => category.id === transaction.category_id)?.name ?? '—'}</td><td className={`type-label ${transaction.type}`}>{transaction.type}</td><td>{transaction.payment_status}</td><td className="amount-cell">{amountText(Number(transaction.amount))}</td></tr>)}
        </tbody></table></div> : <EmptyState>No financial transactions are visible to this account.</EmptyState>}
      </section>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Home }) {
  return <div className="metric-card"><div className="metric-icon blue"><Icon /></div><div><span>{label}</span><strong className="metric-value">{value}</strong><small>From live database records</small></div></div>
}

function StaffPanel({ account, data }: { account: Account; data: WorkspaceData }) {
  const departmentName = (id: string | null) => data.departments.find((department) => department.id === id)?.name ?? 'Unassigned'
  return (
    <div className="content-stack">
      <div className="schema-notice"><strong>Employee and assignment visibility</strong><p>Profiles are shown only when the current database policy permits them. Assignment history is read-only because the exported schema contains no assignment write policy or assignment RPC.</p></div>
      <section className="panel table-panel"><div className="table-meta"><div><h2>Employee profiles</h2><p className="muted">Status and department are read from profiles</p></div></div>
        {data.profiles.length ? <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Work email</th><th>Job title</th><th>Department</th><th>Status</th>{account.role === 'admin' && <th>Roles</th>}</tr></thead><tbody>
          {data.profiles.map((profile) => <tr key={profile.id}><td><strong>{profile.first_name} {profile.last_name}</strong></td><td>{profile.email}</td><td>{profile.job_title ?? '—'}</td><td>{departmentName(profile.department_id)}</td><td>{profile.status}</td>{account.role === 'admin' && <td>{(data.roleByUser[profile.id] ?? []).join(', ') || '—'}</td>}</tr>)}
        </tbody></table></div> : <EmptyState>No employee profiles are visible to this account.</EmptyState>}
      </section>
      <section className="panel table-panel"><div className="table-meta"><div><h2>Department assignment history</h2><p className="muted">Existing assignment records; no client-side reassignment is allowed</p></div></div>
        {data.assignments.length ? <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Previous department</th><th>New department</th><th>Changed by</th><th>Reason</th><th>Date</th></tr></thead><tbody>
          {data.assignments.map((assignment) => <tr key={assignment.id}><td>{employeeName(data.profiles, assignment.user_id)}</td><td>{departmentName(assignment.previous_department_id)}</td><td>{departmentName(assignment.new_department_id)}</td><td>{employeeName(data.profiles, assignment.changed_by)}</td><td>{assignment.reason ?? '—'}</td><td>{formatTimestamp(assignment.created_at)}</td></tr>)}
        </tbody></table></div> : <EmptyState>No assignment history is visible.</EmptyState>}
      </section>
    </div>
  )
}

function employeeName(profiles: Profile[], userId: string) {
  const profile = profiles.find((item) => item.id === userId)
  return profile ? `${profile.first_name} ${profile.last_name}` : 'Authorized user'
}

function AdminPanel({ data, departmentName, setDepartmentName, departmentCode, setDepartmentCode, onAddDepartment, onDepartmentActive, busy }: {
  data: WorkspaceData
  departmentName: string
  setDepartmentName: (value: string) => void
  departmentCode: string
  setDepartmentCode: (value: string) => void
  onAddDepartment: (event: FormEvent<HTMLFormElement>) => void
  onDepartmentActive: (department: Department) => void
  busy: boolean
}) {
  return (
    <div className="content-stack">
      <div className="schema-notice"><strong>Administration follows the exported RLS policies</strong><p>Department create and active-state updates are allowed for admins. Report templates, fields, user roles, profile edits and employee assignments are read-only here because the export does not provide a verified safe business workflow for changing them.</p></div>
      <div className="two-col">
        <section className="panel form-panel"><h2>Departments</h2>
          <div className="workspace-list">{data.departments.map((department) => <div className="workspace-list-row" key={department.id}><Building2 /><span>{department.name}<small>{department.code}</small></span><small>{department.is_active ? 'Active' : 'Inactive'}</small><button className="outline-button compact-button" type="button" disabled={busy} onClick={() => onDepartmentActive(department)}>{department.is_active ? 'Deactivate' : 'Activate'}</button></div>)}{!data.departments.length && <EmptyState>No departments are visible.</EmptyState>}</div>
          <form className="workspace-inline-form" onSubmit={onAddDepartment}><label>Name<input required maxLength={80} value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} /></label><label>Code<input required maxLength={30} value={departmentCode} onChange={(event) => setDepartmentCode(event.target.value)} /></label><button className="primary-button" disabled={busy} type="submit"><Plus /> Add department</button></form>
        </section>
        <section className="panel table-panel"><div className="table-meta"><div><h2>Audit history</h2><p className="muted">Available only to organization admins under RLS</p></div></div>
          {data.audit.length ? <div className="table-wrap"><table><thead><tr><th>Action</th><th>Entity</th><th>Entity ID</th><th>Actor</th><th>Date</th></tr></thead><tbody>
            {data.audit.map((entry) => <tr key={entry.id}><td>{entry.action}</td><td>{entry.entity_type}</td><td>{entry.entity_id ?? '—'}</td><td>{entry.actor_user_id ? employeeName(data.profiles, entry.actor_user_id) : 'System'}</td><td>{formatTimestamp(entry.created_at)}</td></tr>)}
          </tbody></table></div> : <EmptyState>No audit entries are visible.</EmptyState>}
        </section>
      </div>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state">{children}</div>
}
