package com.mak.util;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.decimal4j.util.DoubleRounder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;

import java.util.ArrayList;
import java.util.List;

public class TelescopeInfoHelper {
    private static final double rg = 180.0/Math.PI;

    @Autowired
    JdbcTemplate jdbcTemplate;

    public static JsonArray getBlipsForTrack(long track_id, JdbcTemplate jdbcTemplate ) throws Exception {
        final String sql = "SELECT \"time\", ra, \"dec\", sig_ra, sig_dec, x, y, brightness, file FROM blips WHERE track_id = ?";

        JsonArray blips_a = new JsonArray();

        SqlRowSet rs = jdbcTemplate.queryForRowSet(sql, track_id);

        while (rs.next()) {
            Double time = ParseUtils.fromDouble(rs.getDouble(1));
            Double ra = ParseUtils.fromDouble(rs.getDouble(2));
            Double dec = ParseUtils.fromDouble(rs.getDouble(3));
            Double sig_ra = ParseUtils.fromDouble(rs.getDouble(4));
            Double sig_dec = ParseUtils.fromDouble(rs.getDouble(5));
            Double x = ParseUtils.fromDouble(rs.getDouble(6));
            Double y = ParseUtils.fromDouble(rs.getDouble(7));
            Double brightness = ParseUtils.fromDouble(rs.getDouble(8));
            String file = ParseUtils.nvl(rs.getString(9));

            if ((time == null) || (ra == null) || (dec == null))
                continue;

            JsonObject blip_o = new JsonObject();
            blip_o.addProperty("time", time);
            blip_o.addProperty("ra", ra);
            blip_o.addProperty("dec", dec);
            blip_o.addProperty("sig_ra", sig_ra);
            blip_o.addProperty("sig_dec", sig_dec);
            blip_o.addProperty("x", x);
            blip_o.addProperty("y", y);
            blip_o.addProperty("brightness", brightness);
            blip_o.addProperty("file", file);
            blips_a.add(blip_o);
        }

        return blips_a;
    }

    public static String[] clean(String deleteValue, String[] arr) {
        List<String> result = new ArrayList<>();
        for (String value : arr) {
            if (!value.equals(deleteValue)) {
                result.add(value);
            }
        }
        return result.toArray(new String[0]);
    }

    // parsed blip and track classes needed to get errors info from files
    public static class ParsedBlip {
        private final String dT;
        private final double dTalong;
        private final double Along;
        private final double Across;
        private int blipId;

        public double getdTalong() {
            return dTalong;
        }

        public double getAlong() {
            return Along;
        }

        public double getAcross() {
            return Across;
        }

        public String getdT() {
            return dT;
        }

        public void setBlipId(int blipId) {
            this.blipId = blipId;
        }

        public int getBlipId() {
            return blipId;
        }

        public ParsedBlip(String dT, double dTalong, double along, double across) {
            this.dT = dT;
            this.dTalong = dTalong;
            this.Along = along;
            this.Across = across;
        }
    }

    public static class ParsedTrack implements Comparable<ParsedTrack> {
        public double getDate() {
            return date;
        }
        public String getFilename() {
            return filename;
        }
        public List<ParsedBlip> getParsedBlipList() {
            return parsedBlipList;
        }

        int id;
        int nkoBest;
        int ngood;
        int dist;
        double date;
        String filename;
        List<ParsedBlip> parsedBlipList;

        public ParsedTrack(int id, int nkoBest, int ngood, int dist, double date, String filename, List<ParsedBlip> parsedBlipList) {
            this.id = id;
            this.nkoBest = nkoBest;
            this.ngood = ngood;
            this.dist = dist;
            this.date = date;
            this.filename = filename;
            this.parsedBlipList = parsedBlipList;
        }

        @Override
        public int compareTo(ParsedTrack o) {
            return Double.compare(this.date, o.date);
        }
    }

    // blip and track classes needed to get info from base
    public static class Blip {
        private final int id;
        private final double time;
        private final double ra;
        private final double dec;
        private final double x;
        private final double y;
        private final double mag;
        private final double dtalong;
        private final double along;
        private final double across;
        private final double alt;
        private final double az;
        private final double dist;

        public Blip(int id, double time, double ra, double dec, double x, double y, double mag, double dtalong, double along, double across, double dist, double lat, double lon) {
            this.id = id;
            this.time = time;
            this.ra = ra;
            this.dec = dec;
            this.x = x;
            this.y = y;
            this.mag = mag;
            this.dtalong = dtalong;
            this.along = along;
            this.across = across;
            double[] AltAz = convertToAltAz(ra, dec, time, lat, lon);
            this.alt = DoubleRounder.round(AltAz[0], 3);
            this.az = DoubleRounder.round(AltAz[1],3);
            this.dist = dist;
        }

        public JsonElement toJson() {
            JsonObject point = new JsonObject();
            point.addProperty("dt", time);
            point.addProperty("alt", alt);
            point.addProperty("az", az);
            point.addProperty("mag", mag);
            point.addProperty("dtalong", dtalong);
            point.addProperty("along", along);
            point.addProperty("across", across);

            return point;
        }
    }

    public static class Track {
        private final int id;
        private final String filename;
        private final int ngood;
        private final int norad;
        private final double dist;
        private final String telescope_id;
        private final List<Blip> blipList;

        public List<Blip> getBlipList() {
            return blipList;
        }

        public Track(int id, String filename, int ngood, int norad, String telescope_id, double dist, List<Blip> blipList) {
            this.id = id;
            this.filename = filename;
            this.ngood = ngood;
            this.norad = norad;
            this.telescope_id = telescope_id;
            this.dist = dist;
            this.blipList = blipList;
        }

        public JsonElement toJson() {
            JsonArray blips = new JsonArray();
            for (Blip blip : blipList) {
                blips.add(blip.toJson());
            }

            JsonObject track = new JsonObject();
            track.addProperty("id", id);
            track.addProperty("filename", filename);
            track.addProperty("ngood", ngood);
            track.addProperty("norad", norad);
            track.addProperty("telescope_id", telescope_id);
            track.addProperty("dist", dist);
            track.add("blips", blips);

            return track;
        }
    }

    // if type 1 - returns Alt, 2 - Az
    public static double[] convertToAltAz(double ra, double dec, double jd, double lat, double lon) {
        lat /= rg;
        lon /= rg;

        double theta = ThetaG_JD(jd);
        double ha = - ra + theta + lon;
        double x = Math.cos(ha) * Math.cos(dec);
        double y = Math.sin(ha) * Math.cos(dec);
        double z = Math.sin(dec);

        double xhor = x*Math.cos(Math.PI/2 - lat) - z*Math.sin(Math.PI/2 - lat);
        double zhor = x*Math.sin(Math.PI/2 - lat) + z*Math.cos(Math.PI/2 - lat);

        double az = Math.atan2(y, xhor) + Math.PI;
        double alt = Math.asin(zhor);

        return new double[] { alt * rg, az * rg };
    }

    static double ThetaG_JD(double jdfrom1957) {
        double UT = frac(jdfrom1957 + 0.5);
        jdfrom1957 -= UT;
        double TU = (jdfrom1957 - 2451545.0)/36525;
        double GMST = 24110.54841 + TU * (8640184.812866 + TU * (0.093104 - TU * 6.2E-6));
        GMST = Modulus(GMST + 86400.0*1.00273790934*UT, 86400.0);

        return 2 * Math.PI * GMST/86400.0;
    }

    static double frac(double x) { return x - Math.floor(x); }

    static double Modulus(double arg1, double arg2) {
        double modu = arg1 - Math.floor(arg1/arg2) * arg2;
        return (modu >= 0) ? modu : modu + arg2;
    }
}
