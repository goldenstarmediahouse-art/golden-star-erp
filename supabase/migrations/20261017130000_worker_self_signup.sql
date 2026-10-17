BEGIN;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;

CREATE OR REPLACE FUNCTION public.list_worker_signup_departments()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_org_id uuid;
  v_org_count integer;
BEGIN
  SELECT count(*), (array_agg(o.id))[1]
  INTO v_org_count, v_org_id
  FROM public.organizations AS o
  WHERE lower(btrim(o.tenant_name)) = lower('Golden Star Media House');

  IF v_org_count <> 1 THEN
    RAISE EXCEPTION 'Golden Star Media House organization is missing or ambiguous';
  END IF;

  RETURN QUERY
  SELECT d.id, d.name::text
  FROM public.departments AS d
  WHERE d.organization_id = v_org_id
    AND d.is_active = true
  ORDER BY d.name;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_worker_signup_departments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_worker_signup_departments() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.provision_worker_signup(
  _department_id uuid,
  _first_name text,
  _last_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_org_id uuid;
  v_org_count integer;
  v_department_id uuid;
  v_role_id uuid;
  v_existing_org_id uuid;
  v_existing_department_id uuid;
  v_existing_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(btrim(_first_name), '') IS NULL
     OR length(btrim(_first_name)) > 80
     OR NULLIF(btrim(_last_name), '') IS NULL
     OR length(btrim(_last_name)) > 80 THEN
    RAISE EXCEPTION 'Enter a valid first and last name';
  END IF;

  SELECT u.email
  INTO v_email
  FROM auth.users AS u
  WHERE u.id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'An authenticated Supabase Auth account is required';
  END IF;

  SELECT count(*), (array_agg(o.id))[1]
  INTO v_org_count, v_org_id
  FROM public.organizations AS o
  WHERE lower(btrim(o.tenant_name)) = lower('Golden Star Media House');

  IF v_org_count <> 1 THEN
    RAISE EXCEPTION 'Golden Star Media House organization is missing or ambiguous';
  END IF;

  SELECT d.id
  INTO v_department_id
  FROM public.departments AS d
  WHERE d.id = _department_id
    AND d.organization_id = v_org_id
    AND d.is_active = true;

  IF v_department_id IS NULL THEN
    RAISE EXCEPTION 'Choose an active department in Golden Star Media House';
  END IF;

  SELECT r.id
  INTO v_role_id
  FROM public.roles AS r
  WHERE r.name = 'worker';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'The worker role is not configured';
  END IF;

  SELECT p.organization_id, p.department_id, p.status
  INTO v_existing_org_id, v_existing_department_id, v_existing_status
  FROM public.profiles AS p
  WHERE p.id = v_user_id;

  IF FOUND THEN
    IF v_existing_org_id = v_org_id
       AND v_existing_department_id = v_department_id
       AND v_existing_status = 'active'
       AND EXISTS (
         SELECT 1
         FROM public.user_roles AS ur
         WHERE ur.user_id = v_user_id
           AND ur.organization_id = v_org_id
           AND ur.role_id = v_role_id
       ) THEN
      RETURN;
    END IF;

    RAISE EXCEPTION 'An employee profile already exists; contact an administrator to change it';
  END IF;

  INSERT INTO public.profiles (
    id,
    organization_id,
    email,
    first_name,
    last_name,
    department_id,
    status
  )
  VALUES (
    v_user_id,
    v_org_id,
    v_email,
    btrim(_first_name),
    btrim(_last_name),
    v_department_id,
    'active'
  );

  INSERT INTO public.user_roles (
    user_id,
    organization_id,
    role_id
  )
  VALUES (
    v_user_id,
    v_org_id,
    v_role_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.provision_worker_signup(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_worker_signup(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS reports_read_permitted ON public.reports;
CREATE POLICY reports_read_permitted
ON public.reports
FOR SELECT
TO authenticated
USING (
  organization_id = public.current_org_id()
  AND (
    submitted_by = (SELECT auth.uid())
    OR public.has_org_role('admin')
    OR public.has_org_role('boss')
    OR (
      public.has_org_role('worker')
      AND department_id = public.current_department_id()
    )
  )
);

DROP POLICY IF EXISTS report_answers_read_permitted ON public.report_answers;
CREATE POLICY report_answers_read_permitted
ON public.report_answers
FOR SELECT
TO authenticated
USING (
  organization_id = public.current_org_id()
  AND EXISTS (
    SELECT 1
    FROM public.reports AS r
    WHERE r.id = report_answers.report_id
      AND r.organization_id = report_answers.organization_id
      AND (
        r.submitted_by = (SELECT auth.uid())
        OR public.has_org_role('admin')
        OR public.has_org_role('boss')
        OR (
          public.has_org_role('worker')
          AND r.department_id = public.current_department_id()
        )
      )
  )
);

DROP POLICY IF EXISTS report_reviews_read_permitted ON public.report_reviews;
CREATE POLICY report_reviews_read_permitted
ON public.report_reviews
FOR SELECT
TO authenticated
USING (
  organization_id = public.current_org_id()
  AND EXISTS (
    SELECT 1
    FROM public.reports AS r
    WHERE r.id = report_reviews.report_id
      AND r.organization_id = report_reviews.organization_id
      AND (
        r.submitted_by = (SELECT auth.uid())
        OR public.has_org_role('admin')
        OR public.has_org_role('boss')
        OR (
          public.has_org_role('worker')
          AND r.department_id = public.current_department_id()
        )
      )
  )
);

COMMIT;
