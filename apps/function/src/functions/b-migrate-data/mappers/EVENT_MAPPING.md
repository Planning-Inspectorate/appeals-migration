# AppealEvent → Sink Mapping

This document highlights which `AppealEvent` fields are **not mapped** to the sink system.

---

## Event Type Handling (High Level)

The following event types create sink records:

- `hearing`, `hearing_virtual` → `Hearing`
- `inquiry`, `inquiry_virtual`, `pre_inquiry`, `pre_inquiry_virtual` → `Inquiry`
- `site_visit_access_required`, `site_visit_accompanied`, `site_visit_unaccompanied` → `SiteVisit`

`in_house` is **not mapped** and is only logged.

Only the **first occurrence** of each event type is processed.

---

# Unmapped Fields

The following `AppealEvent` fields are **not migrated** to the sink system.

## 1. Fields Not Represented in the Sink Schema

These fields are completely ignored because the sink has no equivalent field.

| Source Field              | Type       |
| ------------------------- | ---------- |
| `eventName`               | `String?`  |
| `eventStatus`             | `String?`  |
| `isUrgent`                | `Boolean?` |
| `eventPublished`          | `Boolean?` |
| `notificationOfSiteVisit` | `String?`  |

---

## 2. Fields That Use Sink Defaults (Not Explicitly Mapped)

| Source Field     | Sink Behaviour                                  |
| ---------------- | ----------------------------------------------- |
| `addressCountry` | Not mapped; sink defaults to `"United Kingdom"` |

---

## 3. Sink Fields With No Source Equivalent

The sink schema includes fields that are never populated because no matching source data exists.

| Sink Field                     | Type      |
| ------------------------------ | --------- |
| `siteVisit.whoMissedSiteVisit` | `String?` |

This field will always remain `null` unless populated by another process.
