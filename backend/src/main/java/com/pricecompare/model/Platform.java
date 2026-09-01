package com.pricecompare.model;

/**
 * The platforms this tool knows how to compare. If you want to add another
 * platform (e.g. Instamart), add it here and write a matching content script
 * in the extension.
 */
public enum Platform {
    SWIGGY("Swiggy", "#FC8019"),
    ZOMATO("Zomato", "#E23744"),
    ZEPTO("Zepto", "#8B2CF5"),
    OTHER("Other", "#6B7280");

    private final String displayName;
    private final String brandColor;

    Platform(String displayName, String brandColor) {
        this.displayName = displayName;
        this.brandColor = brandColor;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getBrandColor() {
        return brandColor;
    }

    /** Best-effort parse from a loose string (e.g. sent by the extension). */
    public static Platform fromString(String raw) {
        if (raw == null) return OTHER;
        String normalized = raw.trim().toUpperCase();
        try {
            return Platform.valueOf(normalized);
        } catch (IllegalArgumentException e) {
            return OTHER;
        }
    }
}
