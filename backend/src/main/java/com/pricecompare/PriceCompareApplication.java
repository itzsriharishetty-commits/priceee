package com.pricecompare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point. Run with: mvn spring-boot:run
 * Dashboard will be served at http://localhost:8080
 * API lives under http://localhost:8080/api/*
 */
@SpringBootApplication
public class PriceCompareApplication {
    public static void main(String[] args) {
        SpringApplication.run(PriceCompareApplication.class, args);
    }
}
