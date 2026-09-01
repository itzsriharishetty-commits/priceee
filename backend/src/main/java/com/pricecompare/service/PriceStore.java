package com.pricecompare.service;

import com.pricecompare.model.PriceEntry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Deliberately simple in-memory store. This tool is meant to run locally on
 * your own machine for a single session of price-hunting, not as a durable
 * multi-user backend — menu prices go stale within minutes anyway, so
 * persistence would just be showing you outdated numbers.
 */
@Component
public class PriceStore {

    private final Map<String, PriceEntry> entries = new ConcurrentHashMap<>();

    @Value("${pricecompare.entry-ttl-minutes:45}")
    private int ttlMinutes;

    public void add(PriceEntry entry) {
        if (entry.getId() == null) {
            entry.setId(java.util.UUID.randomUUID().toString());
        }
        entries.put(entry.getId(), entry);
    }

    public void addAll(List<PriceEntry> newEntries) {
        newEntries.forEach(this::add);
    }

    public List<PriceEntry> getAllFresh() {
        purgeStale();
        return entries.values().stream()
                .sorted((a, b) -> b.getCapturedAt().compareTo(a.getCapturedAt()))
                .collect(Collectors.toList());
    }

    public void clear() {
        entries.clear();
    }

    public int size() {
        return entries.size();
    }

    private void purgeStale() {
        Instant cutoff = Instant.now().minus(ttlMinutes, ChronoUnit.MINUTES);
        entries.values().removeIf(e -> e.getCapturedAt() != null && e.getCapturedAt().isBefore(cutoff));
    }
}
