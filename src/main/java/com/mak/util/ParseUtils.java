package com.mak.util;

import java.math.BigDecimal;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.*;

public class ParseUtils {
    public static final double rg = 180.0/Math.PI;

    public final static String DFL_DATE_FORMAT = "yyyyMMdd";
    public final static String[] DATE_FORMATS = new String[] { DFL_DATE_FORMAT, "yyyy-MM-dd", "dd.MM.yyyy" };
    private static final Collection<String> NULL_DATES = new HashSet<>(Arrays.asList("0", "00000000", "+0000000", "99999999", "9999999", "+9999999"));
    private static final ThreadLocal<Map<String,DateFormat>> sDateParsers = new ThreadLocal<>();
    private static final ThreadLocal<Map<String,DateFormat>> sMoscowCalendar = new ThreadLocal<>();

    public static java.sql.Timestamp fromSqlDate(Object value) {
        if (value == null) return null;

        try {
            Object obj = extractDate(value, DATE_FORMATS);
            if (obj == null) return null;

            return new java.sql.Timestamp(((Date) obj).getTime());
        } catch (Exception e) {
            return null;
        }
    }

    public static Double fromDouble(Object o) {
        return fromDouble(o, false);
    }

    public static Double fromDouble(Object o, boolean nullAsZero) {
        if (o == null) {
            return nullAsZero ? 0.0 : null;
        } else if(o instanceof Double) {
            return (Double)o;
        } else if(o instanceof Float) {
            return ((Float)o).doubleValue();
        } else if(o instanceof Integer) {
            return ((Integer)o).doubleValue();
        } else if(o instanceof Long) {
            return ((Long)o).doubleValue();
        } else if(o instanceof BigDecimal) {
            return ((BigDecimal)o).doubleValue();
        } else if (o instanceof String) {
            String x = o.toString();
            if (x.length() == 0) {
                if (nullAsZero) return 0d;
                throw new IllegalArgumentException("Empty string parse");
            }

            return Double.parseDouble(x);
        }

        Long x = fromLong(o);
        return (x != null) ? x.doubleValue() : null;
    }

    public static Long fromLong(Object o) {
        return fromLong(o, false);
    }

    public static Long fromLong(Object o, boolean nullAsZero) {
        if (o == null) {
            return nullAsZero ? 0L : null;
        } else if (o instanceof Long) {
            return (Long) o;
        } else if (o instanceof Number) {
            return ((Number) o).longValue();
        } else if (o instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) o).getTime();
        } else if (o instanceof java.util.Date) {
            return ((java.util.Date) o).getTime();
        } else if (o instanceof String) {
            String s = o.toString().trim();
            if (s.length() == 0) {
                if (nullAsZero) return 0L;
                throw new IllegalArgumentException("Empty string parse");
            }

            char sign = s.charAt(0);
            if (sign == '+' || sign == '-') s = s.substring(1);
            return (sign != '-') ? Long.parseLong(s) : -Long.parseLong(s);
        }

        return fromInteger(o).longValue();
    }

    public static Integer fromInteger(Object o) {
        return fromInteger(o, false);
    }

    public static Integer fromInteger(Object o, boolean nullAsZero) {
        if (o == null) {
            return nullAsZero ? 0 : null;
        } else if (o instanceof Integer) {
            return (Integer)o;
        } else if (o instanceof Number) {
            return ((Number) o).intValue();
        } else if (o instanceof String) {
            String s = o.toString().trim();
            if (s.length() == 0) {
                if (nullAsZero) return 0;
                throw new IllegalArgumentException("Empty string parse");
            }
            char sign = s.charAt(0);
            if (sign == '+' || sign == '-') s = s.substring(1);
            return (sign != '-') ? Integer.parseInt(s) : -Integer.parseInt(s);
        }

        throw new ClassCastException("Unrecognized: " + o + " of " + o.getClass());
    }

    public static boolean fromBoolean(Object o) {
        if (o == null) {
            return false;
        } else if (o instanceof Boolean) {
            return (Boolean)o;
        } else if (o instanceof Integer) {
            return (Integer)o != 0;
        } else if (o instanceof Long) {
            return (Long)o != 0L;
        } else if (o instanceof BigDecimal) {
            return ((BigDecimal) o).longValue() != 0;
        } else if (o instanceof String) {
            return !o.toString().trim().isEmpty();
        }

        throw new ClassCastException("Unrecognized: " + o + " of " + o.getClass());
    }

    public static boolean isNumber(Object o) {
        try { return (fromLong(o, false) != null); }
        catch(Exception x) { return false; }
    }

    public static int nvl(Integer p_int) { return (p_int == null) ? 0 : p_int; }

    // From HSSFDateUtil.getJavaDate(date, false)
    public static Date getJavaDate(double date) {
        if (date <= -Double.MIN_VALUE) {
            return null;
        }

        int wholeDays = (int)Math.floor(date);
        int millisecondsInDay = (int)((date - wholeDays) * 86400000L + 0.5);

        Calendar calendar = new GregorianCalendar(); // using default time-zone
        calendar.set(1900, 0, wholeDays + (wholeDays < 61 ? 0 : -1), 0, 0, 0);
        calendar.set(GregorianCalendar.MILLISECOND, millisecondsInDay);

        return calendar.getTime();
    }

    // don't do any heuristic suggestions about date/time ranges
    public static Date extractDate(Object p_obj, String[] p_formats) { return extractDate(p_obj, p_formats, false); }

    public static Date extractDate(Object p_obj, String[] p_formats, boolean p_lenient) {
        if (p_obj instanceof Date) {
            return (Date) p_obj;
        } else if (p_obj instanceof Number) {
            Number n = (Number)p_obj;
            if (n.longValue() == 0) return null;
            return getJavaDate(n.doubleValue());
        } else if (p_obj instanceof String) {
            String o = p_obj.toString().trim();
            if (o.length() == 0 || NULL_DATES.contains(o)) return null;

            for (String fmt : p_formats) {
                try {
                    Map<String,DateFormat> map = sDateParsers.get();
                    if (map == null) sDateParsers.set(map = new HashMap<>());

                    DateFormat df = map.get(fmt);
                    if (df == null) map.put(fmt, df = new SimpleDateFormat(fmt, Locale.US));
                    df.setLenient(p_lenient);

                    return df.parse(o);
                } catch(Throwable t) {/*ignore*/}
            }

            // Try to parse double value from given string
            try { return getJavaDate(Double.parseDouble(o)); }
            catch(Throwable t) {/*ignore*/}
        }

        return null;
    }

    public static String formatDate(Date p_date) { return formatDate(p_date, "yyyy-MM-dd"); }
    public static String formatDate(Date p_date, String p_fmt) { return formatDate(p_date, p_fmt, null); }
    public static String formatDate(Date p_date, String p_fmt, String p_lang) {
        if (p_date == null) return "";

        Map<String,DateFormat> map = sDateParsers.get();
        if (map == null) sDateParsers.set(map = new HashMap<>());

        DateFormat df = map.get(p_fmt + p_lang);
        if (df == null) {
            Locale loc = (p_lang != null) ? Locale.forLanguageTag(p_lang) : Locale.getDefault(Locale.Category.FORMAT);
            map.put(p_fmt + p_lang, df = new SimpleDateFormat(p_fmt, loc));
        }

        return df.format(p_date);
    }

    public static String formatDateMsk(Date p_date, String p_fmt) {
        if (p_date == null) return "";

        Map<String,DateFormat> map = sMoscowCalendar.get();
        if (map == null) sMoscowCalendar.set(map = new HashMap<>());

        DateFormat df = map.get(p_fmt);
        if (df == null) {
            Calendar c = Calendar.getInstance(TimeZone.getTimeZone("Europe/Moscow"));
            map.put(p_fmt, df = new SimpleDateFormat(p_fmt));
            df.setCalendar(c);
        }

        return df.format(p_date);
    }

    /**
     * "числовые данные, имеющие десятичную часть, передаются по следующему правилу:
     * - если значение больше 1, то десятичная часть отбрасывается
     * - если значение меньше 1 и больше 0, то значение округляется до 1"
     */
    public static Double specialRound(Double p_value) {
        if (p_value == null) return null;

        if (p_value > 1) return Math.floor(p_value);
        if (p_value > 0) return 1.0;

        return p_value;
    }

    public static String nvl(Object p) { return nvl(p, ""); }
    public static String nvl(Object p, String d) { return (p == null) ? d : p.toString().trim(); }

    public static String string2key(String x) {
        if (x == null) return "";

        StringBuilder r = new StringBuilder();
        for (int i = 0; i < x.length(); i++) {
            char c = x.charAt(i);
            if (Character.isWhitespace(c)) continue;
            r.append(Character.toLowerCase(c));
        }

        return r.toString();
    }

    public static Collection<String> addOne(String p_from, Collection<String> p_to) {
        if (p_from != null) {
            p_from = p_from.trim().toUpperCase();
            if (p_from.length() > 0) p_to.add(p_from);
        }

        return p_to;
    }

    public static Collection<String> extractTo(String p_from, Collection<String> p_to) {
        if (p_from == null) return p_to;
        p_from = p_from.trim();
        if (p_from.length() == 0) return p_to;

        for (StringTokenizer st = new StringTokenizer(p_from, ",:;|"); st.hasMoreElements(); ) {
            addOne(st.nextToken(), p_to);
        }

        return p_to;
    }

    //
    public static double parseRA(String p_ra) throws Exception {
        int idx = 0;
        boolean neg = false;

        if (p_ra.charAt(0) == '-') {
            neg = true;
            idx++;
        }

        if (p_ra.length() - idx != 8) {
            throw new Exception("Некорректная длина строки 'RA'");
        }


        int h = 10*(p_ra.charAt(idx + 0) - '0') + (p_ra.charAt(idx + 1) - '0');
        int m = 10*(p_ra.charAt(idx + 2) - '0') + (p_ra.charAt(idx + 3) - '0');
        int s = 10*(p_ra.charAt(idx + 4) - '0') + (p_ra.charAt(idx + 5) - '0');
        int z = 10*(p_ra.charAt(idx + 6) - '0') + (p_ra.charAt(idx + 7) - '0');

        // 0..360
        double v = (h*15.0) + (m/4.0) + (s/240.0) + (z/24000.0);

        // 0..2*pi
        v /= rg;

        //
        return neg ? -v : v;
    }

    //
    public static double parseDEC(String p_ra) throws Exception {
        int idx = 0;
        boolean neg = false;

        if (p_ra.charAt(0) == '-') {
            neg = true;
            idx++;
        } else if (p_ra.charAt(0) == '+') {
            idx++;
        }

        if (p_ra.length() - idx != 8) {
            throw new Exception("Некорректная длина строки 'DEC'");
        }


        int d = 10*(p_ra.charAt(idx + 0) - '0') + (p_ra.charAt(idx + 1) - '0');
        int m = 10*(p_ra.charAt(idx + 2) - '0') + (p_ra.charAt(idx + 3) - '0');
        int s = 10*(p_ra.charAt(idx + 4) - '0') + (p_ra.charAt(idx + 5) - '0');
        int z = 10*(p_ra.charAt(idx + 6) - '0') + (p_ra.charAt(idx + 7) - '0');

        // 0..360
        double v = d + (m/60.0) + (s/3600.0) + (z/360000.0);

        // 0..2*pi
        v /= rg;

        //
        return neg ? -v : v;
    }

    /**
     * Static empty string constant
     */
    public static final String EmptyString = "";

    /**
     * Checks if the string is empty
     *
     * @param str reference to a string to check
     * @return {@code true} if {@code str} is a {@code null} reference or the content of the string is empty,
     * {@code false} otherwise
     * @see java.lang.String#isEmpty()
     * @see #isNullOrWhitespace(String)
     */
    public static boolean isNullOrEmpty(final String str) {
        return (str == null) || str.isEmpty();
    }

    /**
     * Checks if the string is empty or contains only whitespaces
     *
     * @param str reference to a string to check
     * @return {@code true} if {@code str} is a {@code null} reference, or the content of the string is empty,
     * or the string contains only whitespaces,
     * {@code false} otherwise
     * @see java.lang.String#matches(String)
     * @see #isNullOrEmpty(String)
     */
    public static boolean isNullOrWhitespace(final String str) {
        return (str == null) || str.matches("^\\s*$");
    }

    /**
     * Searches in the <i>input string</i> for the first "<i>key</i>{@code =}<i>value</i>" pair called <i>parameter</i> with the <i>key</i> and returns its <i>value</i>.
     * <p> Returns the specified {@code default_value} if no <i>parameter</i> with the <i>key</i> is found.
     *
     * @param p_params      an <i>input string</i> of parameters delimeted by {@code ,:;|}
     * @param p_key         a <i>key</i> of the <i>parameter</i> to find
     * @param default_value a return <i>value</i>, if no <i>parameter</i> with the <i>key</i> is found
     * @param ignoreCase    indicates whether to use {@code equalsIgnoreCase()} [if {@code true}] or {@code equals()} [if {@code false}]
     *                      to check the equality of the search <i>key</i> with the keys of parameters in the <i>input string</i>
     * @return first <i>value</i> from the <i>input string</i> of the "<i>key</i>{@code =}<i>value</i>" pair with the <i>key</i>.
     * <p>This <i>value</i> can be <b>empty</b>, if the first pair in the <i>input string</i> has empty <i>value</i>. Example: "...; <i>key</i> {@code =} ;..." .
     * <p>The {@code default_value} will be returned in the next cases:
     * <li>one of the {@code p_params} or {@code p_key} is {@code null}, empty or contains only whitespaces;
     * <li><i>parameter</i> with the <i>key</i> is not found.
     * @see java.util.StringTokenizer
     * @see #isNullOrWhitespace(String)
     * @see java.lang.String#equals(Object)
     * @see java.lang.String#equalsIgnoreCase(String)
     */
    public static String getParamValue(String p_params, String p_key, String default_value, boolean ignoreCase) {
        if (isNullOrWhitespace(p_params) || isNullOrWhitespace(p_key))
            return default_value;

        for (StringTokenizer st = new StringTokenizer(p_params.trim(), ",:;|"); st.hasMoreElements(); ) {
            String p_param = st.nextToken();

            if (isNullOrWhitespace(p_param))
                continue;

            String[] kvp = p_param.split("=");

            if (kvp.length != 2)
                continue;

            String kvp_key = kvp[0];

            if (isNullOrWhitespace(kvp_key))
                continue;

            if (ignoreCase
                    ? kvp_key.trim().equalsIgnoreCase(p_key.trim())
                    : kvp_key.trim().equals(p_key.trim())
                    ) {

                return kvp[1].trim();
            }
        }

        return default_value;
    }
}
