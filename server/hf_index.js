/**
 * Hugging Face LLM Integration for RAG PDF Chat
 * ============================================
 *
 * This file provides an alternative implementation using Hugging Face's free LLM API
 * instead of other commercial LLM providers.
 *
 * To use this implementation:
 *
 * 1. Update your package.json scripts:
 *    "start": "node hf_index.js"  // Use this instead of index.js
 *
 * 2. Environment Variables Required:
 *    - HUGGINGFACE_API_KEY (Get from https://huggingface.co/settings/tokens)
 *    - GOOGLE_API_KEY (For embeddings)
 *
 * 3. Default Model:
 *    - Uses microsoft/DialoGPT-large for chat
 *    - Alternative models available (see /models endpoint)
 *
 * 4. Features:
 *    - Free tier access with Hugging Face API
 *    - Built-in rate limiting handling
 *    - Multiple model options
 *    - Health check endpoint
 *
 * 5. Endpoints:
 *    - POST /upload/pdf: Upload PDF files
 *    - GET /chat: Chat with PDF content
 *    - GET /health: Check system status
 *    - GET /models: List available models
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
// For LLM - using Hugging Face
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import dotenv from "dotenv";
dotenv.config();

// ===================================================
// Initialize Hugging Face LLM (Free with API key)
// ===================================================
const llm = new HuggingFaceInference({
  model: "microsoft/DialoGPT-large", // Great conversational model
  apiKey: process.env.HUGGINGFACE_API_KEY,
  maxTokens: 1024,
  temperature: 0.7,
  // Alternative models you can try:
  // model: "meta-llama/Llama-2-7b-chat-hf", // Llama 2 (requires approval)
  // model: "mistralai/Mistral-7B-Instruct-v0.1", // Mistral (excellent)
  // model: "microsoft/DialoGPT-large", // Great for conversations
  // model: "google/flan-t5-large", // Good instruction following
});

// Alternative: Use Hugging Face Chat Models (better for structured responses)
// import { ChatHuggingFace } from "@langchain/community/chat_models/huggingface";
// const llm = new ChatHuggingFace({
//   model: "microsoft/DialoGPT-large",
//   apiKey: process.env.HUGGINGFACE_API_KEY,
// });

// ===================================================
// Queue Setup
// ===================================================
const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost",
    port: "6379",
  },
});

// ===================================================
// Multer Configuration
// ===================================================
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

// =========================================
// Express App Setup
// =========================================
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  return res.json({ status: "All Good with Hugging Face!" });
});

//===========================================
// Endpoint to upload PDF file
//===========================================
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

//==================================================
// Endpoint to chat with the PDF file using Hugging Face
//==================================================
app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.message;

    if (!userQuery) {
      return res
        .status(400)
        .json({ error: "Message query parameter is required" });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "text-embedding-004", // Google's embedding model
    });

    // Get vector store
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333",
        collectionName: "langchainjs-testing",
      }
    );

    const retriever = vectorStore.asRetriever({
      k: 3, // Get top 3 relevant documents
    });

    // Get relevant documents from vector database
    const relevantDocs = await retriever.invoke(userQuery);

    // Prepare context from retrieved documents
    const context = relevantDocs
      .map((doc, index) => `Document ${index + 1}:\n${doc.pageContent}`)
      .join("\n\n---\n\n");

    // Create a well-formatted prompt for Hugging Face models
    const prompt = `You are a helpful AI assistant that answers questions based on PDF document content.

Context from PDF documents:
${context}

Question: ${userQuery}

Instructions:
- Answer the question using ONLY the provided context from the PDF documents
- If the answer is not in the context, clearly state that the information is not available
- Be concise but comprehensive in your response
- Maintain a professional and helpful tone

Answer:`;

    console.log(`🤖 Sending query to Hugging Face...`);

    // Get response from Hugging Face
    const response = await llm.invoke(prompt);

    console.log(`✅ Received response from Hugging Face`);

    // Clean up the response (remove the prompt echo if present)
    let cleanedResponse = response;
    if (typeof response === "string") {
      // Remove the original prompt if it was echoed back
      const answerIndex = response.toLowerCase().lastIndexOf("answer:");
      if (answerIndex !== -1) {
        cleanedResponse = response.substring(answerIndex + 7).trim();
      }
    }

    // Send response back to client
    return res.json({
      message: cleanedResponse,
      sources: relevantDocs.length,
      model: "microsoft/DialoGPT-large",
      docs: relevantDocs.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: doc.metadata,
      })),
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Handle specific Hugging Face API errors
    if (
      error.message?.includes("rate limit") ||
      error.message?.includes("quota")
    ) {
      return res.status(429).json({
        error: "Hugging Face API rate limit exceeded. Please try again later.",
        details: "Free tier has limited requests per hour",
      });
    }

    if (
      error.message?.includes("API key") ||
      error.message?.includes("authentication")
    ) {
      return res.status(401).json({
        error: "Invalid Hugging Face API key. Please check your configuration.",
        details: "Get your API key from https://huggingface.co/settings/tokens",
      });
    }

    if (
      error.message?.includes("model") &&
      error.message?.includes("loading")
    ) {
      return res.status(503).json({
        error: "Model is loading. Please try again in a few moments.",
        details: "Hugging Face models may take time to load on first request",
      });
    }

    return res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

//==================================================
// Health check endpoint for Hugging Face
//==================================================
app.get("/health", async (req, res) => {
  try {
    console.log("🔍 Testing Hugging Face connection...");
    const testResponse = await llm.invoke("Say 'Hello' if you're working");

    return res.json({
      status: "healthy",
      huggingface: "connected",
      model: "microsoft/DialoGPT-large",
      response: testResponse,
    });
  } catch (error) {
    console.error("Health check error:", error);
    return res.status(500).json({
      status: "unhealthy",
      huggingface: "disconnected",
      error: error.message,
      troubleshooting: {
        checkApiKey: "Verify HUGGINGFACE_API_KEY in .env file",
        getApiKey: "Get API key from: https://huggingface.co/settings/tokens",
        modelLoading: "Some models may take time to load on first request",
      },
    });
  }
});

//==================================================
// Endpoint to list recommended Hugging Face models
//==================================================
app.get("/models", async (req, res) => {
  try {
    return res.json({
      currentModel: "microsoft/DialoGPT-large",
      recommendedModels: {
        conversational: [
          "microsoft/DialoGPT-large",
          "microsoft/DialoGPT-medium",
          "facebook/blenderbot-3B",
        ],
        instruction: [
          "google/flan-t5-large",
          "google/flan-t5-xl",
          "bigscience/T0pp",
        ],
        chat: [
          "mistralai/Mistral-7B-Instruct-v0.1",
          "meta-llama/Llama-2-7b-chat-hf",
          "HuggingFaceH4/zephyr-7b-beta",
        ],
      },
      embeddings: {
        fast: "sentence-transformers/all-MiniLM-L6-v2",
        quality: "sentence-transformers/all-mpnet-base-v2",
        balanced: "BAAI/bge-small-en-v1.5",
      },
      note: "Some models may require approval or have usage limits",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(8000, () => {
  console.log(`🚀 Server started on PORT: 8000`);
  console.log(`🤗 Using Hugging Face LLM (Free API)`);
  console.log(`📊 Health check: http://localhost:8000/health`);
  console.log(`🔧 Models endpoint: http://localhost:8000/models`);
  console.log(`\n🔑 Make sure you have HUGGINGFACE_API_KEY in your .env file`);
  console.log(`   Get it from: https://huggingface.co/settings/tokens`);
});
