package com.pricecompare.service;

import com.pricecompare.model.ComparisonGroup;
import com.pricecompare.model.PriceEntry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Clusters raw PriceEntry captures into ComparisonGroups ("this is probably
 * the same dish across Swiggy/Zomato/Zepto"). Grouping priority:
 *   1. Exact match on groupKeyOverride, if the user (or extension) set one —
 *      always trusted over fuzzy matching.
 *   2. Fuzzy name similarity above the configured threshold.
 * Groups with entries from only one platform are still returned (so single
 * captures show up immediately) but are visually less interesting — the
 * dashboard can filter those out if desired.
 */
@Service
public class ComparisonService {

    private final PriceStore store;
    private final NameMatcher matcher;

    @Value("${pricecompare.match-threshold:0.55}")
    private double matchThreshold;

    public ComparisonService(PriceStore store, NameMatcher matcher) {
        this.store = store;
        this.matcher = matcher;
    }

    public List<ComparisonGroup> buildGroups(String query) {
        List<PriceEntry> fresh = store.getAllFresh();

        if (query != null && !query.isBlank()) {
            String needle = matcher.normalize(query);
            fresh = fresh.stream()
                    .filter(e -> matcher.normalize(e.getItemName()).contains(needle))
                    .toList();
        }

        List<ComparisonGroup> groups = new ArrayList<>();

        for (PriceEntry entry : fresh) {
            ComparisonGroup target = findGroupFor(entry, groups);
            if (target == null) {
                target = new ComparisonGroup(UUID.randomUUID().toString(), entry.getItemName());
                groups.add(target);
            }
            target.addEntry(entry);
        }

        // Most interesting groups first: multi-platform matches with the
        // biggest potential savings float to the top.
        groups.sort(
                Comparator.comparingInt(ComparisonGroup::platformCount).reversed()
                        .thenComparing(Comparator.comparingDouble(ComparisonGroup::maxSavings).reversed())
        );

        return groups;
    }

    private ComparisonGroup findGroupFor(PriceEntry entry, List<ComparisonGroup> groups) {
        // 1. Manual override wins outright.
        if (entry.getGroupKeyOverride() != null && !entry.getGroupKeyOverride().isBlank()) {
            String key = matcher.normalize(entry.getGroupKeyOverride());
            for (ComparisonGroup g : groups) {
                boolean groupHasSameOverride = g.getEntries().stream()
                        .anyMatch(e -> key.equals(matcher.normalize(e.getGroupKeyOverride())));
                if (groupHasSameOverride) return g;
            }
        }

        // 2. Fuzzy match against each existing group's display name.
        ComparisonGroup best = null;
        double bestScore = matchThreshold;
        for (ComparisonGroup g : groups) {
            double score = matcher.similarity(entry.getItemName(), g.getDisplayName());
            if (score >= bestScore) {
                bestScore = score;
                best = g;
            }
        }
        return best;
    }
}
