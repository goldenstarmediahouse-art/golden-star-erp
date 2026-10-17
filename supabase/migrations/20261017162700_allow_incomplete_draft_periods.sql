BEGIN;

ALTER TABLE public.reports
  ALTER COLUMN report_period_start DROP NOT NULL,
  ALTER COLUMN report_period_end DROP NOT NULL;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_period_required_unless_draft
  CHECK (
    status = 'draft'
    OR (
      report_period_start IS NOT NULL
      AND report_period_end IS NOT NULL
    )
  );

COMMIT;
