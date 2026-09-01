# Price Race — compare Swiggy / Zomato / Zepto prices in one dashboard

## Why this works the way it does

Swiggy, Zomato, and Zepto don't publish public pricing APIs, and they
actively block automated scraping. So instead of pretending to "fetch"
prices from their servers, this tool reads prices from pages **you** already
have open in your browser — the same way a price-comparison browser
extension like Honey works. Nothing here contacts Swiggy/Zomato/Zepto
servers directly.

Three pieces:

1. **`extension/`** — a Chrome (Manifest V3) extension. Turn on "Capture
   mode", click a dish on a page, confirm/edit the name & price, and it's
   sent to your local backend. There's also a "scan this page" mode that
   finds candidate prices for you to bulk-select.
2. **`backend/`** — a Java Spring Boot app that stores captures in memory,
   fuzzy-matches the same dish across platforms (e.g. "Chicken Biryani
   Full" vs "Chicken Dum Biryani - Full Plate"), and serves a REST API.
3. The backend also serves the **dashboard** (plain HTML/CSS/JS) at
   `http://localhost:8080` — a live "price race" view, refreshing every 4s.

## 1. Run the backend

Requires Java 17+ and Maven.

```bash
cd backend
mvn spring-boot:run
```

This starts the API + dashboard at **http://localhost:8080**. Leave it
running while you shop.

(No Maven installed? Run `mvn -v` to check. If missing, install via your
OS package manager, e.g. `sdk install maven` or `brew install maven`.)

## 2. Install the extension

1. Open Chrome → `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder
4. Pin the extension for easy access

## 3. Capture prices

- Open a dish/product page on **swiggy.com**, **zomato.com**, or
  **zeptonow.com**.
- Click the extension icon → toggle **Capture mode: ON** (or use the
  floating 🎯 button the extension adds to the bottom-right of the page).
- Click a dish/price on the page. A small panel pops up with a best-guess
  name and price — fix anything that looks wrong, then **Send to Price
  Race**.
- Repeat across the platforms you want to compare for the same dish.
- Or use **"Scan this page for prices"** in the popup to grab several
  candidates at once and bulk-send the ones you want.

## 4. Watch the dashboard

Open **http://localhost:8080**. Matching dishes across platforms
automatically group into a "race card" with the cheapest option
highlighted and a savings badge. You can also add prices manually from the
dashboard if you'd rather not use the extension.

## Notes & limitations (read this before relying on it)

- **Matching is fuzzy, not perfect.** Menu names differ across platforms
  ("Full" vs "Regular", spelling, word order). The matcher handles common
  cases but will occasionally group the wrong things or fail to group the
  right things — check the dashboard before trusting a "winner". You can
  always add/edit manually.
- **Prices go stale fast.** Captured prices are dropped automatically after
  45 minutes (configurable in `application.properties`) since delivery
  fees and surge pricing change constantly. Re-capture before ordering.
- **DOM heuristics, not guaranteed selectors.** The extension's auto-scan
  and click-to-capture use generic heuristics (₹ pattern matching + nearby
  heading detection) rather than site-specific selectors, because
  Swiggy/Zomato/Zepto's markup changes frequently and hardcoded selectors
  would break silently. Click-to-capture's editable panel is there so you
  can always correct a bad guess.
- **This is a local, single-user tool.** The backend has open CORS and no
  auth by design — don't deploy it to the public internet as-is.
- **Delivery fees / platform fees / surge pricing** are only included if
  you capture them (the delivery-fee field is optional per capture).
  Final checkout totals (coupons, taxes) aren't captured automatically.

## Project structure

```
price-compare-tool/
├── backend/                          Java Spring Boot app
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/pricecompare/
│       │   ├── PriceCompareApplication.java
│       │   ├── model/                Platform, PriceEntry, ComparisonGroup
│       │   ├── service/              NameMatcher, PriceStore, ComparisonService
│       │   ├── controller/           PriceController (+ dto)
│       │   └── config/               CorsConfig
│       └── resources/
│           ├── application.properties
│           └── static/               index.html, style.css, app.js (dashboard)
└── extension/                        Chrome extension (Manifest V3)
    ├── manifest.json
    ├── content.js / content.css      Click-to-capture + auto-scan
    ├── background.js                 Relays captures to the backend
    └── popup.html / popup.js         Toggle capture mode, scan, open dashboard
```

## API reference (if you want to script against it)

| Method | Path              | Purpose                                   |
|--------|-------------------|--------------------------------------------|
| POST   | `/api/ingest`     | Bulk-add price entries (array body)        |
| POST   | `/api/manual`     | Add a single price entry                   |
| GET    | `/api/comparison` | Grouped comparison (optional `?query=`)    |
| DELETE | `/api/clear`      | Wipe all stored prices                     |
| GET    | `/api/health`     | Backend status + stored count              |
