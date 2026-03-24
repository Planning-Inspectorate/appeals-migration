BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ToMigrateParameter] (
    [id] INT NOT NULL,
    [caseTypeName] NVARCHAR(1000),
    [dateReceivedFrom] DATETIME2,
    [dateReceivedTo] DATETIME2,
    [decisionDateFrom] DATETIME2,
    [decisionDateTo] DATETIME2,
    [lpa] NVARCHAR(1000),
    [procedureType] NVARCHAR(1000),
    [startDateFrom] DATETIME2,
    [startDateTo] DATETIME2,
    [status] NVARCHAR(1000),
    CONSTRAINT [ToMigrateParameter_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[CaseToMigrate] (
    [caseReference] NVARCHAR(1000) NOT NULL,
    [dataStepId] INT NOT NULL,
    [documentsStepId] INT NOT NULL,
    [validationStepId] INT NOT NULL,
    [dataValidated] BIT,
    [documentsValidated] BIT,
    CONSTRAINT [CaseToMigrate_pkey] PRIMARY KEY CLUSTERED ([caseReference]),
    CONSTRAINT [CaseToMigrate_dataStepId_key] UNIQUE NONCLUSTERED ([dataStepId]),
    CONSTRAINT [CaseToMigrate_documentsStepId_key] UNIQUE NONCLUSTERED ([documentsStepId]),
    CONSTRAINT [CaseToMigrate_validationStepId_key] UNIQUE NONCLUSTERED ([validationStepId])
);

-- CreateTable
CREATE TABLE [dbo].[MigrationStep] (
    [id] INT NOT NULL,
    [inProgress] BIT NOT NULL CONSTRAINT [MigrationStep_inProgress_df] DEFAULT 0,
    [complete] BIT NOT NULL CONSTRAINT [MigrationStep_complete_df] DEFAULT 0,
    CONSTRAINT [MigrationStep_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[CaseToMigrate] ADD CONSTRAINT [CaseToMigrate_dataStepId_fkey] FOREIGN KEY ([dataStepId]) REFERENCES [dbo].[MigrationStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseToMigrate] ADD CONSTRAINT [CaseToMigrate_documentsStepId_fkey] FOREIGN KEY ([documentsStepId]) REFERENCES [dbo].[MigrationStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CaseToMigrate] ADD CONSTRAINT [CaseToMigrate_validationStepId_fkey] FOREIGN KEY ([validationStepId]) REFERENCES [dbo].[MigrationStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
