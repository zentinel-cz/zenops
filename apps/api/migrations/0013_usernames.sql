alter table users add column username text;

with raw_candidates as (
  select
    id,
    regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9._-]', '', 'g') as raw_username
  from users
), candidates as (
  select
    id,
    case
      when length(raw_username) >= 3 and raw_username ~ '^[a-z0-9]'
        then left(raw_username, 40)
      else 'user-' || substr(md5(id::text), 1, 8)
    end as base_username
  from raw_candidates
), ranked as (
  select
    id,
    base_username,
    row_number() over (partition by base_username order by id) as occurrence
  from candidates
)
update users u
set username = case
  when ranked.occurrence = 1 then ranked.base_username
  else left(ranked.base_username, 31) || '-' || substr(md5(u.id::text), 1, 8)
end
from ranked
where ranked.id = u.id;

alter table users alter column username set not null;
alter table users add constraint users_username_normalized
  check (username = lower(trim(username)));
alter table users add constraint users_username_format
  check (username ~ '^[a-z0-9][a-z0-9._-]{2,39}$');
create unique index users_username_unique on users (lower(username));
