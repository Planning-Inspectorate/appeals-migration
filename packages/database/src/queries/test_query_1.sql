USE [appeals-migration];
GO

-- View all cases
SELECT * FROM CaseToMigrate;

-- View migration steps
SELECT * FROM MigrationStep;

-- View search parameters
SELECT * FROM ToMigrateParameter;

-- View cases with their migration step details
SELECT 
    c.caseReference,
    c.dataValidated,
    c.documentsValidated,
    ds.complete as DataStepComplete,
    dcs.complete as DocumentsStepComplete,
    vs.complete as ValidationStepComplete
FROM CaseToMigrate c
JOIN MigrationStep ds ON c.dataStepId = ds.id
JOIN MigrationStep dcs ON c.documentsStepId = dcs.id
JOIN MigrationStep vs ON c.validationStepId = vs.id;