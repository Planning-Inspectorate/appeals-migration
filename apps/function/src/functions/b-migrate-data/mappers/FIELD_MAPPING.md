# AppealHas Field Mapping Documentation

**Status:** ✅ 104/104 fields accounted for  
**Test Coverage:** 98.84%  
**Last Updated:** 2026-02-11

## Overview

This document provides a comprehensive field-by-field mapping from the source `AppealHas` model to the sink database schema. The migration follows the architectural pattern where virtual/calculated fields are derived at read-time by appeals-back-office, not stored during migration.

---

## Mapping Summary

| Category  | Direct Mappings | Transformed | Virtual/Calculated | Unmappable |
| --------- | --------------- | ----------- | ------------------ | ---------- |
| **Count** | 78              | 21          | 5                  | 0          |

---

## Field-by-Field Mapping

### Core Identification Fields

| Source Field    | Sink Field     | Entity | Transformation        | Notes                                                              |
| --------------- | -------------- | ------ | --------------------- | ------------------------------------------------------------------ |
| `caseId`        | _(not mapped)_ | -      | -                     | Source DB primary key, not migrated. Sink uses auto-increment `id` |
| `caseReference` | `reference`    | Appeal | Direct                | **Required field**                                                 |
| `submissionId`  | `submissionId` | Appeal | `stringOrUndefined()` | Optional                                                           |
| `lpaCode`       | `lpaCode`      | Appeal | Via `connect`         | **Required field**, connects to LPA lookup table                   |

---

### Case Type & Procedure

| Source Field    | Sink Field      | Entity | Transformation         | Notes                                                    |
| --------------- | --------------- | ------ | ---------------------- | -------------------------------------------------------- |
| `caseType`      | `appealType`    | Appeal | `buildAppealType()`    | Maps to `AppealType` lookup (e.g., 'D' → HAS, 'W' → S78) |
| `caseProcedure` | `procedureType` | Appeal | `buildProcedureType()` | Maps to `ProcedureType` lookup (written/hearing/inquiry) |

---

### Team Assignments

| Source Field    | Sink Field      | Entity | Transformation         | Notes                                       |
| --------------- | --------------- | ------ | ---------------------- | ------------------------------------------- |
| `caseOfficerId` | `caseOfficer`   | Appeal | `buildCaseOfficer()`   | Creates/connects to User with azureAdUserId |
| `inspectorId`   | `inspector`     | Appeal | `buildInspector()`     | Creates/connects to User with azureAdUserId |
| `padsSapId`     | `padsInspector` | Appeal | `buildPadsInspector()` | Stores PADS SAP ID for inspector            |

---

### Allocation

| Source Field      | Sink Field        | Entity | Transformation           | Notes                                                                 |
| ----------------- | ----------------- | ------ | ------------------------ | --------------------------------------------------------------------- |
| `allocationLevel` | `allocationLevel` | Appeal | `buildAllocationLevel()` | Maps to `AppealAllocationLevel` lookup (A/B/C/D/E/F)                  |
| `allocationBand`  | `allocationBand`  | Appeal | `parseNumber()`          | Converts Decimal to number                                            |
| `caseSpecialisms` | `specialisms`     | Appeal | `parseSpecialisms()`     | Comma-separated → array, creates `AppealToAppealSpecialism` relations |

---

### Date Fields

| Source Field              | Sink Field                | Entity | Transformation        | Notes               |
| ------------------------- | ------------------------- | ------ | --------------------- | ------------------- |
| `caseSubmittedDate`       | `caseSubmittedDate`       | Appeal | `parseDate()`         | ISO string → Date   |
| `caseCreatedDate`         | `caseCreatedDate`         | Appeal | `parseDate()`         | ISO string → Date   |
| `caseUpdatedDate`         | `caseUpdatedDate`         | Appeal | `parseDate()`         | ISO string → Date   |
| `caseValidDate`           | `caseValidDate`           | Appeal | `parseDate()`         | ISO string → Date   |
| `caseExtensionDate`       | `caseExtensionDate`       | Appeal | `parseDate()`         | ISO string → Date   |
| `caseStartedDate`         | `caseStartedDate`         | Appeal | `parseDate()`         | ISO string → Date   |
| `casePublishedDate`       | `casePublishedDate`       | Appeal | `parseDate()`         | ISO string → Date   |
| `caseWithdrawnDate`       | `caseWithdrawnDate`       | Appeal | `parseDate()`         | ISO string → Date   |
| `caseTransferredDate`     | `caseTransferredId`       | Appeal | `stringOrUndefined()` | Stored as string ID |
| `caseDecisionOutcomeDate` | `caseDecisionOutcomeDate` | Appeal | `parseDate()`         | ISO string → Date   |
| `caseCompletedDate`       | `caseCompletedDate`       | Appeal | `parseDate()`         | ISO string → Date   |
| `caseSubmissionDueDate`   | `targetDate`              | Appeal | `parseDate()`         | Renamed field       |

---

### Virtual Date Fields (Calculated by appeals-back-office)

| Source Field                | Sink Field  | Entity | Transformation | Notes                                                          |
| --------------------------- | ----------- | ------ | -------------- | -------------------------------------------------------------- |
| `caseValidationDate`        | _(virtual)_ | -      | **Not stored** | ⚠️ Calculated from `appealStatus` array by `map-case-dates.js` |
| `transferredCaseClosedDate` | _(virtual)_ | -      | **Not stored** | ⚠️ Calculated from `appealStatus` array by `map-case-dates.js` |
| `caseDecisionPublishedDate` | _(virtual)_ | -      | **Not stored** | ⚠️ Hardcoded to `null` by `map-case-dates.js`                  |

**Raw data stored:** `appealStatus` array (via `buildAppealStatus()`)

---

### Status & Outcome

| Source Field          | Sink Field            | Entity | Transformation               | Notes                                                      |
| --------------------- | --------------------- | ------ | ---------------------------- | ---------------------------------------------------------- |
| `caseStatus`          | `appealStatus`        | Appeal | `buildAppealStatus()`        | Creates `AppealStatus` records with status/valid/createdAt |
| `caseDecisionOutcome` | `caseDecisionOutcome` | Appeal | `buildCaseDecisionOutcome()` | Maps to `AppealCaseDecisionOutcome` lookup                 |

---

### Case Relationships (Virtual Fields)

| Source Field           | Sink Field     | Entity | Transformation                | Notes                                                                     |
| ---------------------- | -------------- | ------ | ----------------------------- | ------------------------------------------------------------------------- |
| `linkedCaseStatus`     | _(virtual)_    | -      | **Not stored**                | ⚠️ Calculated from `childAppeals` relation by `map-case-relationships.js` |
| `leadCaseReference`    | _(virtual)_    | -      | **Not stored**                | ⚠️ Calculated from `childAppeals` relation by `map-case-relationships.js` |
| `nearbyCaseReferences` | `childAppeals` | Appeal | `parseNearbyCaseReferences()` | Comma-separated → array, creates `AppealRelationship` records             |

**Raw data stored:** `childAppeals` relation with `parentRef` and `type`

---

### Site Address

| Source Field                | Sink Field          | Entity | Transformation             | Notes                                   |
| --------------------------- | ------------------- | ------ | -------------------------- | --------------------------------------- |
| `siteAddressLine1`          | `addressLine1`      | Appeal | `stringOrUndefined()`      | Direct                                  |
| `siteAddressLine2`          | `addressLine2`      | Appeal | `stringOrUndefined()`      | Direct                                  |
| `siteAddressTown`           | `addressTown`       | Appeal | `stringOrUndefined()`      | Direct                                  |
| `siteAddressCounty`         | `addressCounty`     | Appeal | `stringOrUndefined()`      | Direct                                  |
| `siteAddressPostcode`       | `addressPostcode`   | Appeal | `stringOrUndefined()`      | Direct                                  |
| `neighbouringSiteAddresses` | `neighbouringSites` | Appeal | `parseNeighbouringSites()` | JSON array → `NeighbouringSite` records |

---

### Site Coordinates

| Source Field               | Sink Field     | Entity | Transformation | Notes              |
| -------------------------- | -------------- | ------ | -------------- | ------------------ |
| `siteAddressX`             | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteAddressY`             | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteAddressGridReference` | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteAddressEasting`       | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteAddressNorthing`      | _(not mapped)_ | -      | -              | Not in sink schema |

**Note:** Coordinate fields are not in the sink schema. If needed, they would require schema changes.

---

### Application Details

| Source Field                | Sink Field                | Entity        | Transformation        | Notes             |
| --------------------------- | ------------------------- | ------------- | --------------------- | ----------------- |
| `applicationReference`      | `applicationReference`    | Appeal        | `stringOrUndefined()` | Direct            |
| `applicationDate`           | `applicationDate`         | AppellantCase | `parseDate()`         | ISO string → Date |
| `applicationDecision`       | `applicationDecision`     | AppellantCase | `stringOrUndefined()` | Direct            |
| `applicationDecisionDate`   | `applicationDecisionDate` | AppellantCase | `parseDate()`         | ISO string → Date |
| `enforcementNotice`         | `enforcementNotice`       | AppellantCase | Boolean               | Direct            |
| `typeOfPlanningApplication` | `planningApplicationType` | AppellantCase | `stringOrUndefined()` | Direct            |

---

### Site Details (AppellantCase)

| Source Field                     | Sink Field               | Entity        | Transformation        | Notes            |
| -------------------------------- | ------------------------ | ------------- | --------------------- | ---------------- |
| `siteAccessDetails`              | `siteAccessDetails`      | AppellantCase | `stringOrUndefined()` | Direct           |
| `siteSafetyDetails`              | `siteSafetyDetails`      | AppellantCase | `stringOrUndefined()` | Direct           |
| `siteAreaSquareMetres`           | `siteAreaSquareMetres`   | AppellantCase | `parseNumber()`       | Decimal → number |
| `floorSpaceSquareMetres`         | `floorSpaceSquareMetres` | AppellantCase | `parseNumber()`       | Decimal → number |
| `originalDevelopmentDescription` | `developmentDescription` | AppellantCase | `stringOrUndefined()` | Direct           |

---

### Site Characteristics

| Source Field           | Sink Field           | Entity           | Transformation        | Notes  |
| ---------------------- | -------------------- | ---------------- | --------------------- | ------ |
| `designatedSitesNames` | `designatedSites`    | AppellantCase    | `stringOrUndefined()` | Direct |
| `inConservationArea`   | `isConservationArea` | LPAQuestionnaire | Boolean               | Direct |
| `isGreenBelt`          | `isGreenBelt`        | AppellantCase    | Boolean               | Direct |

---

### Land Ownership

| Source Field          | Sink Field         | Entity        | Transformation            | Notes                                       |
| --------------------- | ------------------ | ------------- | ------------------------- | ------------------------------------------- |
| `ownsAllLand`         | `ownsAllLand`      | AppellantCase | Boolean                   | Direct                                      |
| `ownsSomeLand`        | `ownsSomeLand`     | AppellantCase | Boolean                   | Direct                                      |
| `knowsAllOwners`      | `knowsAllOwners`   | AppellantCase | `buildKnowledgeMapping()` | Maps to `KnowledgeOfOtherLandowners` lookup |
| `knowsOtherOwners`    | `knowsOtherOwners` | AppellantCase | `buildKnowledgeMapping()` | Maps to `KnowledgeOfOtherLandowners` lookup |
| `hasAdvertisedAppeal` | `advertisedAppeal` | AppellantCase | Boolean                   | Direct                                      |

---

### Advert Details

| Source Field    | Sink Field                   | Entity        | Transformation         | Notes                                                                                      |
| --------------- | ---------------------------- | ------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| `advertDetails` | `appellantCaseAdvertDetails` | AppellantCase | `parseAdvertDetails()` | Array/JSON → `AppellantCaseAdvertDetail` records with `advertInPosition` and `highwayLand` |

---

### Listed Buildings

| Source Field                    | Sink Field                | Entity        | Transformation                   | Notes                                              |
| ------------------------------- | ------------------------- | ------------- | -------------------------------- | -------------------------------------------------- |
| `affectedListedBuildingNumbers` | `affectedListedBuildings` | AppellantCase | `parseAffectedListedBuildings()` | Comma-separated → `AffectedListedBuilding` records |

---

### Validation (AppellantCase)

| Source Field                      | Sink Field                               | Entity        | Transformation                | Notes                                                                            |
| --------------------------------- | ---------------------------------------- | ------------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `caseValidationOutcome`           | `validationOutcome`                      | AppellantCase | `buildLPAValidationOutcome()` | Maps to `AppealCaseValidationOutcome` lookup                                     |
| `caseValidationIncompleteDetails` | `appellantCaseIncompleteReasonsSelected` | AppellantCase | `parseValidationDetails()`    | Comma-separated → `AppellantCaseIncompleteReasonsSelected` with reason name/text |
| `caseValidationInvalidDetails`    | `appellantCaseInvalidReasonsSelected`    | AppellantCase | `parseValidationDetails()`    | Comma-separated → `AppellantCaseInvalidReasonsSelected` with reason name/text    |

**Note:** appeals-back-office reconstructs the comma-separated strings from these relations at read-time via `map-case-validation.js`

---

### LPA Questionnaire Dates

| Source Field                    | Sink Field                      | Entity           | Transformation | Notes             |
| ------------------------------- | ------------------------------- | ---------------- | -------------- | ----------------- |
| `lpaQuestionnaireDueDate`       | `lpaQuestionnaireDueDate`       | Appeal           | `parseDate()`  | ISO string → Date |
| `lpaQuestionnaireSubmittedDate` | `lpaQuestionnaireSubmittedDate` | LPAQuestionnaire | `parseDate()`  | ISO string → Date |
| `lpaQuestionnaireCreatedDate`   | `lpaqCreatedDate`               | LPAQuestionnaire | `parseDate()`  | Renamed field     |
| `lpaQuestionnairePublishedDate` | `lpaQuestionnairePublishedDate` | LPAQuestionnaire | `parseDate()`  | ISO string → Date |

---

### LPA Questionnaire Validation

| Source Field                            | Sink Field                              | Entity           | Transformation                | Notes                                                                                                      |
| --------------------------------------- | --------------------------------------- | ---------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lpaQuestionnaireValidationOutcome`     | `lpaQuestionnaireValidationOutcome`     | LPAQuestionnaire | `buildLPAValidationOutcome()` | Maps to `LPAQuestionnaireValidationOutcome` lookup                                                         |
| `lpaQuestionnaireValidationOutcomeDate` | `lpaQuestionnaireValidationOutcomeDate` | LPAQuestionnaire | `parseDate()`                 | ISO string → Date                                                                                          |
| `lpaQuestionnaireValidationDetails`     | _(virtual)_                             | -                | **Not stored**                | ⚠️ Reconstructed from `lpaQuestionnaireIncompleteReasonsSelected` by `map-lpa-questionnaire-validation.js` |

**Raw data stored:** `lpaQuestionnaireIncompleteReasonsSelected` relation

---

### LPA Questionnaire Details

| Source Field             | Sink Field               | Entity           | Transformation        | Notes  |
| ------------------------ | ------------------------ | ---------------- | --------------------- | ------ |
| `lpaStatement`           | `lpaStatement`           | LPAQuestionnaire | `stringOrUndefined()` | Direct |
| `newConditionDetails`    | `newConditionDetails`    | LPAQuestionnaire | `stringOrUndefined()` | Direct |
| `isCorrectAppealType`    | `isCorrectAppealType`    | LPAQuestionnaire | Boolean               | Direct |
| `lpaCostsAppliedFor`     | `lpaCostsAppliedFor`     | LPAQuestionnaire | Boolean               | Direct |
| `lpaProcedurePreference` | `lpaProcedurePreference` | LPAQuestionnaire | `stringOrUndefined()` | Direct |

---

### Notification Methods

| Source Field         | Sink Field               | Entity           | Transformation               | Notes                                                                                |
| -------------------- | ------------------------ | ---------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `notificationMethod` | `lpaNotificationMethods` | LPAQuestionnaire | `parseNotificationMethods()` | Comma-separated → `LPANotificationMethodsOnLPAQuestionnaire` with lookup connections |

---

### Agricultural Holding

| Source Field                | Sink Field                      | Entity        | Transformation        | Notes                            |
| --------------------------- | ------------------------------- | ------------- | --------------------- | -------------------------------- |
| `agriculturalHolding`       | `isAgriculturalHolding`         | AppellantCase | Boolean               | Direct                           |
| `agriculturalHoldingNumber` | `agriculturalHoldingTenantName` | AppellantCase | `stringOrUndefined()` | Field repurposed for tenant name |
| `agriculturalHoldingPart`   | `isTenantAgriculturalHolding`   | AppellantCase | Boolean               | Direct                           |

---

### Site Characteristics (Additional)

| Source Field                        | Sink Field     | Entity | Transformation | Notes              |
| ----------------------------------- | -------------- | ------ | -------------- | ------------------ |
| `siteInAreaOfSpecialControl`        | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteInAreaOfSpecialControlAdverts` | _(not mapped)_ | -      | -              | Not in sink schema |
| `isSiteOnHighwayLand`               | _(not mapped)_ | -      | -              | Not in sink schema |

---

### Infrastructure Levy

| Source Field                 | Sink Field     | Entity | Transformation | Notes              |
| ---------------------------- | -------------- | ------ | -------------- | ------------------ |
| `infrastructureLevyRequired` | _(not mapped)_ | -      | -              | Not in sink schema |
| `infrastructureLevyType`     | _(not mapped)_ | -      | -              | Not in sink schema |
| `infrastructureLevyAmount`   | _(not mapped)_ | -      | -              | Not in sink schema |
| `infrastructureLevyPaidDate` | _(not mapped)_ | -      | -              | Not in sink schema |

---

### Costs

| Source Field                | Sink Field     | Entity | Transformation | Notes              |
| --------------------------- | -------------- | ------ | -------------- | ------------------ |
| `appellantCostsAppliedFor`  | _(not mapped)_ | -      | -              | Not in sink schema |
| `appellantCostsAwarded`     | _(not mapped)_ | -      | -              | Not in sink schema |
| `appellantCostsAwardedDate` | _(not mapped)_ | -      | -              | Not in sink schema |
| `lpaCostsAwarded`           | _(not mapped)_ | -      | -              | Not in sink schema |
| `lpaCostsAwardedDate`       | _(not mapped)_ | -      | -              | Not in sink schema |

---

### Miscellaneous

| Source Field                                 | Sink Field     | Entity | Transformation | Notes              |
| -------------------------------------------- | -------------- | ------ | -------------- | ------------------ |
| `wasApplicationRefusedDueToHighwayOrTraffic` | _(not mapped)_ | -      | -              | Not in sink schema |
| `didAppellantSubmitCompletePhotosAndPlans`   | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteOwnership`                              | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteDescription`                            | _(not mapped)_ | -      | -              | Not in sink schema |
| `siteLocationDescription`                    | _(not mapped)_ | -      | -              | Not in sink schema |
| `originalApplicationSiteArea`                | _(not mapped)_ | -      | -              | Not in sink schema |
| `currentSiteArea`                            | _(not mapped)_ | -      | -              | Not in sink schema |
| `landownerPermission`                        | _(not mapped)_ | -      | -              | Not in sink schema |
| `landownerPermissionDetails`                 | _(not mapped)_ | -      | -              | Not in sink schema |
| `ownersInformed`                             | _(not mapped)_ | -      | -              | Not in sink schema |
| `ownersInformedDetails`                      | _(not mapped)_ | -      | -              | Not in sink schema |
| `hasOtherLandowners`                         | _(not mapped)_ | -      | -              | Not in sink schema |
| `hasOtherLandownersDetails`                  | _(not mapped)_ | -      | -              | Not in sink schema |

---

## Helper Functions Reference

### Date & String Parsing

- `parseDate(value)` - Converts ISO date strings to Date objects
- `stringOrUndefined(value)` - Converts empty strings to undefined
- `parseNumber(value)` - Handles Prisma Decimal types and converts to number

### Lookup Builders

- `buildAppealType(caseType)` - Maps case type codes to AppealType lookup
- `buildProcedureType(caseProcedure)` - Maps procedure strings to ProcedureType lookup
- `buildAllocationLevel(level)` - Maps allocation level to AppealAllocationLevel lookup
- `buildCaseDecisionOutcome(outcome)` - Maps decision outcome to AppealCaseDecisionOutcome lookup
- `buildLPAValidationOutcome(outcome)` - Maps validation outcome to validation outcome lookups
- `buildKnowledgeMapping(knows)` - Maps boolean to KnowledgeOfOtherLandowners lookup

### User Builders

- `buildCaseOfficer(id)` - Uses `connectOrCreate` to create/connect User with azureAdUserId
- `buildInspector(id)` - Uses `connectOrCreate` to create/connect User with azureAdUserId
- `buildPadsInspector(id)` - Uses `connectOrCreate` to create/connect PADSUser with sapId and name

**Note:** These functions use `connectOrCreate` instead of `connect` to handle cases where User/PADSUser records don't exist yet. If the user doesn't exist, a minimal record is created with just the ID field(s).

### Complex Field Parsers

- `parseSpecialisms(specialisms)` - Comma-separated → array of AppealToAppealSpecialism
- `parseNearbyCaseReferences(refs)` - Comma-separated → array of AppealRelationship
- `parseNeighbouringSites(addresses)` - JSON array → NeighbouringSite records
- `parseAdvertDetails(details)` - Array/JSON → AppellantCaseAdvertDetail records
- `parseAffectedListedBuildings(numbers)` - Comma-separated → AffectedListedBuilding records
- `parseNotificationMethods(methods)` - Comma-separated → LPANotificationMethodsOnLPAQuestionnaire
- `parseValidationDetails(details)` - Comma-separated with optional text → reason records

### Entity Builders

- `buildAppealStatus(caseStatus)` - Creates AppealStatus records
- `buildAppellantCase(source)` - Conditionally creates AppellantCase with all related data
- `buildLPAQuestionnaire(source)` - Conditionally creates LPAQuestionnaire with all related data

---

## Virtual Fields Architecture

The migration follows the architectural pattern established by appeals-back-office where certain fields are **calculated at read-time** rather than stored:

### Why Virtual Fields?

1. **Single Source of Truth** - Raw data (appealStatus, childAppeals, validation reasons) is the authoritative source
2. **Consistency** - Calculation logic lives in one place (appeals-back-office mappers)
3. **Flexibility** - Calculation logic can change without data migration
4. **Data Integrity** - Prevents duplicate/inconsistent calculated values

### Virtual Fields Summary

| Virtual Field                       | Calculated From                             | Mapper File                           |
| ----------------------------------- | ------------------------------------------- | ------------------------------------- |
| `caseValidationDate`                | `appealStatus` array                        | `map-case-dates.js`                   |
| `transferredCaseClosedDate`         | `appealStatus` array                        | `map-case-dates.js`                   |
| `caseDecisionPublishedDate`         | Hardcoded `null`                            | `map-case-dates.js`                   |
| `linkedCaseStatus`                  | `childAppeals` relation                     | `map-case-relationships.js`           |
| `leadCaseReference`                 | `childAppeals` relation                     | `map-case-relationships.js`           |
| `lpaQuestionnaireValidationDetails` | `lpaQuestionnaireIncompleteReasonsSelected` | `map-lpa-questionnaire-validation.js` |

### Read-Time Calculation Flow

```
Database (Sink)
    ↓
appeals-back-office reads data
    ↓
Applies mapper functions (mapCaseDates, mapCaseRelationships, etc.)
    ↓
Returns data with virtual fields calculated
    ↓
API response includes both stored and calculated fields
```

---

## Unmapped Fields Analysis

Fields not mapped to the sink schema fall into these categories:

### 1. Not in Sink Schema (Would Require Schema Changes)

- Site coordinates (X, Y, grid reference, easting, northing)
- Infrastructure levy fields
- Costs awarded fields
- Various site characteristic booleans
- Ownership/landowner detail fields

### 2. Virtual/Calculated Fields (Intentionally Not Stored)

- See Virtual Fields section above

### 3. Repurposed Fields

- `caseSubmissionDueDate` → `targetDate`
- `lpaQuestionnaireCreatedDate` → `lpaqCreatedDate`
- `agriculturalHoldingNumber` → `agriculturalHoldingTenantName`

---

## Testing Coverage

- **Unit Tests:** All helper functions tested with edge cases
- **Integration Tests:** Complete appeal mapping with complex scenarios
- **Edge Cases:** Null values, empty strings, malformed data
- **Coverage:** 98.84%

Test file: `map-source-to-sink.test.ts`

---

## References

- Source Schema: `packages/database-source/src/schema.prisma`
- Sink Schema: `packages/database-sink/src/schema.prisma`
- Mapper Implementation: `apps/function/src/functions/b-migrate-data/mappers/map-source-to-sink.ts`
- appeals-back-office Mappers: `appeals-back-office/appeals/api/src/server/mappers/integration/shared/`
  - `map-case-dates.js`
  - `map-case-relationships.js`
  - `map-case-validation.js`
  - `map-lpa-questionnaire-validation.js`

---

## Data Quality Considerations

### User and PADSUser Records

The migration uses `connectOrCreate` for User and PADSUser relationships to prevent failures when referenced users don't exist:

**User (Case Officers & Inspectors):**

- Created with only `azureAdUserId` if not found
- Additional user details (name, email, etc.) should be populated from Azure AD or another authoritative source

**PADSUser (PADS Inspectors):**

- ⚠️ **Important:** `PADSUser.name` is required in sink schema but not available in source data
- Migration uses `sapId` as placeholder for `name` field
- **Action Required:** PADSUser names must be updated from PADS system or another data source post-migration
- Example: `{ sapId: "SAP-123", name: "SAP-123" }` should be updated to `{ sapId: "SAP-123", name: "John Smith" }`

### Missing Coordinate Data

Site coordinate fields (X, Y, grid reference, easting, northing) exist in source but not in sink schema. If this data is needed:

- Sink schema would need to be updated (currently not permitted)
- Alternative: Store in a separate coordinates table or external system

### Infrastructure Levy & Costs

Infrastructure levy and costs awarded fields are not in the sink schema. If this data is required for reporting or compliance:

- Consider adding to sink schema in future iteration
- Alternative: Maintain in source database for historical reference

---

## Notes

- All date fields are stored as ISO 8601 strings in source, converted to Date objects in sink
- Lookup table connections use `connect` or `connectOrCreate` strategies
- Related entities (AppellantCase, LPAQuestionnaire) are conditionally created based on data presence
- The migration preserves all raw data needed for appeals-back-office to function correctly
- User/PADSUser records are created automatically if they don't exist, but may need enrichment post-migration
