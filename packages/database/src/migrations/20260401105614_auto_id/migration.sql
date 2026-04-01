BEGIN TRY

BEGIN TRAN;

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
    AND OBJECT_NAME(PARENT_OBJECT_ID) = 'ToMigrateParameter'
    AND SCHEMA_NAME(SCHEMA_ID) = 'dbo'
EXEC sp_executesql @SQL
;
CREATE TABLE [dbo].[_prisma_new_ToMigrateParameter] (
    [id] INT NOT NULL IDENTITY(1,1),
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
SET IDENTITY_INSERT [dbo].[_prisma_new_ToMigrateParameter] ON;
IF EXISTS(SELECT * FROM [dbo].[ToMigrateParameter])
    EXEC('INSERT INTO [dbo].[_prisma_new_ToMigrateParameter] ([caseTypeName],[dateReceivedFrom],[dateReceivedTo],[decisionDateFrom],[decisionDateTo],[id],[lpa],[procedureType],[startDateFrom],[startDateTo],[status]) SELECT [caseTypeName],[dateReceivedFrom],[dateReceivedTo],[decisionDateFrom],[decisionDateTo],[id],[lpa],[procedureType],[startDateFrom],[startDateTo],[status] FROM [dbo].[ToMigrateParameter] WITH (holdlock tablockx)');
SET IDENTITY_INSERT [dbo].[_prisma_new_ToMigrateParameter] OFF;
DROP TABLE [dbo].[ToMigrateParameter];
EXEC SP_RENAME N'dbo._prisma_new_ToMigrateParameter', N'ToMigrateParameter';
COMMIT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
