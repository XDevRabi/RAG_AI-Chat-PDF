import { Worker } from "bullmq";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import dotenv from "dotenv";

dotenv.config();

const worker = new Worker(
  "file-upload-queue",
  async (job) => {
    try {
      console.log(`🔄 Processing job:`, job.data);
      const data = JSON.parse(job.data);
      /*
    Path: data.path
    read the pdf from path,
    chunk the pdf,
    call the openai embedding model for every chunk,
    store the chunk in qdrant db
    */

      // Load the PDF
      console.log(`📄 Loading PDF from: ${data.path}`);
      const loader = new PDFLoader(data.path);
      const docs = await loader.load();
      console.log(`📚 Loaded ${docs.length} pages from PDF`);

      // Split documents into smaller chunks for better retrieval
      const textSplitter = new CharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log(`✂️ Split into ${splitDocs.length} chunks`);

      // Initialize Google Gemini embeddings
      const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "text-embedding-004", // Google's embedding model
      });
      console.log(`🤖 Initialized Google Gemini embeddings`);

      // Connect to existing Qdrant collection
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: "http://localhost:6333",
          collectionName: "langchainjs-testing",
        }
      );
      console.log(`🔗 Connected to Qdrant vector store`);

      // Store the vector data in qdrant db
      await vectorStore.addDocuments(splitDocs);
      console.log(
        `✅ Successfully added ${splitDocs.length} document chunks to vector store`
      );

      // Add metadata about the processed file
      console.log(`📋 File processed: ${data.filename}`);
      return {
        success: true,
        filename: data.filename,
        chunks: splitDocs.length,
        message: "PDF successfully processed and stored in vector database",
      };
    } catch (error) {
      console.error(`❌ Error processing job:`, error);

      // Handle specific Google API errors
      if (error.message?.includes("quota")) {
        throw new Error("Google API quota exceeded. Please try again later.");
      }

      if (error.message?.includes("API key")) {
        throw new Error(
          "Invalid Google API key. Please check your configuration."
        );
      }

      if (error.message?.includes("ENOENT")) {
        throw new Error(`PDF file not found: ${data?.path}`);
      }

      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  },
  {
    concurrency: 5, // Reduced concurrency to avoid API rate limits
    connection: {
      host: "localhost",
      port: "6379",
    },
  }
);

// Worker event handlers
worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed successfully!`);
});

worker.on("failed", (job, err) => {
  console.error(`💥 Job ${job.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("🚨 Worker error:", err);
});

console.log("🚀 PDF processing worker started");
console.log("🤖 Using Google Gemini embeddings");
console.log("📊 Waiting for jobs...");
