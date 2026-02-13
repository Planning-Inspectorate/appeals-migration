# Service User Migration – Simplified (Focus on Unmapped Fields)

## Overview

This document summarises how `AppealServiceUser` is migrated into the sink database (`ServiceUser` and `Address`), with emphasis on what is **not mapped**.

---

## What Is Mapped (High-Level)

### To `ServiceUser`

- `organisation` → `organisationName`
- `salutation`
- `firstName`
- `lastName`
- `emailAddress` → `email`
- `webAddress` → `website`
- `telephoneNumber` → `phoneNumber`

### To `Address` (if any address field exists)

- `addressLine1`
- `addressLine2`
- `addressTown`
- `addressCounty`
- `postcode`
- `addressCountry`
  - Defaults to `"United Kingdom"` if null

---

# Unmapped Source Fields

The following fields are intentionally **not migrated**:

| Source Field       | Reason                                        |
| ------------------ | --------------------------------------------- |
| `id`               | Sink uses auto-increment IDs                  |
| `organisationType` | No equivalent in sink schema                  |
| `role`             | No equivalent in sink schema                  |
| `otherPhoneNumber` | No equivalent in sink schema                  |
| `faxNumber`        | No equivalent in sink schema                  |
| `caseReference`    | Used only for filtering                       |
| `sourceSuid`       | Migration metadata only                       |
| `sourceSystem`     | Migration metadata only                       |
| `serviceUserType`  | Used for relationship logic only (not stored) |

---

## Relationship Rules

`serviceUserType` determines how the user is linked to an Appeal:

| Type        | Relationship                |
| ----------- | --------------------------- |
| `Appellant` | `appellant`                 |
| `Applicant` | `appellant`                 |
| `Agent`     | `agent`                     |
| Others      | Not migrated in this ticket |
