create or replace function observernightstelescopes(in year integer)
  returns SETOF RECORD AS $$
  declare
  rec record;
  r record;
  y integer;
begin
	y = year;
for r in
(select id from telescope)
  loop
    select code, v_year, count(*) as c, sum(count)
	from (select * from observernightsfortelescope(r.id, y)) as foo
	inner join telescope on telescope.id=r.id
	group by v_year, telescope.code
	into rec;
	if rec.c is not null then
		return next rec;
	end if;
  end loop;
end $$
LANGUAGE plpgsql VOLATILE;

-- example, how to get info
-- select * from observernightstelescopes(2019) as x(code integer, v_year bigint, count bigint, sum numeric)
