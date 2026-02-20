# Core Appeal Mapping - Implementation Overview

## Summary

This mapper transforms AppealHas source data into the sink Appeal model, handling 25 core fields including basic identification, dates, lookup relations, allocation, status, and complex nested structures.

---

## Field Mappings

### **Basic Identification Fields**

| Source Field           | Sink Field             | Type    | Notes                             |
| ---------------------- | ---------------------- | ------- | --------------------------------- |
| `caseReference`        | `reference`            | string  | **Required** - Primary identifier |
| `submissionId`         | `submissionId`         | string? | UUID linking to draft submission  |
| `applicationReference` | `applicationReference` | string? | LPA application reference         |

### **Core Date Fields**

| Source Field          | Sink Field              | Type    | Transformation |
| --------------------- | ----------------------- | ------- | -------------- |
| `caseCreatedDate`     | `caseCreatedDate`       | Date    | `parseDate()`  |
| `caseUpdatedDate`     | `caseUpdatedDate`       | Date    | `parseDate()`  |
| `caseValidDate`       | `caseValidDate`         | Date?   | `parseDate()`  |
| `caseExtensionDate`   | `caseExtensionDate`     | Date?   | `parseDate()`  |
| `caseStartedDate`     | `caseStartedDate`       | Date?   | `parseDate()`  |
| `casePublishedDate`   | `casePublishedDate`     | Date?   | `parseDate()`  |
| `caseCompletedDate`   | `caseCompletedDate`     | Date?   | `parseDate()`  |
| `caseWithdrawnDate`   | `withdrawalRequestDate` | Date?   | `parseDate()`  |
| `caseTransferredDate` | `caseTransferredId`     | string? | Direct mapping |

### **Lookup Relations**

| Source Field    | Sink Relation   | Lookup Table  | Connection Method                          |
| --------------- | --------------- | ------------- | ------------------------------------------ |
| `caseType`      | `appealType`    | AppealType    | `connect: { key }`                         |
| `caseProcedure` | `procedureType` | ProcedureType | `connect: { key }` (defaults to 'written') |
| `lpaCode`       | `lpa`           | LPA           | `connect: { lpaCode }` **Required**        |

### **User Assignments**

| Source Field    | Sink Relation   | Lookup Table | Connection Method                                                          |
| --------------- | --------------- | ------------ | -------------------------------------------------------------------------- |
| `caseOfficerId` | `caseOfficer`   | User         | `connectOrCreate: { where: { azureAdUserId }, create: { azureAdUserId } }` |
| `inspectorId`   | `inspector`     | User         | `connectOrCreate: { where: { azureAdUserId }, create: { azureAdUserId } }` |
| `padsSapId`     | `padsInspector` | PADSUser     | `connectOrCreate: { where: { sapId }, create: { sapId, name } }`           |

### **Allocation & Status**

| Source Fields                        | Sink Relation  | Structure                                                                                  |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------ |
| `allocationLevel` + `allocationBand` | `allocation`   | `{ create: { level, band } }`                                                              |
| `caseStatus` + `caseUpdatedDate`     | `appealStatus` | `{ create: [{ status, valid: true, createdAt }] }`                                         |
| `caseSpecialisms`                    | `specialisms`  | `{ create: [{ specialism: { connectOrCreate: { where: { name }, create: { name } } } }] }` |

**Notes:**

- `allocationBand` is converted from Decimal to number using `parseNumber()`
- `caseSpecialisms` is parsed from comma-separated string to array
- `appealStatus` uses `caseUpdatedDate` as the `createdAt` timestamp

### **Address Fields**

| Source Field          | Sink Field              | Notes                                         |
| --------------------- | ----------------------- | --------------------------------------------- |
| `siteAddressLine1`    | `address.addressLine1`  | Primary field - required for address creation |
| `siteAddressLine2`    | `address.addressLine2`  | Optional                                      |
| `siteAddressTown`     | `address.addressTown`   | Optional                                      |
| `siteAddressCounty`   | `address.addressCounty` | Optional                                      |
| `siteAddressPostcode` | `address.postcode`      | Optional                                      |

**Note:** Schema requires either grid references OR site address fields. Checking `siteAddressLine1` is sufficient.

### **Appeal Timetable**

| Source Field              | Sink Field                                | Notes |
| ------------------------- | ----------------------------------------- | ----- |
| `lpaQuestionnaireDueDate` | `appealTimetable.lpaQuestionnaireDueDate` | Date  |
| `caseSubmissionDueDate`   | `appealTimetable.caseResubmissionDueDate` | Date  |

**Note:** Timetable is only created if at least one date field has data.

### **Inspector Decision**

| Source Field              | Sink Field                                  | Notes                          |
| ------------------------- | ------------------------------------------- | ------------------------------ |
| `caseDecisionOutcome`     | `inspectorDecision.outcome`                 | Required for decision creation |
| `caseDecisionOutcomeDate` | `inspectorDecision.caseDecisionOutcomeDate` | Date                           |

**Note:** Inspector decision is only created if `caseDecisionOutcome` exists.

### **Complex Relations**

#### Nearby Case References → Appeal Relationships

| Source Field           | Sink Relation  | Type                 |
| ---------------------- | -------------- | -------------------- |
| `nearbyCaseReferences` | `childAppeals` | AppealRelationship[] |

**Transformation:**

- Parses comma-separated string: `"APP/2024/100,APP/2024/101"`
- Creates AppealRelationship records with `type: 'related'`
- Maps current case as `parentRef`, nearby cases as `childRef`

#### Neighbouring Site Addresses → Neighbouring Sites

| Source Field                | Sink Relation       | Type               |
| --------------------------- | ------------------- | ------------------ |
| `neighbouringSiteAddresses` | `neighbouringSites` | NeighbouringSite[] |

**Transformation:**

- Parses comma-separated string: `"125 Main Street,127 Main Street"`
- Creates NeighbouringSite records with nested Address creation
- Each address gets `addressLine1` populated

---

## Helper Functions

### `parseDate(dateString: string | null | undefined): Date | undefined`

Converts ISO date strings to Date objects, returns undefined for invalid dates.

### `parseNumber(value: any): number | undefined`

Handles Prisma Decimal conversion using `.toNumber()`, returns undefined for invalid numbers.

### `stringOrUndefined(value: string | null | undefined): string | undefined`

Converts empty strings to undefined for cleaner data.

### `parseSpecialisms(specialismsString: string | null | undefined): string[]`

Splits comma-separated specialisms string into trimmed array.
**Note:** SQL database doesn't support arrays, so source stores as comma-separated string.

### `parseNearbyCaseReferences(currentCaseRef, nearbyCaseReferences): { create: AppealRelationship[] } | undefined`

Parses nearby case references (string or array) into AppealRelationship create structure.

### `parseNeighbouringSiteAddresses(addressesString): { create: NeighbouringSite[] } | undefined`

Parses comma-separated addresses into NeighbouringSite create structure with nested Address.

---

## Validation Rules

### Required Fields

- `caseReference` - Throws error if missing
- `lpaCode` - Throws error if missing

### Conditional Creation

- **Allocation:** Only created if both `allocationLevel` AND `allocationBand` exist
- **Appeal Timetable:** Only created if at least one date field exists
- **Inspector Decision:** Only created if `caseDecisionOutcome` exists
- **Address:** Only created if `siteAddressLine1` exists
- **User Relations:** Only created if respective ID exists (uses `connectOrCreate`)

---

## Test Coverage

✅ **14 comprehensive unit tests covering:**

- Required field validation
- Basic identification field mapping
- Core date field parsing
- Lookup relation connections
- User assignment with connectOrCreate
- Allocation details with Decimal conversion
- Appeal status with timestamp
- Specialisms parsing from comma-separated string
- Address field mapping
- Appeal timetable creation
- Inspector decision conditional creation
- Nearby case references parsing
- Neighbouring site addresses parsing
- Optional field handling (graceful degradation)

---

## SQL Array Handling

The source SQL database doesn't support native arrays, so several fields are stored as comma-separated strings:

- `caseSpecialisms` → parsed to array
- `nearbyCaseReferences` → parsed to AppealRelationship records
- `neighbouringSiteAddresses` → parsed to NeighbouringSite records

These are transformed into proper relational structures in the sink database.

---

## Implementation Status

✅ **Complete** - All 25 core appeal fields mapped and tested

- Helper functions implemented
- Lookup relations configured
- Complex nested structures handled
- Comprehensive test coverage
- Prisma undefined defaults applied

---

## LPA Questionnaire Mapping

Handled by `buildLpaQuestionnaire(source)`. Returns `undefined` if no questionnaire data is present; otherwise returns a Prisma `{ create: ... }` nested write.

### Field Mappings

| Source Field                                 | Sink Field                                   |
| -------------------------------------------- | -------------------------------------------- |
| `lpaQuestionnaireSubmittedDate`              | `lpaQuestionnaireSubmittedDate`              |
| `lpaQuestionnaireCreatedDate`                | `lpaqCreatedDate`                            |
| `lpaStatement`                               | `lpaStatement`                               |
| `newConditionDetails`                        | `newConditionDetails`                        |
| `siteAccessDetails`                          | `siteAccessDetails`                          |
| `siteSafetyDetails`                          | `siteSafetyDetails`                          |
| `isCorrectAppealType`                        | `isCorrectAppealType`                        |
| `inConservationArea`                         | `inConservationArea`                         |
| `isGreenBelt`                                | `isGreenBelt`                                |
| `affectsScheduledMonument`                   | `affectsScheduledMonument`                   |
| `isAonbNationalLandscape`                    | `isAonbNationalLandscape`                    |
| `hasProtectedSpecies`                        | `hasProtectedSpecies`                        |
| `hasInfrastructureLevy`                      | `hasInfrastructureLevy`                      |
| `isInfrastructureLevyFormallyAdopted`        | `isInfrastructureLevyFormallyAdopted`        |
| `infrastructureLevyAdoptedDate`              | `infrastructureLevyAdoptedDate`              |
| `infrastructureLevyExpectedDate`             | `infrastructureLevyExpectedDate`             |
| `lpaProcedurePreference`                     | `lpaProcedurePreference`                     |
| `lpaProcedurePreferenceDetails`              | `lpaProcedurePreferenceDetails`              |
| `lpaProcedurePreferenceDuration`             | `lpaProcedurePreferenceDuration`             |
| `reasonForNeighbourVisits`                   | `reasonForNeighbourVisits`                   |
| `lpaCostsAppliedFor`                         | `lpaCostsAppliedFor`                         |
| `dateCostsReportDespatched`                  | `dateCostsReportDespatched`                  |
| `dateNotRecoveredOrDerecovered`              | `dateNotRecoveredOrDerecovered`              |
| `dateRecovered`                              | `dateRecovered`                              |
| `originalCaseDecisionDate`                   | `originalCaseDecisionDate`                   |
| `targetDate`                                 | `targetDate`                                 |
| `lpaQuestionnairePublishedDate`              | `siteNoticesSentDate`                        |
| `importantInformation`                       | `importantInformation`                       |
| `redeterminedIndicator`                      | `redeterminedIndicator` ⚠️                   |
| `isSiteInAreaOfSpecialControlAdverts`        | `isSiteInAreaOfSpecialControlAdverts`        |
| `wasApplicationRefusedDueToHighwayOrTraffic` | `wasApplicationRefusedDueToHighwayOrTraffic` |
| `didAppellantSubmitCompletePhotosAndPlans`   | `didAppellantSubmitCompletePhotosAndPlans`   |
| `designatedSitesNames`                       | `designatedSiteNameCustom`                   |
| `lpaQuestionnaireValidationOutcome`          | `lpaQuestionnaireValidationOutcome`          |
| `notificationMethod`                         | `lpaNotificationMethods`                     |
| `affectedListedBuildingNumbers`              | `listedBuildingDetails`                      |

### Conditional Creation

- The entire questionnaire is skipped (`undefined`) if none of the above fields contain data.
- `lpaqCreatedDate` is only included in the create payload if it has a value.
- `lpaQuestionnaireValidationOutcome`, `lpaNotificationMethods`, and `listedBuildingDetails` are spread in conditionally.

### ⚠️ Source Schema Divergence: `redeterminedIndicator`

This field has different types across the two source tables:

| Table        | Prisma Type |
| ------------ | ----------- |
| `appeal_has` | `Boolean?`  |
| `appeal_s78` | `String?`   |

The sink expects `String?`. To satisfy this, the mapper applies `String(value)` when the value is non-null, normalising both source types:

- `appeal_has`: `true` → `"true"`, `false` → `"false"`
- `appeal_s78`: passed through as-is
