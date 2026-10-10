-- DropIndex
DROP INDEX "Chunk_documentId_index_key";

-- DropIndex
DROP INDEX "Chunk_embedding_idx";

-- CreateIndex
CREATE INDEX "Chunk_documentId_idx" ON "Chunk"("documentId");
