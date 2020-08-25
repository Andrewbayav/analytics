package com.mak.util;

import com.google.gson. *;
import com.mak.entity.TelescopeDonut;
import org.springframework.jdbc.support.rowset.SqlRowSet;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;


public final class JsonHelper {
    public static final JsonElement NULL = new JsonObject();
    public static final Gson writer = JsonWriter();
    public static final JsonParser parser = new JsonParser();

    public static boolean asBoolean(JsonElement p_json, boolean p_default) {
        if (p_json == null || p_json.isJsonNull() || !p_json.isJsonPrimitive()) return p_default;

        JsonPrimitive x = p_json.getAsJsonPrimitive();
        return x.isNumber() ? (p_json.getAsInt() != 0) : p_json.getAsBoolean();
    }

    public static int asInt(JsonElement p_json, int p_default) {
        return (p_json == null || p_json.isJsonNull()) ? p_default : p_json.getAsInt();
    }

    public static long asLong(JsonElement p_json, long p_default) {
        return (p_json == null || p_json.isJsonNull()) ? p_default : p_json.getAsLong();
    }

    public static double asDouble(JsonElement p_json, double p_default) {
        return (p_json == null || p_json.isJsonNull()) ? p_default : p_json.getAsDouble();
    }

    public static String asString(JsonElement p_json, String p_default) {
        return (p_json == null || p_json.isJsonNull()) ? p_default : p_json.getAsString();
    }

    public static JsonObject forPair(String name, String value) {
        JsonObject o = new JsonObject();
        o.addProperty(name, value);

        return o;
    }

    private static Gson JsonWriter() {
        return new GsonBuilder()
                .serializeNulls()
                .setLenient()
                .create();
    }


    public static JsonElement forMessage(String message) { return forPair("message", message); }
    public static String toJsonError(String message) { return writer.toJson(forMessage(message)); }

    public static JsonElement getJsonElementForCalendar(SqlRowSet rs, String[] specCodesArray) {
        Map<Integer, Map<Date, Integer>> trackMap = new HashMap<>();
        for (String specCode : specCodesArray)  {
            trackMap.put(Integer.parseInt(specCode), new HashMap<Date, Integer>());
        }

        while (rs.next()) {
            Integer key = rs.getInt(2);
            trackMap.get(key).computeIfAbsent(rs.getDate(3), k-> rs.getInt(1));
        }

        JsonObject trackJsonElement = new JsonObject();
        for (Map.Entry<Integer, Map<Date, Integer>> pair : trackMap.entrySet()) {
            JsonArray jsonArray = new JsonArray();
            for (Map.Entry<Date, Integer> innerPair : pair.getValue().entrySet()) {
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("date", innerPair.getKey().toString());
                jsonObject.addProperty("count", innerPair.getValue());
                jsonArray.add(jsonObject);
            } 
            trackJsonElement.add(pair.getKey().toString(), jsonArray);
        }
        return trackJsonElement;
    }

    public static JsonElement getJsonElementForHeatmap(SqlRowSet rs, String[] specCodesArray) {
        Map<Integer, Map<Integer, Integer>> trackMap = new HashMap<>();
        for (String specCode : specCodesArray)  {
            trackMap.put(Integer.parseInt(specCode), new HashMap<>());
        }

        while (rs.next()) {
            Integer key = rs.getInt(2);
            trackMap.get(key).computeIfAbsent(rs.getInt(3), k-> rs.getInt(1));
        }

        JsonObject trackJsonElement = new JsonObject();
        for (Map.Entry<Integer, Map<Integer, Integer>> pair : trackMap.entrySet()) {
            JsonArray jsonArray = new JsonArray();
            for (Map.Entry<Integer, Integer> innerPair : pair.getValue().entrySet()) {
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("date", innerPair.getKey().toString());
                jsonObject.addProperty("count", innerPair.getValue());
                jsonArray.add(jsonObject);
            }
            trackJsonElement.add(pair.getKey().toString(), jsonArray);
        }

        return trackJsonElement;
    }

    public static JsonElement getJsonElementForDonuts(SqlRowSet rs, String[] specCodesArray, String year) {
        Map<Integer,TelescopeDonut> donutListMap = new HashMap<>();
        while (rs.next()) {
            int code = rs.getInt(1);
            int v_year = rs.getInt(2);
            int count = rs.getInt(3);
            int sum = rs.getInt(4);
            TelescopeDonut telescopeDonut = new TelescopeDonut(code, v_year,count,sum);
            donutListMap.put(code, telescopeDonut);
        }

        // including not-worked specificationObjects
        for (String specCode : specCodesArray) {
            int sCode = Integer.parseInt(specCode);
            if (!donutListMap.containsKey(sCode)){
                donutListMap.put(sCode, new TelescopeDonut(sCode, Integer.parseInt(year),0,0));
            }
        }

        // forming Json
        JsonElement trackJsonElement = new JsonObject();
        for (Map.Entry<Integer, TelescopeDonut> pair : donutListMap.entrySet()) {
            //JsonArray jsonArray = new JsonArray();
            JsonObject jsonObject = new JsonObject();
            jsonObject.addProperty("year", pair.getValue().getV_year());
            jsonObject.addProperty("count", pair.getValue().getCount());
            jsonObject.addProperty("sum", pair.getValue().getSum());
            //jsonArray.add(jsonObject);
            ((JsonObject) trackJsonElement).add(String.valueOf(pair.getKey()), jsonObject);
        }
        return trackJsonElement;
    }
}

