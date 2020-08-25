package com.mak.app;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mak.util.*;
import org.decimal4j.util.DoubleRounder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.rowset.SqlRowSet;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.transaction.Transactional;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.sql.Date;
import java.sql.Timestamp;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;

import static com.mak.util.TelescopeInfoHelper.ParsedTrack;

@Controller
public class AnalyticsController {
    private static final Logger LOGGER = Logger.getLogger(AnalyticsController.class.getName());
    private static final String[] sPaths = { "/", "/ui" };

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Value("${sky.bot.path}")
    private String skyBotPath;

    @Value("${api.path}")
    private String apiPath;

    @Value("${round.param}")
    private int roundParam;

    @RequestMapping(value = "/auth/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void api(HttpServletRequest p_request, HttpServletResponse p_response) throws Exception {
        String password = p_request.getParameter("pwd");
        String userName = p_request.getParameter("user");
        if (password == null || userName == null) {
            String originalUrl = p_request.getParameter("originalUrl");
            if (originalUrl == null) originalUrl = Base64.getUrlEncoder().encodeToString("/ui/overview".getBytes());

            p_response.sendRedirect("/ui/login?originalUrl=".concat(originalUrl));
        } else {
            // this means that we come here from login form and we are ready for authentication

            // Resolve original query initiator IP
            String ip = HttpHelper.ip(p_request);

            // But API auth servlet by default will link successfully created token to _source_ IP, i.e. to IP-address of this stringboot service
            // (that can be local and even the same as API) rather than IP-address of angular service (that has remote Internet address)
            // so we have to force token-to-ip link on the API side
            Map<String,String> params = new HashMap<>();
            params.put("action", "authenticate");
            params.put("login", userName);
            params.put("password", password);
            if (ip.length() > 0) params.put("for-ip", ip);

            // Perform authentication procedure
            String json = QueryJsonHelper.postJson(apiPath.concat("/authorize"), params);
            if (json == null) {
                p_response.getWriter().write("{\"message\":\"Authentication service is not available\"}");
            } else {
                JsonElement o = JsonHelper.parser.parse(json);
                p_response.getWriter().write(json);

                String token = JsonHelper.asString(o.getAsJsonObject().get("token"), null);
                if (token != null) {
                    addNewCookie(p_response, "login", userName);
                    addNewCookie(p_response, "token", token);
                } else {
                    LOGGER.log(Level.INFO, "Authentication failed for login: ".concat(userName));
                }
            }
        }
    }

    private static void addNewCookie(HttpServletResponse p_response, String p_key, String p_value) {
        for (String p: sPaths) {
            Cookie c = new Cookie(p_key, p_value);
            c.setPath(p);

            p_response.addCookie(c);
        }
    }

    public boolean isTokenValid(String p_token, String p_login, String p_ip) {
        try {
            String validate = apiPath.concat("/authorize?action=validate&token=").concat(p_token).concat("&login=").concat(p_login);
            if (p_ip.length() > 0) validate = validate.concat("&for-ip=").concat(p_ip);
            String json = QueryJsonHelper.getJson(validate);

            LOGGER.finest("Token validation JSON: " + json + " , for: " + p_token + " from ip: " + p_ip);
            if (json == null) return false;

            JsonElement e = JsonHelper.parser.parse(json);
            JsonObject o = e.isJsonObject() ? e.getAsJsonObject() : null;
            if (o == null) return false;

            String key = JsonHelper.asString(o.get("key"), null);
            return (key != null && key.length() >= 21);
        } catch(Exception x) {
            LOGGER.log(Level.INFO, "API access error", x);
            return false;
        }
    }

    private void forceAuth(HttpServletRequest p_request, HttpServletResponse p_response) throws IOException {
        String src = p_request.getHeader("Referer");
        if (src == null) src = "/ui/overview";

        p_response.sendRedirect("/auth?originalUrl=".concat(Base64.getEncoder().encodeToString(src.getBytes())));
    }

    private static Number doubleOrNull(SqlRowSet p_rs, int p_column) { return doubleOrNull(p_rs, p_column, -1); }
    private static Number doubleOrNull(SqlRowSet p_rs, int p_column, int p_round) {
        double x = p_rs.getDouble(p_column);
        if (p_rs.wasNull()) return null;
        if (p_round < 0) return x;

        return DoubleRounder.round(x, p_round);
    }

    @RequestMapping(value = "/startyear/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void startYear(@CookieValue(value = "token", defaultValue = "") String token,
                          @CookieValue(value = "login", defaultValue = "") String login,
                          HttpServletRequest p_request,
                          HttpServletResponse p_response) throws IOException {
        if (isTokenValid(token, login, HttpHelper.ip(p_request))) {
            String sql = "select jd2timestamp(min(time)) from blips";
            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql);
            int year = rs.next() ? rs.getDate(1).toLocalDate().getYear() : 2000;
            p_response.getWriter().write(String.valueOf(year));
        } else {
            forceAuth(p_request, p_response);
        }
    }


    @RequestMapping(value = "/calendar/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void overview(@CookieValue(value = "token", defaultValue = "") String token,
                         @CookieValue(value = "login", defaultValue = "") String login,
                         HttpServletRequest p_request,
                         HttpServletResponse p_response) throws IOException {
        if (isTokenValid(token, login, HttpHelper.ip(p_request))) {
            String specCodes = p_request.getParameter("codes");
            String[] specCodesArray = specCodes.split(",");

            // Observant nights by telescopes
            String sql = "select count(1), t.code, jd2timestamp(floor(end_time + t.lng/360))::date from tracks " +
                    "inner join telescope t on observer = t.unique_id " +
                    "where t.code in (".concat(specCodes).concat(") " +
                    "group by 2, 3 order by 3");

            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql);
            JsonElement trackJsonElement = JsonHelper.getJsonElementForCalendar(rs, specCodesArray);
            p_response.getWriter().write(JsonHelper.writer.toJson(trackJsonElement));
        } else {
            forceAuth(p_request, p_response);
        }
    }

    @RequestMapping(value = "/overviewone/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void overviewSingle(@CookieValue(value = "token", defaultValue = "") String token,
                               @CookieValue(value = "login", defaultValue = "") String login,
                               HttpServletRequest p_request,
                               HttpServletResponse p_response) throws IOException {
        if (isTokenValid(token, login, HttpHelper.ip(p_request))) {
            String[] specCode = new String[]{p_request.getParameter("code")};

            // Observant nights by telescopes
            String sql = "select count(1), t.code, jd2timestamp(floor(end_time + t.lng/360))::date from tracks " +
                    "inner join telescope t on observer = t.unique_id " +
                    "where t.code = ".concat(specCode[0]) +
                    "group by 2, 3 order by 3";

            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql);
            JsonElement trackJsonElement = JsonHelper.getJsonElementForCalendar(rs, specCode);
            p_response.getWriter().write(JsonHelper.writer.toJson(trackJsonElement));
        } else {
            forceAuth(p_request, p_response);
        }
    }

    @RequestMapping(value = "/heatinfo/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void heatmap(@CookieValue(value = "token", defaultValue = "") String token,
                        @CookieValue(value = "login", defaultValue = "") String login,
                        HttpServletRequest p_request,
                        HttpServletResponse p_response) throws IOException {
        if (isTokenValid(token, login, HttpHelper.ip(p_request))) {
            // Here we get year and set time interval for our sql-request
            int year = HttpHelper.getInt(p_request, "year", k->Calendar.getInstance().get(Calendar.YEAR));
            Calendar calendarFrom = Calendar.getInstance();
            Calendar calendarTill = Calendar.getInstance();
            calendarFrom.set(year, Calendar.JANUARY, 1, 0, 0, 0);
            calendarTill.set(year + 1, Calendar.JANUARY, 1, 0, 0, 0);
            double p_from = DateHelper.unixToJD(calendarFrom.getTimeInMillis());
            double p_till = DateHelper.unixToJD(calendarTill.getTimeInMillis());

            // here we get codes for sql-request
            String specCodes = p_request.getParameter("codes");
            if (specCodes == null) specCodes = "0";
            String[] specCodesArray = specCodes.split(",");

            // preparing info for angular-heatmap-report
            String sql = "select (high + low), code, extract(DOY from jd2timestamp(dt))::integer from satsbyapogee(?,?,3500)" +
                         " inner join telescope on unique_id = observer" +
                         " where code in (".concat(specCodes).concat(")");

            // get trackJsonElement for report
            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql, p_from, p_till);
            JsonElement trackJsonElement = JsonHelper.getJsonElementForHeatmap(rs,specCodesArray);
            p_response.getWriter().write(JsonHelper.writer.toJson(trackJsonElement));
        } else {
            forceAuth(p_request, p_response);
        }
    }

    @RequestMapping(value = "/donutsinfo/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void donuts(@CookieValue(value = "token", defaultValue = "") String token,
                       @CookieValue(value = "login", defaultValue = "") String login,
                       HttpServletRequest p_request,
                       HttpServletResponse p_response) throws IOException {
        if (isTokenValid(token, login, HttpHelper.ip(p_request))) {
            String specCodes = p_request.getParameter("codes");
            String[] specCodesArray = specCodes.split(",");
            int year = HttpHelper.getInt(p_request, "year", k->Calendar.getInstance().get(Calendar.YEAR));

            // get data from DB
            SqlRowSet rs = jdbcTemplate.queryForRowSet("select * from observernightstelescopes(?) as x(code integer, v_year bigint, count bigint, sum numeric)",
                    year);

            // forming Json
            JsonElement trackJsonElement = JsonHelper.getJsonElementForDonuts(rs, specCodesArray, Integer.toString(year));
            p_response.getWriter().write(JsonHelper.writer.toJson(trackJsonElement));
        } else {
            forceAuth(p_request, p_response);
        }
    }

    @RequestMapping(value = "/getTracks/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void getTracksForTelescopeNight(@CookieValue(value = "token", defaultValue = "") String token,
                                           @CookieValue(value = "login", defaultValue = "") String login,
                                           HttpServletRequest p_request,
                                           HttpServletResponse p_response) throws IOException {
        if (!isTokenValid(token, login, HttpHelper.ip(p_request))) {
            forceAuth(p_request, p_response);
            return;
        }

        Calendar calendar = Calendar.getInstance();
        String telescope_id = HttpHelper.getString(p_request, "id", "");
        int s_year = HttpHelper.getInt(p_request, "year", k->calendar.get(Calendar.YEAR));
        int s_month = HttpHelper.getInt(p_request, "month", k->calendar.get(Calendar.MONTH) + 1);
        int s_day = HttpHelper.getInt(p_request, "day", k->calendar.get(Calendar.DATE));
        boolean load_blips = (0 != HttpHelper.getInt(p_request, "blips", 0));

        if (telescope_id.isEmpty()) {
            p_response.getWriter().write(JsonHelper.writer.toJson(new JsonArray()));
        } else {
            final String sql = "SELECT origin, start_jd, end_jd, start_time, end_time, points_count, norad_id, track_id FROM tracksfortelescopenight(?, ?, ?, ?)";

            JsonArray tracks_a = new JsonArray();

            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql, telescope_id, s_year, s_month, s_day);

            while (rs.next()) {
                String origin = ParseUtils.nvl(rs.getString(1));
                Double start_jd = ParseUtils.fromDouble(rs.getDouble(2));
                Double end_jd = ParseUtils.fromDouble(rs.getDouble(3));
                Timestamp start_time = ParseUtils.fromSqlDate(rs.getTime(4));
                Timestamp end_time = ParseUtils.fromSqlDate(rs.getTime(5));
                Integer points_count = ParseUtils.fromInteger(rs.getInt(6));
                Long norad_id = ParseUtils.fromLong(rs.getLong(7));
                Long track_id = ParseUtils.fromLong(rs.getLong(8));

                if (origin.isEmpty() || (start_jd == null) || (end_jd == null) || (start_time == null) || (end_time == null) || (points_count == null) || (track_id == null))
                    continue;

                JsonObject track_o = new JsonObject();
                track_o.addProperty("origin", origin);
                track_o.addProperty("start_jd", start_jd);
                track_o.addProperty("end_jd", end_jd);
                track_o.addProperty("start_time", ParseUtils.formatDateMsk(start_time, "yyyy-MM-dd HH:mm:ss"));
                track_o.addProperty("end_time", ParseUtils.formatDateMsk(end_time, "yyyy-MM-dd HH:mm:ss"));
                track_o.addProperty("points_count", points_count);
                track_o.addProperty("norad_id", norad_id);
                track_o.addProperty("track_id", track_id);
                if (load_blips) {
                    try {
                        track_o.add("blips", TelescopeInfoHelper.getBlipsForTrack(track_id, jdbcTemplate));
                    } catch (Exception e) {
                        LOGGER.warning(e.getMessage());
                    }
                }
                tracks_a.add(track_o);
            }
            p_response.getWriter().write(JsonHelper.writer.toJson(tracks_a));
        }
    }

    @RequestMapping(value = "/getTOR/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void getTransparency(@CookieValue(value = "token", defaultValue = "") String token,
                                @CookieValue(value = "login", defaultValue = "") String login,
                                HttpServletRequest p_request,
                                HttpServletResponse p_response) throws IOException {
        if (!isTokenValid(token, login, HttpHelper.ip(p_request))) {
            forceAuth(p_request, p_response);
            return;
        }

        Calendar calendar = Calendar.getInstance();
        String type = HttpHelper.getString(p_request, "q", "");
        String telescope_id = HttpHelper.getString(p_request, "id", "");
        int s_year = HttpHelper.getInt(p_request, "year", k->calendar.get(Calendar.YEAR));
        int s_month = HttpHelper.getInt(p_request, "month", k->calendar.get(Calendar.MONTH) + 1) - 1;
        int s_day = HttpHelper.getInt(p_request, "day", k->calendar.get(Calendar.DATE));
        double s_lng = HttpHelper.getDouble(p_request, "lng", 0);

        calendar.set(s_year, s_month, s_day, 12, 0, 0);
        long from = calendar.getTimeInMillis() - (long)((s_lng/360) * 86400000);
        long till = from + 86400000;

        String sql;
        SqlRowSet rs;
        JsonElement result = JsonHelper.NULL;
        JsonArray jsonArray = new JsonArray();

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

        switch (type) {
            case "add":
                sql = "select tr.code, id, tmkey, q05, q005, q095, noise, mag from transparency tr inner join telescope tel on tr.code = tel.code where id = ? and tmkey between ? and ? and q05 != 0 order by tmkey";
                rs = jdbcTemplate.queryForRowSet(sql, telescope_id, from, till);
                while (rs.next()) {
                    JsonObject jsonObject = new JsonObject();
                    jsonObject.addProperty("date", dateFormat.format(new Date(rs.getLong(3))));
                    jsonObject.addProperty("atm_m", DoubleRounder.round(rs.getDouble(4),roundParam));
                    jsonObject.addProperty("atm_05", DoubleRounder.round(rs.getDouble(5),roundParam));
                    jsonObject.addProperty("atm_95", DoubleRounder.round(rs.getDouble(6),roundParam));
                    jsonObject.addProperty("atm_n", DoubleRounder.round(rs.getDouble(7),roundParam));
                    jsonObject.addProperty("atm_br", DoubleRounder.round(rs.getDouble(8),roundParam));
                    jsonArray.add(jsonObject);
                }

                result = jsonArray;
            break;

            case "obs-real":
                JsonObject json = new JsonObject();
                json.addProperty("roundParam", roundParam);

                json.add("data", jsonArray);

                sql = "select noradid, movejd, stopjd, planra, plandec, factra, factdec from affixment af inner join telescope tel on af.code = tel.code where id = ? and tmkey between ? and ? order by tmkey";
                rs = jdbcTemplate.queryForRowSet(sql, telescope_id, from, till);

                while (rs.next()) {
                    JsonObject jsonObject = new JsonObject();
                    jsonObject.addProperty("noradid",  rs.getInt(1));
                    jsonObject.addProperty("movejd",   doubleOrNull(rs, 2));
                    jsonObject.addProperty("stopjd",   doubleOrNull(rs, 3));
                    jsonObject.addProperty("plan_ra",  doubleOrNull(rs, 4));
                    jsonObject.addProperty("plan_dec", doubleOrNull(rs, 5));
                    jsonObject.addProperty("fact_ra",  doubleOrNull(rs, 6));
                    jsonObject.addProperty("fact_dec", doubleOrNull(rs, 7));
                    jsonArray.add(jsonObject);
                }

                result = json;
            break;
        } // switch

        p_response.getWriter().write(JsonHelper.writer.toJson(result));
    }

    @RequestMapping(value = "/getIdentification/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"application/json;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void getIdentification(@CookieValue(value = "token", defaultValue = "") String token,
                                @CookieValue(value = "login", defaultValue = "") String login,
                                HttpServletRequest p_request,
                                HttpServletResponse p_response) throws IOException {
        if (!isTokenValid(token, login, HttpHelper.ip(p_request))) {
            forceAuth(p_request, p_response);
            return;
        }

        Calendar calendar = Calendar.getInstance();
        String type = HttpHelper.getString(p_request, "q", "");
        String telescope_id = HttpHelper.getString(p_request, "id", "");
        int s_year = HttpHelper.getInt(p_request, "year", k->calendar.get(Calendar.YEAR));
        int s_month = HttpHelper.getInt(p_request, "month", k->calendar.get(Calendar.MONTH) + 1) - 1;
        int s_day = HttpHelper.getInt(p_request, "day", k->calendar.get(Calendar.DATE));
        double s_lng = HttpHelper.getDouble(p_request, "lng", 0);
        double s_lat = HttpHelper.getDouble(p_request, "lat", 0);

        calendar.set(s_year, s_month, s_day, 12, 0, 0);
        long from = calendar.getTimeInMillis() - (long)((s_lng/360) * 86400000);
        long till = from + 86400000;

        JsonArray jsonArray = new JsonArray();

        if (type.equals("ident")) {
            String sql = "select " +
                    "b.track_id, blips_id, time, ra, dec, b.x, b.y, brightness, " +
                    "dtalong, along, across, origin, points_count, norad_id, tel.id, n.dist " +
                    "from blips b " +
                    "inner join identification_errors i on b.blips_id = i.blip_id " +
                    "inner join tracks t on b.track_id = t.tracks_id " +
                    "inner join identifications n on n.track_id = b.track_id " +
                    "inner join telescope tel on tel.unique_id = t.observer " +
                    "where id = ? and time between ? and ? order by b.track_id, time";

            SqlRowSet rs = jdbcTemplate.queryForRowSet(sql, telescope_id, DateHelper.unixToJD(from), DateHelper.unixToJD(till));
            int newTrackId = 0;
            TelescopeInfoHelper.Track currentTrack = null;
            List <TelescopeInfoHelper.Track> tracks = new ArrayList<>();
            while (rs.next()) {
                TelescopeInfoHelper.Blip currentBlip = new TelescopeInfoHelper.Blip(rs.getInt(2),
                        rs.getDouble(3),
                        DoubleRounder.round(rs.getDouble(4), roundParam),
                        DoubleRounder.round(rs.getDouble(5), roundParam),
                        rs.getDouble(6),
                        rs.getDouble(7),
                        DoubleRounder.round(rs.getDouble(8), roundParam),
                        rs.getDouble(9),
                        rs.getDouble(10),
                        rs.getDouble(11),
                        rs.getDouble(16),
                        s_lat,
                        s_lng);
                if (rs.getInt(1) == newTrackId) {
                    currentTrack.getBlipList().add(currentBlip);
                } else {
                    if (newTrackId != 0) tracks.add(currentTrack);
                    newTrackId = rs.getInt(1);
                    List<TelescopeInfoHelper.Blip> blips = new ArrayList<>();
                    blips.add(currentBlip);
                    currentTrack = new TelescopeInfoHelper.Track(newTrackId, rs.getString(12),rs.getInt(13),rs.getInt(14), rs.getString(15), rs.getDouble(16), blips);
                }
            }

            for (TelescopeInfoHelper.Track track : tracks) {
                jsonArray.add(track.toJson());
            }
        } else if (type.equals("protocolShort")) {
            SqlRowSet rs = jdbcTemplate.queryForRowSet("select * from get_blips_percentiles(?, ?, ?)", telescope_id, DateHelper.unixToJD(from), DateHelper.unixToJD(till));
            while (rs.next()) {
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("mode", rs.getString(1));
                jsonObject.addProperty("min", DoubleRounder.round(rs.getDouble(2), roundParam));
                jsonObject.addProperty("q005", DoubleRounder.round(rs.getDouble(3), roundParam));
                jsonObject.addProperty("q010", DoubleRounder.round(rs.getDouble(4), roundParam));
                jsonObject.addProperty("q050", DoubleRounder.round(rs.getDouble(5), roundParam));
                jsonObject.addProperty("q090", DoubleRounder.round(rs.getDouble(6), roundParam));
                jsonObject.addProperty("q095", DoubleRounder.round(rs.getDouble(7), roundParam));
                jsonObject.addProperty("max", DoubleRounder.round(rs.getDouble(8), roundParam));
                jsonArray.add(jsonObject);
            }
        } else {
            jsonArray.add(JsonHelper.forPair("message", "type param is invalid"));
        }

        p_response.getWriter().write(JsonHelper.writer.toJson(jsonArray));
    }

    @RequestMapping(value = "/startParsingInBD/**", method = {RequestMethod.GET, RequestMethod.POST}, produces = {"text/html;charset=utf-8"}, headers = "Connection!=Upgrade")
    public void startBD(@CookieValue(value = "token", defaultValue = "") String token,
                        @CookieValue(value = "login", defaultValue = "") String login,
                        HttpServletRequest p_request,
                        HttpServletResponse p_response) throws IOException, ParseException {
        if (skyBotPath == null || skyBotPath.isEmpty()) {
            p_response.getWriter().write("sky.bot.path is empty");
            return;
        }

        File directory = new File(skyBotPath.concat("\\processing-results\\ResultsOur"));
        if (!directory.canRead()) {
            p_response.getWriter().write("Read access error on: ".concat(directory.getPath()));
            return;
        }

        File[] files = directory.listFiles();
        if (files == null) {
            p_response.getWriter().write("No files found");
            return;
        }

        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyMMdd/hh-mm-ss.sss");
        List<ParsedTrack> tracksList = new ArrayList<>();
        List<String> fileStr = new ArrayList<>();

        String line;
        for (File file : files) {
            try {
                if (file.getName().contains("Ident")) {
                    LOGGER.log(Level.INFO, "Start processing file: " + file.getName() + " ...");

                    fileStr.clear();
                    try (BufferedReader br = new BufferedReader(new FileReader(file))) {
                        while ((line = br.readLine()) != null) fileStr.add(line);
                    }

                    LOGGER.log(Level.INFO, "... lines loaded: " + fileStr.size());

                    for (int i = 0, sz = fileStr.size(); i < sz; i++) {
                        String[] track = fileStr.get(i).trim().split("\\s+");
                        if (track.length != 10) continue;

                        int id = 0;
                        int nkobest = 0;
                        int ngood = 0;
                        int dist = 0;
                        double date = 0.0;
                        String filename = "";

                        if (track[0].equals("#") && track[1].equals("NKObest")) {
                            i++;
                            String[] header = fileStr.get(i).trim().split("\\s+");
                            if (header.length <= 2) continue;

                            id = Integer.parseInt(header[0]);
                            nkobest = Integer.parseInt(header[1]);

                            if (header.length == 11) {
                                try {
                                    ngood = Integer.parseInt(header[3]);
                                } catch (Exception e) {
                                    ngood = 0;
                                    LOGGER.warning("Can't parse ngood param: " + e.getMessage() + " Cause: " + e.getCause());
                                }
                                dist = Integer.parseInt(header[4]);
                                date = DateHelper.unixToJD(simpleDateFormat.parse(header[9]).getTime());
                                filename = header[10];
                            }
                            else if (header.length == 12) {
                                ngood = Integer.parseInt(header[4]);
                                dist = Integer.parseInt(header[5]);
                                date = DateHelper.unixToJD(simpleDateFormat.parse(header[10]).getTime());
                                filename = header[11];
                            }
                            else {
                                LOGGER.warning("Error reading header");
                            }

                            i += 2;

                            List<TelescopeInfoHelper.ParsedBlip> parsedBlipList = new ArrayList<>();
                            String[] blipline = fileStr.get(i).trim().split("\\s+");

                            while (blipline.length >= 7 && !blipline[0].equals("==========================================================")) {
                                parsedBlipList.add(new TelescopeInfoHelper.ParsedBlip(
                                        blipline[1],
                                        Double.parseDouble(blipline[4]),
                                        Double.parseDouble(blipline[5]),
                                        Double.parseDouble(blipline[6])
                                ));

                                i++;
                                blipline = fileStr.get(i).trim().split("\\s+");
                            }
                            tracksList.add(new ParsedTrack(id, nkobest, ngood, dist, date, filename, parsedBlipList));
                        }
                    }

                    LOGGER.log(Level.INFO, "... stop processing file: " + file.getName());
                }
            } catch (Exception e) {
                LOGGER.warning("Can't parse " + file.getName() + " Cause: " + e.getCause() + " Message: "+ e.getMessage());
                continue;
            }
        }

        /////////////////////// get blips from DB /////////////////////////
        Collections.sort(tracksList);
        String sql = "select blips_id, origin, time, track_id from blips inner join tracks t on track_id = t.tracks_id where time > ? order by track_id,time asc";
        SqlRowSet rs = jdbcTemplate.queryForRowSet(sql, tracksList.get(0).getDate());

        Map<String, Map <String, Integer>> blipsMapFromDB = new HashMap<>();

        double t0 = -1;
        long trackId = -1;
        while (rs.next()) {
            String key = rs.getString(2);
            int blipIdfromDb = rs.getInt(1);
            double tm = rs.getDouble(3);
            int tId = rs.getInt(4);

            // New track appears
            if (tId != trackId) {
                trackId = tId;
                t0 = tm;
            }

            String dtKey = Double.toString(Math.round(86400*(tm - t0)*10)/10.);
            blipsMapFromDB.computeIfAbsent(key, k->new HashMap<>())
                          .put(dtKey, blipIdfromDb);
        }

        for (TelescopeInfoHelper.ParsedTrack parsedTrack : tracksList) {
            String fileName = parsedTrack.getFilename();
            Map<String,Integer> mapDB = blipsMapFromDB.get(fileName);
            if (mapDB == null) continue;

            List <TelescopeInfoHelper.ParsedBlip> list = parsedTrack.getParsedBlipList();
            for (TelescopeInfoHelper.ParsedBlip parsedBlip : list) {
                Integer blpId = mapDB.get(parsedBlip.getdT());
                if (blpId != null) parsedBlip.setBlipId(blpId);
            }
        }

        LOGGER.log(Level.INFO, "before update " + tracksList.size());
        int[] blips = new int[2];
        for (TelescopeInfoHelper.ParsedTrack parsedTrack : tracksList) {
            updateIdentificationErrors(parsedTrack.getParsedBlipList(), blips);
        }

        p_response.getWriter().write(String.format("Migration completed. Saved tracks: %d, blips: %d (updated) / %d (inserted)", tracksList.size(), blips[0], blips[1]));
    }

    @Transactional
    public void updateIdentificationErrors(List<TelescopeInfoHelper.ParsedBlip> blipsList, int[] p_blips) {
        LOGGER.log(Level.INFO, "before update " + blipsList.size() + " blips: " + p_blips[0] + " / " + p_blips[1]);
        for (TelescopeInfoHelper.ParsedBlip parsedBlip : blipsList) {
            int id = parsedBlip.getBlipId();
            if (id == 0) continue;

            String sql = "update identification_errors set dtalong = ?, along = ?, across = ? where blip_id = ?";
            int result = jdbcTemplate.update(sql, parsedBlip.getdTalong(), parsedBlip.getAlong(), parsedBlip.getAcross(), id);
            if (result == 0) {
                sql = "insert into identification_errors(blip_id,dtalong,along,across) values(?,?,?,?)";
                p_blips[1] += jdbcTemplate.update(sql, id, parsedBlip.getdTalong(), parsedBlip.getAlong(), parsedBlip.getAcross());
            } else {
                p_blips[0] += result;
            }
        }
    }
}
