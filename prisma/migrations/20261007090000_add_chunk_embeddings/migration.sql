-- pgvector is enabled by the previous migration (enable_pgvector)

-- AlterTable
ALTER TABLE "Chunk" ADD COLUMN "embedding" vector(1536);

-- HNSW index for cosine-similarity search over chunk embeddings
CREATE INDEX "Chunk_embedding_idx" ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);
