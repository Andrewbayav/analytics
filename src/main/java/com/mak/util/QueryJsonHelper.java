package com.mak.util;

import org.apache.http.NameValuePair;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;

import javax.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

public class QueryJsonHelper {
    private static final Logger LOGGER = Logger.getLogger(QueryJsonHelper.class.getName());

    private static final RequestConfig requestConfig = RequestConfig.custom()
            .setConnectTimeout(30000)
            .setSocketTimeout(30000)
            .build();

    private static final CloseableHttpClient client = HttpClientBuilder.create()
            .setDefaultRequestConfig(requestConfig)
            .build();

    public static String getJson(String p_url) { return queryJson(new HttpGet(p_url)); }

    public static String postJson(String p_url, Map<String,String> p_params) {
        List<NameValuePair> params = new ArrayList<>();
        for (Map.Entry<String,String> e: p_params.entrySet()) {
            params.add(new BasicNameValuePair(e.getKey(), e.getValue()));
        }

        HttpPost q = new HttpPost(p_url);
        q.setEntity(new UrlEncodedFormEntity(params, StandardCharsets.UTF_8));

        return queryJson(q);
    }

    private static String queryJson(HttpUriRequest p_uri) {
        try (CloseableHttpResponse r = client.execute(p_uri)) {
            int code = r.getStatusLine().getStatusCode();
            if (code == HttpServletResponse.SC_OK) {
                return EntityUtils.toString(r.getEntity(), StandardCharsets.UTF_8);
            } else {
                LOGGER.log(Level.WARNING, "Failed to do HTTP query. Code: " + code);
            }
        } catch (Exception x) {
            LOGGER.log(Level.WARNING, "Failed to parse HTTP reply", x);
        }

        return null;
    }
}
