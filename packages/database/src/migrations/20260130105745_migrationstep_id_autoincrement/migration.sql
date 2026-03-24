BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[CaseToMigrate] DROP CONSTRAINT [CaseToMigrate_dataStepId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[CaseToMigrate] DROP CONSTRAINT [CaseToMigrate_documentsStepId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[CaseToMigrate] DROP CONSTRAINT [CaseToMigrate_validationStepId_fkey];

-- RedefineTables
BEGIN TRANSACTION;
DECLARE @SQL NVARCHAR(MAX) = N''
SELECT @SQL += N'ALTER TABLE '
    + QUOTENAME(OBJECT_SCHEMA_NAME(PARENT_OBJECT_ID))
    + '.'
    + QUOTENAME(OBJECT_NAME(PARENT_OBJECT_ID))
    + ' DROP CONSTRAINT '
    + OBJECT_NAME(OBJECT_ID) + ';'
FROM SYS.OBJECTS
WHERE TYPE_DESC LIKE '%CONSTRAINT'
    AND OBJECT_NAME(PARENT_OBJECT_ID) = 'MigrationStep'
    AND SCHEMA_NAME(SCHEMA_ID) = 'dbo'
EXEC sp_executesql @SQL
;
CREATE TABLE [dbo].[_prisma_new_MigrationStep] (
    [id] INT NOT NULL IDENTITY(1,1),
    [inProgress] BIT NOT NULL CONSTRAINT [MigrationStep_inProgress_df] DEFAULT 0,
    [complete] BIT NOT NULL CONSTRAINT [MigrationStep_complete_df] DEFAULT 0,
    CONSTRAINT [MigrationStep_pkey] PRIMARY KEY CLUSTERED ([id])
);
SET IDENTITY_INSERT [dbo].[_prisma_new_MigrationStep] ON;
IF EXISTS(SELECT * FROM [dbo].[MigrationStep])
    EXEC('INSERT INTO [dbo].[_prisma_new_MigrationStep] ([complete],[id],[inProgress]) SELECT [complete],[id],[inProgress] FROM [dbo].[MigrationStep] WITH (holdlock tablockx)');
SET IDENTITY_INSERT [dbo].[_prisma_new_MigrationStep] OFF;
DROP TABLE [dbo].[MigrationStep];
EXEC SP_RENAME N'dbo._prisma_new_MigrationStep', N'MigrationStep';
COMMIT;

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
