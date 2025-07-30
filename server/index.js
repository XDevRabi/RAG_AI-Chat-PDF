import express from "express";
import cors from "cors";
import multer from "multer";
import { Queue } from "bullmq";
import { QdrantVectorStore } from "@langchain/qdrant";
// For the vector embedding.
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";
dotenv.config();

// ===================================================
// Initialize Google Gemini LLM
// ===================================================
const llm = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-1.5-flash", // Free model with good performance
  temperature: 0.7,
  maxOutputTokens: 2048,
});

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
  return res.json({ status: "All Good with Gemini!" });
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
// Endpoint to chat with the PDF file using Gemini
//==================================================
app.get("/chat", async (req, res) => {
  try {
    const userQuery = req.query.message;

    if (!userQuery) {
      return res
        .status(400)
        .json({ error: "Message query parameter is required" });
    }

    // Initialize embeddings
    // 1. Using openAI
    // For this you need to `import { OpenAIEmbeddings } from "@langchain/openai";`
    // const embeddings = new OpenAIEmbeddings({
    //   model: "text-embedding-3-small",
    //   apiKey: process.env.OPENAI_API_KEY,
    // });

    // Using Hugging Face
    // import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
    // const embeddings = new HuggingFaceInferenceEmbeddings({
    //   apiKey: process.env.HUGGINGFACE_API_KEY,
    //   model: "sentence-transformers/all-MiniLM-L6-v2",
    // });

    // But for now we will use Gemini
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
      k: 3, // Increased to get more context
    });

    // Get relevant documents: Get the vector data from qdrant db based on the user query.
    const relevantDocs = await retriever.invoke(userQuery);

    // Prepare context from retrieved documents
    const context = relevantDocs
      .map((doc, index) => `Document ${index + 1}:\n${doc.pageContent}`)
      .join("\n\n---\n\n");

    // Create the system prompt
    const systemPrompt = `You are a helpful AI assistant that answers questions based on PDF document content.

Instructions:
- Answer the user's question using ONLY the provided context from the PDF documents
- If the answer is not in the context, clearly state that the information is not available in the provided documents
- Be concise but comprehensive in your responses
- Maintain a professional and helpful tone

Context from PDF documents:
${context}`;

    // Get response from Gemini
    const response = await llm.invoke([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userQuery,
      },
    ]);

    // Send response back to client
    return res.json({
      message: response.content,
      sources: relevantDocs.length,
      model: "gemini-1.5-flash",
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Handle specific Gemini API errors
    if (error.message?.includes("quota")) {
      return res.status(429).json({
        error: "API quota exceeded. Please try again later.",
      });
    }

    if (error.message?.includes("API key")) {
      return res.status(401).json({
        error: "Invalid API key. Please check your Google API key.",
      });
    }

    return res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

//==================================================
// Health check endpoint for Gemini
//==================================================
app.get("/health", async (req, res) => {
  try {
    // Test Gemini connection
    const testResponse = await llm.invoke("Say 'Hello' if you're working");

    return res.json({
      status: "healthy",
      gemini: "connected",
      response: testResponse.content,
    });
  } catch (error) {
    return res.status(500).json({
      status: "unhealthy",
      gemini: "disconnected",
      error: error.message,
    });
  }
});

app.listen(8000, () => {
  console.log(`🚀 Server started on PORT: 8000`);
  console.log(`🤖 Using Google Gemini AI`);
  console.log(`📊 Health check: http://localhost:8000/health`);
});
