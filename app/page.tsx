import ErpWorkspace, { type WorkspaceRole } from '@/components/erp-workspace'
import { getSupabaseConfigError } from '@/lib/supabase/env'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type AccountProfile = {
  id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  job_title: string | null
  department_id: string | null
  status: string
}

function AccessMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="auth-shell">
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">Golden Star Media House ERP</p>
          <h2>{title}</h2>
          <p className="auth-feedback error" role="alert">{message}</p>
        </div>
      </section>
    </main>
  )
}

export default async function Page() {
  const configurationError = getSupabaseConfigError()
  if (configurationError) {
    return <AccessMessage title="Connect Supabase" message={configurationError} />
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError && authError.name !== 'AuthSessionMissingError') {
    throw new Error(`Could not verify your Supabase session: ${authError.message}`)
  }
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, email, first_name, last_name, phone, job_title, department_id, status')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return <AccessMessage title="Profile verification failed" message={`Could not load your authorized employee profile: ${profileError.message}`} />
  }
  if (!profile) {
    return <AccessMessage title="ERP access is not provisioned" message="Your signed-in account does not have an employee profile in this organization. Ask an administrator to provision your profile." />
  }
  if (profile.status !== 'active') {
    const { error: signOutError } = await supabase.auth.signOut()
    return <AccessMessage
      title="ERP access is inactive"
      message={signOutError
        ? 'Your employee profile is not active. ERP access is denied, but this session could not be cleared automatically. Sign out of the browser session and contact your organization administrator.'
        : 'Your employee profile is not active. Your session has been signed out. Contact your organization administrator.'}
    />
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', user.id)

  if (membershipError) {
    return <AccessMessage title="Role verification failed" message={`Could not verify your organization role: ${membershipError.message}`} />
  }

  const roleIds = [...new Set((memberships ?? []).map((membership) => membership.role_id))]
  if (roleIds.length === 0) {
    return <AccessMessage title="ERP access is not assigned" message="Your active employee profile has no assigned ERP role. Ask an administrator to assign a role." />
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from('roles')
    .select('id, name')
    .in('id', roleIds)

  if (rolesError) {
    return <AccessMessage title="Role verification failed" message={`Could not resolve your assigned organization role: ${rolesError.message}`} />
  }

  const rolePriority: Record<WorkspaceRole, number> = { worker: 1, boss: 2, admin: 3 }
  const role = (roleRows ?? [])
    .map((row) => row.name as string)
    .filter((name): name is WorkspaceRole => name === 'worker' || name === 'boss' || name === 'admin')
    .sort((left, right) => rolePriority[right] - rolePriority[left])[0]

  if (!role) {
    return <AccessMessage title="ERP access is not assigned" message="Your account does not have one of the supported organization roles. Ask an administrator to verify your role assignment." />
  }

  const account: AccountProfile = profile
  return (
    <ErpWorkspace
      account={{
        id: account.id,
        organizationId: account.organization_id,
        email: user.email ?? account.email,
        firstName: account.first_name,
        lastName: account.last_name,
        jobTitle: account.job_title,
        departmentId: account.department_id,
        role,
      }}
    />
  )
}
