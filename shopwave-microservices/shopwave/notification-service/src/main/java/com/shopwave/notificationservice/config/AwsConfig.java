package com.shopwave.notificationservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.awscore.client.builder.AwsClientBuilder;
import software.amazon.awssdk.core.client.builder.SdkSyncClientBuilder;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.SqsClientBuilder;

import java.net.URI;

@Configuration
@Slf4j
public class AwsConfig {

    @Value("${aws.region:us-east-1}")
    private String region;

    @Value("${aws.endpoint-url:}")
    private String endpointUrl;

    @Bean
    public SqsClient sqsClient() {
        return buildClient(SqsClient.builder());
    }

    @Bean
    public SesClient sesClient() {
        return buildClient(SesClient.builder());
    }

    @SuppressWarnings("unchecked")
    private <T> T buildClient(software.amazon.awssdk.awscore.client.builder.AwsClientBuilder builder) {
        ((SdkSyncClientBuilder<SqsClientBuilder, SqsClient>) builder.region(Region.of(region)))
               .httpClient(UrlConnectionHttpClient.builder().build());

        if (endpointUrl != null && !endpointUrl.isBlank()) {
            log.info("Using LocalStack endpoint: {}", endpointUrl);
            ((AwsClientBuilder<SqsClientBuilder, SqsClient>) builder.endpointOverride(URI.create(endpointUrl)))
                   .credentialsProvider(StaticCredentialsProvider.create(
                           AwsBasicCredentials.create("test", "test")));
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }
        return (T) builder.build();
    }
}
