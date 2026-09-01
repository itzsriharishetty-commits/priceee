package com.pricecompare.controller;

import com.pricecompare.controller.dto.GroupResponse;
import com.pricecompare.model.ComparisonGroup;
import com.pricecompare.model.PriceEntry;
import com.pricecompare.service.ComparisonService;
import com.pricecompare.service.PriceStore;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class PriceController {

    private final PriceStore store;
    private final ComparisonService comparisonService;

    public PriceController(PriceStore store, ComparisonService comparisonService) {
        this.store = store;
        this.comparisonService = comparisonService;
    }

    /** Bulk ingest — this is what the extension calls after a capture or scan-select. */
    @PostMapping("/ingest")
    public Map<String, Object> ingest(@Valid @RequestBody List<PriceEntry> newEntries) {
        store.addAll(newEntries);
        return Map.of(
                "received", newEntries.size(),
                "totalStored", store.size()
        );
    }

    /** Single manual entry — used by the dashboard's "Add manually" form. */
    @PostMapping("/manual")
    public Map<String, Object> addManual(@Valid @RequestBody PriceEntry entry) {
        store.add(entry);
        return Map.of("ok", true, "totalStored", store.size());
    }

    /** Grouped, comparison-ready view. Optional ?query= filters by dish name. */
    @GetMapping("/comparison")
    public List<GroupResponse> comparison(@RequestParam(required = false) String query) {
        List<ComparisonGroup> groups = comparisonService.buildGroups(query);
        return groups.stream().map(GroupResponse::from).collect(Collectors.toList());
    }

    @DeleteMapping("/clear")
    public Map<String, Object> clear() {
        store.clear();
        return Map.of("ok", true);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "storedEntries", store.size());
    }
}
