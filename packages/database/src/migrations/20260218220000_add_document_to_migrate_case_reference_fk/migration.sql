BEGIN TRY

BEGIN TRAN;

-- AddForeignKey
ALTER TABLE [dbo].[DocumentToMigrate] ADD CONSTRAINT [DocumentToMigrate_caseReference_fkey] FOREIGN KEY ([caseReference]) REFERENCES [dbo].[CaseToMigrate]([caseReference]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
