-- AlterTable: add content column to ProjectFile
ALTER TABLE "ProjectFile" ADD COLUMN "content" TEXT;

-- CreateIndex: unique constraint on [projectId, filePath]
CREATE UNIQUE INDEX "ProjectFile_projectId_filePath_key" ON "ProjectFile"("projectId", "filePath");
