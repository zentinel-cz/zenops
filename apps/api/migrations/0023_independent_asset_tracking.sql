-- Reuse immutable name/setting variants instead of changing a shared type.
-- Existing type IDs, flags, asset assignments and operational history stay intact.
alter table machine_types drop constraint machine_types_name_key;
alter table machine_types add constraint machine_types_name_tracking_key unique(name,tracks_mth);
alter table attachment_types drop constraint attachment_types_name_key;
alter table attachment_types add constraint attachment_types_name_tracking_key unique(name,uniquely_tracked);

create function prevent_asset_type_redefinition() returns trigger language plpgsql as $$
begin
  if to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception using errcode='ZA001',
      message='Asset type variants are immutable; assign the asset to the requested name/setting variant';
  end if;
  return new;
end;
$$;
create trigger machine_type_immutable before update on machine_types
  for each row execute function prevent_asset_type_redefinition();
create trigger attachment_type_immutable before update on attachment_types
  for each row execute function prevent_asset_type_redefinition();
