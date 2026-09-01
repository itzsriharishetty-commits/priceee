package com.pricecompare.model;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * A cluster of PriceEntry objects believed to be "the same dish" across
 * different platforms, ready for side-by-side display.
 */
public class ComparisonGroup {

    private String groupId;
    private String displayName;
    private List<PriceEntry> entries = new ArrayList<>();

    public ComparisonGroup(String groupId, String displayName) {
        this.groupId = groupId;
        this.displayName = displayName;
    }

    public String getGroupId() {
        return groupId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public List<PriceEntry> getEntries() {
        return entries;
    }

    public void addEntry(PriceEntry entry) {
        entries.add(entry);
        // Prefer the longest, most descriptive captured name as the display label.
        if (entry.getItemName() != null && entry.getItemName().length() > displayName.length()) {
            displayName = entry.getItemName();
        }
    }

    /** Entries sorted cheapest-first by effective total (price + delivery fee). */
    public List<PriceEntry> sortedByPrice() {
        List<PriceEntry> copy = new ArrayList<>(entries);
        copy.sort(Comparator.comparingDouble(PriceEntry::getEffectiveTotal));
        return copy;
    }

    public PriceEntry cheapest() {
        return sortedByPrice().isEmpty() ? null : sortedByPrice().get(0);
    }

    public PriceEntry priciest() {
        List<PriceEntry> sorted = sortedByPrice();
        return sorted.isEmpty() ? null : sorted.get(sorted.size() - 1);
    }

    public double maxSavings() {
        PriceEntry cheap = cheapest();
        PriceEntry costly = priciest();
        if (cheap == null || costly == null) return 0;
        return costly.getEffectiveTotal() - cheap.getEffectiveTotal();
    }

    public int platformCount() {
        return (int) entries.stream().map(PriceEntry::getPlatform).distinct().count();
    }
}
