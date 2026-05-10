# FinSage: AI-Powered Financial Intelligence Platform

This repository contains the full-stack MERN implementation for FinSage.

## 🚀 Quick Start

### 1. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   *Note: Update the `MONGO_URI` and `JWT_SECRET` in `.env` as needed.*
3. Start the server:
   ```bash
   node server.js
   ```

### 2. Frontend Setup
1. Open a **new** terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🛠 Tech Stack
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Frontend**: React (Vite), Tailwind CSS, Redux Toolkit, Recharts
- **AI**: OpenAI/Gemini integration ready

## 📂 Project Structure
- `/backend`: Express API, Mongoose Models, AI Services.
- `/frontend`: React SPA with Glassmorphism UI.
