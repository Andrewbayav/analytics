package com.mak.util;

import javax.servlet.http.HttpServletRequest;
import java.util.function.Function;

public class HttpHelper {
    public static String ip(HttpServletRequest p_request) {
        String ip = p_request.getHeader("X-Real-IP");
        if (ip == null || ip.isEmpty() || ip.equalsIgnoreCase("unknown")) ip = null;
        if (ip == null) ip = p_request.getHeader("X-FORWARDED-FOR");
        if (ip == null) ip = p_request.getRemoteAddr();
        if (ip != null) ip = ip.split(",")[0];
        if (ip != null) ip = ip.trim();
        if (ip == null) ip = "";

        return ip;
    }

    public static String getString(HttpServletRequest p_request, String p_key, String p_default) {
        String v = p_request.getParameter(p_key);
        if (v == null) v = p_default;
        if (v != null) v = v.trim();

        return v;
    }

    public static double getDouble(HttpServletRequest p_request, String p_key, double p_default) {
        String v = p_request.getParameter(p_key);
        if (v == null || v.isEmpty()) return p_default;

        try { return Double.parseDouble(v); }
        catch(Exception x) { return p_default; }
    }

    public static int getInt(HttpServletRequest p_request, String p_key, int p_default) { return getInt(p_request, p_key, k -> p_default); }

    public static int getInt(HttpServletRequest p_request, String p_key, Function<String,Integer> p_defaulter) {
        String v = p_request.getParameter(p_key);
        if (v == null || v.isEmpty()) return p_defaulter.apply(v);

        try { return Integer.parseInt(v); }
        catch(Exception x) { return p_defaulter.apply(v); }
    }
}
