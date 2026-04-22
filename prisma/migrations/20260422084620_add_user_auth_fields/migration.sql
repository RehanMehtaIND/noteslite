-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "email_verify_expiry" TIMESTAMP(3),
ADD COLUMN     "email_verify_otp" TEXT,
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_method" TEXT DEFAULT 'authenticator';

-- RenameIndex
ALTER INDEX "users_clerk_id_key" RENAME TO "users_google_id_key";
