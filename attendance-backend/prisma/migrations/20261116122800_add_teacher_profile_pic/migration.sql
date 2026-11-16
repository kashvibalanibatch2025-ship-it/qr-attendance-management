/*
  Warnings:

  - You are about to drop the column `department` on the `Teacher` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AttendanceSession" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "Lecture" ADD COLUMN     "isTemporary" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "section" TEXT;

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "department",
ADD COLUMN     "profilePic" TEXT,
ADD COLUMN     "subjects" TEXT[];
