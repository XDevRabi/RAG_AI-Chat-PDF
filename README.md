# RAG AI Chat With PDF

## Project Overview

This project is a Retrieval-Augmented Generation (RAG) application that allows users to upload PDF documents and chat with an AI assistant about the content of those documents. The application uses vector embeddings to store document content and retrieves relevant information to answer user queries.

## Features

- PDF document upload and processing
- Vector-based document retrieval using Qdrant
- AI-powered chat interface with OpenAI GPT
- Real-time document querying
- Background job processing with BullMQ

## Technology Stack

### Frontend
- **Next.js 15.4.4** - React framework with App Router
- **React 19.1.0** - UI library
- **TailwindCSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Lucide React** - Icon library

### Backend
- **Node.js with Express** - Web server framework
- **LangChain** - Document processing and AI orchestration
- **OpenAI API** - Embeddings and chat completions
- **BullMQ** - Job queue management
- **PDF-Parse** - PDF text extraction

### Infrastructure
- **Qdrant** - Vector database for document storage
- **Valkey (Redis)** - Queue management and caching
- **Docker** - Containerization

## Project Structure
├── client/                 # Frontend Next.js application
│   ├── app/                # Next.js app directory
│   │   ├── components/     # React components
│   │   │   ├── chat.tsx    # Chat interface component
│   │   │   └── file-upload.tsx # PDF upload component
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # App layout
│   │   └── page.tsx        # Main page component
│   ├── components/         # Shared UI components
│   ├── lib/                # Utility functions
│   └── public/             # Static assets
│
└── server/                 # Backend Node.js application
    ├── index.js            # Express server setup and API endpoints
    ├── worker.js           # BullMQ worker for processing PDF files
    └── uploads/            # Directory for uploaded PDF files

## Prerequisites

- **Node.js** (latest LTS version)
- **Docker and Docker Compose**
- **OpenAI API key**

## Installation & Setup

### Step 1: Clone and Navigate

```bash
git clone https://github.com/XDevRabi/RAG_AI-Chat-PDF.git
cd RAG_AI-Chat-PDF
```

### Step 2: Start Infrastructure Services

Start the Qdrant vector database and Valkey (Redis) services:

```bash
docker-compose up -d
```

This will start:
- Qdrant on port 6333
- Valkey (Redis) on port 6379

### Step 3: Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Set your OpenAI API key as an environment variable:
```bash
set OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the Express server:
```bash
npm run dev
```

5. In a **separate terminal**, start the worker process:
```bash
cd server
npm run dev:worker
```

The server will run on `http://localhost:8000`

### Step 4: Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload PDF**: Click the upload button on the left side to select and upload a PDF document
2. **Processing**: Wait for the document to be processed (progress shown in server logs)
3. **Chat**: Ask questions about the document content in the chat interface on the right
4. **AI Response**: The assistant will respond with information retrieved from your document

## How It Works

### Document Processing Pipeline

1. **Upload**: PDF files are uploaded via the frontend to `/upload/pdf` endpoint
2. **Queue**: Upload jobs are added to BullMQ queue for background processing
3. **Extract**: Worker process extracts text content from PDF using LangChain PDFLoader
4. **Chunk**: Text is split into manageable chunks for better retrieval
5. **Embed**: Each chunk is converted to vector embeddings using OpenAI's `text-embedding-3-small`
6. **Store**: Embeddings are stored in Qdrant vector database

### Query Processing

1. **User Query**: User submits a question through the chat interface
2. **Embed Query**: Question is converted to vector embedding
3. **Retrieve**: Similar document chunks are retrieved from Qdrant (top 2 results)
4. **Generate**: Retrieved context + user question sent to OpenAI GPT-4
5. **Response**: AI-generated answer returned to user with source documents

## API Endpoints

### `POST /upload/pdf`
- Upload PDF file for processing
- Accepts multipart/form-data with `pdf` field
- Returns: `{ message: "uploaded" }`

### `GET /chat?message=<query>`
- Query the uploaded document
- Returns: `{ message: "AI response", docs: [...] }`

## Environment Variables

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Development Scripts

### Server
```bash
npm run dev        # Start server with auto-reload
npm run dev:worker # Start worker with auto-reload
```

### Client
```bash
npm run dev   # Start development server
npm run build # Build for production
npm run start # Start production server
```

## Troubleshooting

### Common Issues

1. **OpenAI API Key**: Ensure your API key is set correctly
2. **Docker Services**: Verify Qdrant and Valkey are running with `docker-compose ps`
3. **Port Conflicts**: Check if ports 3000, 6333, 6379, 8000 are available
4. **Large PDFs**: Processing time increases with document size

### Logs

- Server logs: Check terminal running `npm run dev`
- Worker logs: Check terminal running `npm run dev:worker`
- Docker logs: `docker-compose logs`

## Future Enhancements

- [ ] User authentication and session management
- [ ] Support for multiple document formats (DOCX, TXT, etc.)
- [ ] Document management interface
- [ ] Chat history persistence
- [ ] Improved UI/UX with better chat visualization
- [ ] Document metadata and source citations
- [ ] Multi-language support
- [ ] Batch document processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).