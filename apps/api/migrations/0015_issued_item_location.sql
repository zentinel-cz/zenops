alter table employee_item_issues
  add column issued_at_location text,
  add constraint employee_item_issues_location_length
    check (issued_at_location is null or length(trim(issued_at_location)) between 2 and 160);

comment on column employee_item_issues.issued_at_location is
  'Place where the item was handed to the employee; null for historical issues recorded before location tracking.';
