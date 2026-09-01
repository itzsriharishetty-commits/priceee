package com.pricecompare.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;
import java.util.UUID;

/**
 * A single price point captured from a page the user had open — either via
 * the extension's click-to-capture, its auto-scan suggestions, or manual
 * entry in the dashboard. Nothing here is fetched by the server itself.
 */
public class PriceEntry {

    private String id = UUID.randomUUID().toString();

    @NotNull
    private Platform platform;

    @NotBlank
    private String itemName;

    @NotNull
    @PositiveOrZero
    private Double price;

    /** Optional: delivery fee shown on the page at capture time. */
    private Double deliveryFee;

    /** Restaurant / store name, if the page exposed one. */
    private String storeName;

    /** Page the price was captured from, so the user can jump back to order. */
    private String sourceUrl;

    /** Optional manual override so the user can force-group items themselves. */
    private String groupKeyOverride;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant capturedAt = Instant.now();

    public PriceEntry() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Platform getPlatform() {
        return platform;
    }

    public void setPlatform(Platform platform) {
        this.platform = platform;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getDeliveryFee() {
        return deliveryFee;
    }

    public void setDeliveryFee(Double deliveryFee) {
        this.deliveryFee = deliveryFee;
    }

    public String getStoreName() {
        return storeName;
    }

    public void setStoreName(String storeName) {
        this.storeName = storeName;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public String getGroupKeyOverride() {
        return groupKeyOverride;
    }

    public void setGroupKeyOverride(String groupKeyOverride) {
        this.groupKeyOverride = groupKeyOverride;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public void setCapturedAt(Instant capturedAt) {
        this.capturedAt = capturedAt;
    }

    /** Total the user actually pays, if a delivery fee was captured alongside the item. */
    public double getEffectiveTotal() {
        double fee = deliveryFee == null ? 0.0 : deliveryFee;
        double base = price == null ? 0.0 : price;
        return base + fee;
    }
}
