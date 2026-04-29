BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[MigrationSchedule] (
    [id] INT NOT NULL IDENTITY(1,1),
    [startDayIndex] INT NOT NULL,
    [startTime] NVARCHAR(1000) NOT NULL,
    [endDayIndex] INT NOT NULL,
    [endTime] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [MigrationSchedule_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [MigrationSchedule_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
