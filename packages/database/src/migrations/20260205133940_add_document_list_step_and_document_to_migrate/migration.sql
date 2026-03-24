/*
  Warnings:

  - A unique constraint covering the columns `[documentListStepId]` on the table `CaseToMigrate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `documentListStepId` to the `CaseToMigrate` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[CaseToMigrate] ADD [documentListStepId] INT NOT NULL;

-- CreateTable
CREATE TABLE [dbo].[DocumentToMigrate] (
    [documentId] NVARCHAR(1000) NOT NULL,
    [caseReference] NVARCHAR(1000) NOT NULL,
    [migrationStepId] INT NOT NULL,
    CONSTRAINT [DocumentToMigrate_pkey] PRIMARY KEY CLUSTERED ([documentId]),
    CONSTRAINT [DocumentToMigrate_migrationStepId_key] UNIQUE NONCLUSTERED ([migrationStepId])
);

-- CreateIndex
ALTER TABLE [dbo].[CaseToMigrate] ADD CONSTRAINT [CaseToMigrate_documentListStepId_key] UNIQUE NONCLUSTERED ([documentListStepId]);

-- AddForeignKey
ALTER TABLE [dbo].[CaseToMigrate] ADD CONSTRAINT [CaseToMigrate_documentListStepId_fkey] FOREIGN KEY ([documentListStepId]) REFERENCES [dbo].[MigrationStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentToMigrate] ADD CONSTRAINT [DocumentToMigrate_migrationStepId_fkey] FOREIGN KEY ([migrationStepId]) REFERENCES [dbo].[MigrationStep]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
