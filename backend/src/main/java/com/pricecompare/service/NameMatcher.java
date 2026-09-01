package com.pricecompare.service;

import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Turns messy, differently-worded item names ("Chicken Biryani (Full)" vs
 * "Chicken Dum Biryani - Full Plate") into a normalized token set, then
 * scores how similar two names are so they can be clustered as "the same
 * dish". This is intentionally simple and tunable rather than a black box —
 * matching real-world menu names is fuzzy by nature, so a manual
 * groupKeyOverride is always available as an escape hatch (see PriceEntry).
 */
@Component
public class NameMatcher {

    // Words that describe portion/size/packaging rather than the dish itself.
    // Stripping these prevents "Biryani Full" and "Biryani Half" from being
    // treated as different dishes, and stops noise words from padding the
    // similarity score.
    private static final Set<String> STOPWORDS = new LinkedHashSet<>(Arrays.asList(
            "the", "a", "an", "with", "and", "of", "in",
            "regular", "medium", "large", "small", "full", "half", "mini", "jumbo",
            "combo", "meal", "plate", "pcs", "pc", "piece", "pieces", "pack",
            "new", "special", "classic", "signature", "fresh", "hot",
            "veg", "non"
    ));

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9\\s]");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");

    /** Normalize a raw item name into a stable, comparable form. */
    public String normalize(String raw) {
        if (raw == null) return "";
        String lower = raw.toLowerCase();
        lower = NON_ALNUM.matcher(lower).replaceAll(" ");
        lower = MULTI_SPACE.matcher(lower).replaceAll(" ").trim();

        StringBuilder sb = new StringBuilder();
        for (String token : lower.split(" ")) {
            if (token.isBlank() || STOPWORDS.contains(token)) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(token);
        }
        return sb.toString();
    }

    /** Token set used for Jaccard similarity. */
    private Set<String> tokenSet(String normalized) {
        Set<String> set = new LinkedHashSet<>();
        if (normalized.isBlank()) return set;
        set.addAll(Arrays.asList(normalized.split(" ")));
        return set;
    }

    /**
     * Similarity score in [0, 1] combining token overlap (Jaccard) with
     * character-level edit distance, so both "different word order" and
     * "slightly different spelling" are tolerated.
     */
    public double similarity(String rawA, String rawB) {
        String a = normalize(rawA);
        String b = normalize(rawB);
        if (a.isEmpty() || b.isEmpty()) return 0.0;
        if (a.equals(b)) return 1.0;

        Set<String> tokensA = tokenSet(a);
        Set<String> tokensB = tokenSet(b);
        double jaccard = jaccard(tokensA, tokensB);

        int dist = levenshtein(a, b);
        int maxLen = Math.max(a.length(), b.length());
        double editSimilarity = maxLen == 0 ? 1.0 : 1.0 - ((double) dist / maxLen);

        return (0.6 * jaccard) + (0.4 * editSimilarity);
    }

    private double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) return 1.0;
        Set<String> union = new LinkedHashSet<>(a);
        union.addAll(b);
        Set<String> intersection = new LinkedHashSet<>(a);
        intersection.retainAll(b);
        if (union.isEmpty()) return 0.0;
        return (double) intersection.size() / union.size();
    }

    private int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;

        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(
                        Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1),
                        dp[i - 1][j - 1] + cost
                );
            }
        }
        return dp[a.length()][b.length()];
    }
}
