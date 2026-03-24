/*
  Warnings:

  - You are about to drop the column `complete` on the `MigrationStep` table. All the data in the column will be lost.
  - You are about to drop the column `inProgress` on the `MigrationStep` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[MigrationStep] DROP CONSTRAINT [MigrationStep_complete_df];
ALTER TABLE [dbo].[MigrationStep] DROP CONSTRAINT [MigrationStep_inProgress_df];

-- AlterTable
ALTER TABLE [dbo].[MigrationStep] DROP COLUMN [complete],
[inProgress];
ALTER TABLE [dbo].[MigrationStep] ADD [completedAt] DATETIME2,
[errorMessage] NVARCHAR(1000),
[invocationId] NVARCHAR(1000),
[startedAt] DATETIME2,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [MigrationStep_status_df] DEFAULT 'waiting';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
