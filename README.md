# Google NotebookLM Clone

A full-stack application that mimics Google's NotebookLM functionality, allowing users to upload PDF documents and interact with them through an AI-powered chat interface. The application uses advanced text embedding and similarity search to provide contextually relevant answers based on the uploaded documents.

## 🚀 Features

- **PDF Document Upload**: Upload and process PDF files up to 2MB
- **AI-Powered Chat**: Interactive chat interface powered by OpenAI's GPT-3.5 Turbo
- **Contextual Search**: Uses semantic similarity search with embeddings to find relevant content
- **Citation Support**: Provides page number references for answers
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Real-time Processing**: Instant PDF text extraction and indexing

## 🏗️ Tech Stack

### Frontend

- **Next.js 15.5.2** with Turbopack
- **React 19.1.0** with TypeScript
- **Tailwind CSS 4** for styling
- **Radix UI** for accessible components
- **React PDF** for PDF viewing
- **Sonner** for notifications

### Backend

- **Node.js** with Express.js
- **OpenAI API** for chat completions
- **Xenova Transformers** for text embeddings
- **PDF-Parse** for text extraction
- **In-memory vector search** for document retrieval

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **npm** or **yarn** package manager
- **OpenAI API Key** (sign up at [OpenAI](https://openai.com/api/))

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/neeleshksingh/Google-NotebookLM-Clone.git
cd Google-NotebookLM-Clone
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:

```bash
touch .env
```

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
```

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd ../frontend
npm install
```

## 🚀 Running the Application

### Development Mode

1. **Start the Backend Server**:

   ```bash
   cd backend
   npm run dev
   ```

   The backend server will start on `http://localhost:8000`

2. **Start the Frontend Application** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will start on `http://localhost:3000`

### Production Mode

1. **Build the Frontend**:

   ```bash
   cd frontend
   npm run build
   npm start
   ```

2. **Start the Backend**:
   ```bash
   cd backend
   npm start
   ```

## 📖 Usage

1. **Open the Application**: Navigate to `http://localhost:3000` in your browser

2. **Upload a PDF**:

   - Click the upload area or drag and drop a PDF file (max 2MB)
   - Wait for the file to be processed and indexed

3. **Start Chatting**:

   - Type your questions about the document in the chat interface
   - The AI will provide answers based on the document content
   - Citations with page numbers will be provided when available

4. **View PDF**:
   - The PDF viewer on the left shows your uploaded document
   - Navigate through pages using the controls
   - Zoom in/out and rotate as needed

## 🛠️ API Endpoints

### Backend API (`http://localhost:8000`)

- **POST** `/upload`

  - Upload and process a PDF file
  - Returns: `{ session_id, message }`

- **POST** `/chat`

  - Send a chat message for a session
  - Body: `{ session_id, message }`
  - Returns: `{ response, citations }`

- **GET** `/`
  - Health check endpoint
  - Returns: `"Backend OK"`

## 📁 Project Structure

```
Google-NotebookLM-Clone/
├── README.md
├── backend/
│   ├── app.js              # Express server and API routes
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables (create this)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx  # Root layout
│   │   │   ├── page.tsx    # Main page component
│   │   │   └── globals.css # Global styles
│   │   ├── components/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── PDFUpload.tsx
│   │   │   ├── PDFViewer.tsx
│   │   │   └── ui/         # Radix UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   ├── package.json        # Frontend dependencies
│   └── next.config.ts      # Next.js configuration
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=8000
```

### Customization Options

- **PDF Size Limit**: Modify `limits.fileSize` in `backend/app.js` (currently 2MB)
- **Embedding Model**: Change the model in `getEmbedder()` function
- **OpenAI Model**: Update the model in the chat endpoint (currently `gpt-3.5-turbo`)
- **Chunk Size**: Adjust `chunkSize` and `overlap` in `chunkText()` function

## 🐛 Troubleshooting

### Common Issues

1. **"OpenAI API Key not found"**

   - Ensure your `.env` file is in the backend directory
   - Verify your API key is correct and has sufficient credits

2. **PDF Upload Fails**

   - Check file size (must be under 2MB)
   - Ensure PDF contains extractable text (not just images)

3. **Frontend Won't Start**

   - Make sure you're using Node.js 18+
   - Try deleting `node_modules` and `package-lock.json`, then run `npm install`

4. **CORS Issues**
   - Ensure backend is running on port 8000
   - Check that frontend is making requests to the correct backend URL

### Getting Help

If you encounter issues:

1. Check the browser console for frontend errors
2. Check the terminal output for backend errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the GPT API
- [Xenova/transformers.js](https://github.com/xenova/transformers.js) for client-side ML
- [Radix UI](https://www.radix-ui.com/) for accessible components
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 🔮 Roadmap

- [ ] Support for multiple document formats (DOCX, TXT, etc.)
- [ ] Persistent storage with database integration
- [ ] User authentication and session management
- [ ] Advanced search and filtering options
- [ ] Export chat conversations
- [ ] Mobile-responsive improvements
