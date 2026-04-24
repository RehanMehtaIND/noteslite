-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_mode" TEXT DEFAULT 'initials',
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "display_name" TEXT,
ADD COLUMN     "show_email" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "quick_notes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quick_notes_user_id_idx" ON "quick_notes"("user_id");

-- AddForeignKey
ALTER TABLE "quick_notes" ADD CONSTRAINT "quick_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
