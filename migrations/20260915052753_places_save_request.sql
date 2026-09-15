-- Apply before deploying the backend. Existing rows retain NULL request IDs.
BEGIN;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS request_id varchar(36);
CREATE UNIQUE INDEX IF NOT EXISTS uq_places_user_request
    ON public.places (user_id, request_id);
COMMIT;
