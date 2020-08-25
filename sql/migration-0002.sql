CREATE TABLE identification_errors (
    blip_id integer NOT NULL primary key,
    dtalong double precision NOT NULL,
    along double precision NOT NULL,
    across double precision NOT NULL,
    CONSTRAINT blip_id_fk FOREIGN KEY (blip_id) REFERENCES blips(blips_id)
);


create or replace function get_blips_percentiles(in telescope_id text, in time_from double precision, in till double precision)
  returns TABLE(mode text, min double precision, q005 double precision, q010 double precision, q050 double precision, q090 double precision, q095 double precision, max double precision) as
$BODY$
  begin
    return query
      with tmp as (
        select b.track_id, blips_id, time, ra, dec, b.x, b.y, brightness,
        dtalong, along, across, origin, points_count, norad_id, tel.id, n.dist
        from blips b
        inner join identification_errors i on b.blips_id = i.blip_id
        inner join tracks t on b.track_id = t.tracks_id
        inner join identifications n on n.track_id = b.track_id
        inner join telescope tel on tel.unique_id = t.observer
        where id = telescope_id and time between time_from and till
        )
        select 'dtalong' as mode,
          min(dtalong) as min,
          percentile_cont(0.05) within group(order by dtalong) as q005,
          percentile_cont(0.10) within group(order by dtalong) as q010,
          percentile_cont(0.50) within group(order by dtalong) as q050,
          percentile_cont(0.90) within group(order by dtalong) as q090,
          percentile_cont(0.95) within group(order by dtalong) as q095,
          max(dtalong) as max
        from tmp
        union all
        select 'dist' as mode,
          min(dist) as min,
          percentile_cont(0.05) within group(order by dist) as q005,
          percentile_cont(0.10) within group(order by dist) as q010,
          percentile_cont(0.50) within group(order by dist) as q050,
          percentile_cont(0.90) within group(order by dist) as q090,
          percentile_cont(0.95) within group(order by dist) as q095,
          max(dist) as max
        from tmp
        union all
        select 'brightness' as mode,
          min(brightness) as min,
          percentile_cont(0.05) within group(order by brightness) as q005,
          percentile_cont(0.10) within group(order by brightness) as q010,
          percentile_cont(0.50) within group(order by brightness) as q050,
          percentile_cont(0.90) within group(order by brightness) as q090,
          percentile_cont(0.95) within group(order by brightness) as q095,
          max(brightness) as max
        from tmp
        union all
        select 'along' as mode,
          min(along) as min,
          percentile_cont(0.05) within group(order by along) as q005,
          percentile_cont(0.10) within group(order by along) as q010,
          percentile_cont(0.50) within group(order by along) as q050,
          percentile_cont(0.90) within group(order by along) as q090,
          percentile_cont(0.95) within group(order by along) as q095,
          max(along) as max
        from tmp
        union all
        select 'across' as mode,
          min(across) as min,
          percentile_cont(0.05) within group(order by across) as q005,
          percentile_cont(0.10) within group(order by across) as q010,
          percentile_cont(0.50) within group(order by across) as q050,
          percentile_cont(0.90) within group(order by across) as q090,
          percentile_cont(0.95) within group(order by across) as q095,
          max(across) as max
        from tmp;
  end
$BODY$
LANGUAGE plpgsql STABLE STRICT;
