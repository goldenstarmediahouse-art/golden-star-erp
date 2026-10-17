BEGIN;

ALTER TABLE public.reports
  ALTER COLUMN report_period_start DROP NOT NULL,
  ALTER COLUMN report_period_end DROP NOT NULL;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_period_required_unless_draft;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_period_required_unless_draft
  CHECK (
    (
      status = 'draft'
      AND template_id = 'b5beace6-8ed5-4a97-8e65-79ce336bfc9e'::uuid
    )
    OR (
      report_period_start IS NOT NULL
      AND report_period_end IS NOT NULL
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.enforce_ecocash_week_period()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.template_id = 'b5beace6-8ed5-4a97-8e65-79ce336bfc9e'::uuid
     AND NEW.status = 'submitted' THEN
    IF NEW.report_period_start IS NULL
       OR NEW.report_period_end IS NULL
       OR EXTRACT(ISODOW FROM NEW.report_period_start) <> 1
       OR NEW.report_period_end <> NEW.report_period_start + 6 THEN
      RAISE EXCEPTION
        'EcoCash reports can only be submitted for a week commencing Monday and ending on the following Sunday.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_ecocash_week_period ON public.reports;

CREATE TRIGGER enforce_ecocash_week_period
  BEFORE INSERT OR UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ecocash_week_period();

COMMIT;
