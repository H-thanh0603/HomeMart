-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFY');

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "purpose" "TokenPurpose" NOT NULL DEFAULT 'PASSWORD_RESET';
