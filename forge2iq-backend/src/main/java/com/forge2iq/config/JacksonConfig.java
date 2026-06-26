package com.forge2iq.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

@Configuration
public class JacksonConfig {

    // Jackson 3.x (used by Spring Boot 4.x) moved date/time features out of
    // SerializationFeature into DateTimeFeature. This disables timestamp arrays
    // so LocalDateTime serializes as ISO-8601 strings.
    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
            .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();
    }
}
