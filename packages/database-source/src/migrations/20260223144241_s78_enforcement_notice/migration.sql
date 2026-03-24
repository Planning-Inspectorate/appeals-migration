BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[appeal_s78] ADD [dateAppellantContactedPins] NVARCHAR(max),
[descriptionOfAllegedBreach] NVARCHAR(max),
[enforcementNoticeReference] NVARCHAR(max);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
