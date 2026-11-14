
# AI Chatbot

An AI-powered chatbot built using React, Node.js, Express.js, and Groq LLM API.

## Features

- AI-powered conversations
- Streaming AI responses
- Conversation context
- Markdown response rendering
- Code syntax highlighting
- Copy code functionality
- Typing indicator
- Error handling and retry
- Responsive chat interface

## Tech Stack

### Frontend
- React.js
- Vite
- CSS
- React Markdown

### Backend
- Node.js
- Express.js
- Groq SDK

### AI
- Groq LLM API
- OpenAI GPT-OSS 20B model (configured model)

## Project Structure

```text
ChatBot/
├── frontend/
│   └── src/
│       └── components/
│           ├── Chat.jsx
│           └── TypingIndicator.jsx
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       └── server.js
│
├── .gitignore
└── README.md
```

## Installation

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd ChatBot
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Start the backend:

```bash
npm run dev
```

### 3. Setup Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

## Run the Application

Frontend: http://localhost:5173

Backend: http://localhost:5000

## Future Improvements

- MongoDB integration
- Persistent chat history
- Multiple conversations
- User authentication
- RAG-based document chat
