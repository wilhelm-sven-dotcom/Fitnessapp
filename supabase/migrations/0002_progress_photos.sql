-- Private bucket for progress photos. Each user's files live under a folder
-- named with their user id ("<uid>/<photoId>"), enforced by RLS.

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- One policy for every operation: the first path segment must be the caller's uid.
create policy "progress_photos_own"
  on storage.objects for all
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
