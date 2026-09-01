package com.pricecompare.controller.dto;

import com.pricecompare.model.ComparisonGroup;
import com.pricecompare.model.PriceEntry;

import java.util.List;

/** Flattened, dashboard-friendly view of a ComparisonGroup. */
public class GroupResponse {
    public String groupId;
    public String displayName;
    public int platformCount;
    public double maxSavings;
    public String cheapestPlatform;
    public List<PriceEntry> entries;

    public static GroupResponse from(ComparisonGroup group) {
        GroupResponse r = new GroupResponse();
        r.groupId = group.getGroupId();
        r.displayName = group.getDisplayName();
        r.platformCount = group.platformCount();
        r.maxSavings = round2(group.maxSavings());
        PriceEntry cheapest = group.cheapest();
        r.cheapestPlatform = cheapest == null || cheapest.getPlatform() == null
                ? null
                : cheapest.getPlatform().name();
        r.entries = group.sortedByPrice();
        return r;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
