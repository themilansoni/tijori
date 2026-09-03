-- Prevent duplicate category names (case-insensitive) per user + type.
create unique index if not exists categories_user_type_name_uidx
  on public.categories (user_id, type, lower(name));
