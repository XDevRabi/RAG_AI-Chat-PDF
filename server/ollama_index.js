// Ollama LLM and Vector Store
// npm install @langchain/ollama

// Install Ollama on your machine: https://ollama.ai/
// Run the following command to download the model:
// ollama pull llama3.1
// ollama run llama3.1: to run the model on the terminal. 
// ollama list: for list of models
// ollama rm <model_name>: to remove a model


import express from "express";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";

// Ollama for LLM
import { Ollama } from "@langchain/ollama";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

// Initialize Ollama LLM
const llm = new Ollama({
  baseUrl: "http://localhost:11434",
  model: "llama3.1",
  temperature: 0.7,
  numCtx: 4096,
  numPredict: 1024,
});

// Queue Setup
const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: "6379",
  },
});

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage: storage });

// Express App Setup
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ status: "All Good with Ollama!" });
});

// Endpoint to upload PDF file
app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  try {
    await queue.add(
      "file-ready",
      JSON.stringify({
        filename: req.file.originalname,
        destination: req.file.destination,
        path: req.file.path,
      })
    );
    return res.json({ message: "PDF uploaded successfully" });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload file" });
  }
});

// Endpoint to chat with the PDF file
app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.message;

    if (!userQuery) {
      return res
        .status(400)
        .json({ error: "Message query parameter is required" });
    }

    // Embedding model using Gemini embedding (optional to replace later)
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "text-embedding-004",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName: "langchainjs-testing",
      }
    );

    const retriever = vectorStore.asRetriever({ k: 3 });
    const relevantDocs = await retriever.invoke(userQuery);

    const context = relevantDocs
      .map((doc, index) => `Document ${index + 1}:\n${doc.pageContent}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a helpful AI assistant that answers questions based on PDF document content.
Instructions:
- Answer the user's question using ONLY the provided context from the PDF documents
- If the answer is not in the context, clearly state that the information is not available in the provided documents
- Be concise but comprehensive in your responses
- Maintain a professional and helpful tone

Context from PDF documents:
${context}`;

    console.log(`🤖 Sending query to Ollama...`);
    const response = await llm.invoke(systemPrompt);
    console.log(`✅ Received response from Ollama`);

    return res.json({
      message: response,
      sources: relevantDocs.length,
      model: "llama3.1",
      docs: relevantDocs.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    console.error("Chat error:", error);

    if (error.message?.includes("connect ECONNREFUSED")) {
      return res.status(503).json({
        error: "Ollama service is not running. Please start Ollama first.",
        details: "Run 'ollama serve' in your terminal",
      });
    }

    if (
      error.message?.includes("model") &&
      error.message?.includes("not found")
    ) {
      return res.status(404).json({
        error: "Model not found. Please pull the model first.",
        details: "Run 'ollama pull llama3.1' in your terminal",
      });
    }

    return res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

// Health check endpoint for Ollama
app.get("/health", async (req, res) => {
  try {
    console.log("🔍 Testing Ollama connection...");
    const testResponse = await llm.invoke("Say 'Hello' if you're working");

    return res.json({
      status: "healthy",
      ollama: "connected",
      model: "llama3.1",
      response: testResponse,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return res.status(500).json({
      status: "unhealthy",
      ollama: "disconnected",
      error: error.message,
      troubleshooting: {
        checkOllamaRunning: "Run 'ollama serve' to start Ollama",
        checkModelInstalled: "Run 'ollama pull llama3.1' to install model",
        checkPort: "Ensure Ollama is running on port 11434",
      },
    });
  }
});

// Endpoint to list available Ollama models
app.get("/models", async (req, res) => {
  try {
    return res.json({
      availableModels: [
        "llama3.1",
        "llama3.1:8b",
        "llama3.1:70b",
        "mistral",
        "codellama",
        "phi3",
        "gemma2",
        "qwen2",
      ],
      currentModel: "llama3.1",
      note: "Make sure to pull models with 'ollama pull <model-name>'",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(8000, () => {
  console.log(`🚀 Server started on PORT: 8000`);
  console.log(`🤖 Using Ollama LLM (Local & Free)`);
  console.log(`📊 Health check: http://localhost:8000/health`);
  console.log(`🔧 Models endpoint: http://localhost:8000/models`);
  console.log(`\n🔍 Make sure Ollama is running:`);
  console.log(`   1. Install: https://ollama.ai/`);
  console.log(`   2. Run: ollama serve`);
  console.log(`   3. Pull model: ollama pull llama3.1`);
});
