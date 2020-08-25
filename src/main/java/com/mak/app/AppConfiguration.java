package com.mak.app;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.CachingResourceResolver;
import org.springframework.web.servlet.resource.EncodedResourceResolver;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

@Configuration
@EnableWebMvc
@EnableCaching
public class AppConfiguration implements WebMvcConfigurer {
    private static final Logger LOGGER = Logger.getLogger(AppConfiguration.class.getName());

    @Value("${server.port}")
    private int https;

    @Autowired
    private CacheManager cacheManager;

    // Routing to Angular
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**/*")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.maxAge(14, TimeUnit.DAYS).noTransform().cachePrivate())
                .resourceChain(true)
                .addResolver(new CachingResourceResolver(cacheManager, "angular-cache"))
                .addResolver(new EncodedResourceResolver())
                .addResolver(new AnalyticsPathResourceResolver());
    }

    public void addCorsMappings(CorsRegistry registry) {
        String[] urls = new String[] { "http://localhost:".concat(Integer.toString(https)), "http://localhost:4200", "http://localhost:9876" };
        registry.addMapping("/**").allowedOrigins(urls).allowedMethods("GET", "POST").allowCredentials(true);
    }

    private static final class AnalyticsPathResourceResolver extends PathResourceResolver {
        protected Resource getResource(String resourcePath, Resource location) throws IOException {
            Resource requestedResource = location.createRelative(resourcePath);
            boolean ok = requestedResource.exists() && requestedResource.isReadable();
            LOGGER.info("Resource ".concat(resourcePath).concat(": ").concat(ok ? "OK" : "FAILED"));

            return ok ? requestedResource : new ClassPathResource("/static/ui/index.html");
        }
    }
}