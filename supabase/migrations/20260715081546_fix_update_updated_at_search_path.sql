/*
# Fix mutable search_path on update_updated_at function

## Problem
The `public.update_updated_at()` trigger function had a mutable search_path,
meaning it resolved unqualified function names (like `now()`) using whatever
schema appeared first in the caller's search_path at runtime. An attacker who
can create objects in a schema that appears earlier in the search_path could
shadow built-in functions and hijack execution when the trigger fires.

## Fix
Recreate the function with an explicit, immutable `search_path` set to
`public, pg_temp`. This is the Supabase/Postgres recommended pattern for
securing functions:
- `public` so the function can resolve any unqualified names in the app schema
- `pg_temp` last so temp objects can't shadow production schema objects

## Changes
- Recreated `public.update_updated_at()` with `SET search_path = public, pg_temp`
- Function body and behavior unchanged — only the search_path is locked down

## Security
- Eliminates the "Function Search Path Mutable" security advisory
- No RLS or policy changes needed
- No data changes — this is a metadata-only fix
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
