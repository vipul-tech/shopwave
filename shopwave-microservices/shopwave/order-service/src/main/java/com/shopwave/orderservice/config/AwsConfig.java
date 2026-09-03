package com.shopwave.orderservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;

import java.net.URI;

/**
 * AWS SQS client configuration.
 *
 * Interview talking point:
 * - In LOCAL / CI: uses LocalStack endpoint (http://localhost:4566)
 * - In AWS ECS: uses DefaultCredentialsProvider which picks up IAM Task Role
 *   automatically — no hardcoded credentials in production!
 * - The endpointUrl property is blank by default, so AWS SDK uses real endpoints.
 */
@Configuration
@Slf4j
public class AwsConfig {

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${aws.endpoint-url:}")
    private String endpointUrl;

    @Bean
    public SqsClient sqsClient() {
        var builder = SqsClient.builder()
                .region(Region.of(region))
                .httpClient(UrlConnectionHttpClient.builder().build());

        if (endpointUrl != null && !endpointUrl.isBlank()) {
            // LocalStack / custom endpoint for local dev
            log.info("Using custom AWS endpoint: {}", endpointUrl);
            builder.endpointOverride(URI.create(endpointUrl))
                   .credentialsProvider(StaticCredentialsProvider.create(
                           AwsBasicCredentials.create("test", "test")));
        } else {
            // Production: uses ECS Task Role via DefaultCredentialsProvider
            log.info("Using AWS DefaultCredentialsProvider (ECS Task Role)");
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }
}
