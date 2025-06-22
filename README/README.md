# Bidbot - Freelancing Automation Platform

A comprehensive platform that automates freelancing tasks including job scraping, proposal generation, and project estimation using AI.

## 🏗️ Architecture

The project consists of four main components:

- **Frontend** (React.js) - User interface and dashboard
- **Backend** (Express.js) - API server and business logic
- **LLM Service** (FastAPI) - AI-powered proposal and estimation generation
- **Scrapper** (Flask) - Web scraping for job data

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download here](https://www.python.org/downloads/)
- **MongoDB** - Either local installation or MongoDB Atlas account
- **Chrome/Chromium** browser (for web scraping)
- **Git** - [Download here](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd "FYP Compiled Code (Bidbot)"
```

### 2. Environment Setup

Create environment files for each component:

#### Backend Environment (.env)

```bash
cd bidbot-backend
cp .env.example .env  # If example exists, or create manually
```

Required environment variables:

```env
PORT=5000
MONGO_USER=your_mongodb_username
MONGO_PASS=your_mongodb_password
DATABASE_NAME=bidbot_db
JWT_SECRET=your_jwt_secret_key
FRONT_END_URL=http://localhost:3000
```

#### Frontend Environment

```bash
cd bidbot-frontend
```

#### LLM Service Environment

```bash
cd bidbot-llm
```

#### Scrapper Environment

```bash
cd bidbot-scrapper
```

### 3. Install Dependencies

#### Backend (Express.js)

```bash
cd bidbot-backend
npm install
```

#### Frontend (React.js)

```bash
cd bidbot-frontend
npm install
# If you encounter peer dependency issues, run:
npm install --legacy-peer-deps
```

#### LLM Service (FastAPI)

```bash
cd bidbot-llm
pip install -r requirement.txt
```

#### Scrapper (Flask)

```bash
cd bidbot-scrapper
pip install -r requirements.txt
```

### 4. Start All Services

Open four terminal windows and run each service:

#### Terminal 1 - Backend

```bash
cd bidbot-backend
npm run dev
```

Backend will start on: http://localhost:5000

#### Terminal 2 - Frontend

```bash
cd bidbot-frontend
npm start
```

Frontend will start on: http://localhost:3000

#### Terminal 3 - LLM Service

```bash
cd bidbot-llm
uvicorn main:app --reload
```

LLM service will start on: http://localhost:8000

#### Terminal 4 - Scrapper

```bash
cd bidbot-scrapper
python app.py
```

Scrapper will start on: http://localhost:5001

## 📁 Project Structure

```
FYP Compiled Code (Bidbot)/
├── bidbot-frontend/          # React.js frontend application
├── bidbot-backend/           # Express.js backend API
├── bidbot-llm/              # FastAPI LLM service
├── bidbot-scrapper/         # Flask web scraper
└── README/                  # This documentation
```

## 🔧 Individual Component Setup

### Frontend (React.js)

**Location**: `bidbot-frontend/`

**Key Features**:

- Material-UI dashboard interface
- User authentication and authorization
- Job management and tracking
- Profile management
- Payment integration (Stripe)

**Dependencies**: See `package.json` for complete list

**Available Scripts**:

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run install:clean` - Clean install

### Backend (Express.js)

**Location**: `bidbot-backend/`

**Key Features**:

- RESTful API endpoints
- MongoDB database integration
- JWT authentication
- File upload handling
- Email notifications
- Payment processing

**Dependencies**: See `package.json` for complete list

**Available Scripts**:

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

**API Routes**:

- `/auth` - Authentication endpoints
- `/accounts` - Account management
- `/profile` - User profile management
- `/jobs` - Job-related operations
- `/botActions` - Bot automation actions
- `/payment` - Payment processing

### LLM Service (FastAPI)

**Location**: `bidbot-llm/`

**Key Features**:

- AI-powered proposal generation
- Project time and cost estimation
- Response suggestion system
- Integration with external LLM APIs

**Dependencies**: See `requirement.txt`

**API Endpoints**:

- `/proposal` - Proposal generation
- `/estimation` - Project estimation
- `/response-suggester` - Response suggestions

### Scrapper (Flask)

**Location**: `bidbot-scrapper/`

**Key Features**:

- Web scraping for job listings
- Selenium-based automation
- Content extraction from various file formats
- Upwork integration
- Job Apply
- 

## 🌐 API Endpoints Summary

| Service     | Base URL              | Port | Description         |
| ----------- | --------------------- | ---- | ------------------- |
| Frontend    | http://localhost:3000 | 3000 | React application   |
| Backend     | http://localhost:5000 | 5000 | Express.js API      |
| LLM Service | http://localhost:8000 | 8000 | FastAPI LLM service |
| Scrapper    | http://localhost:5001 | 5001 | Flask scraper       |

## 🔒 Environment Variables

### Backend (.env)

```env
PORT=5000
MONGO_USER=your_mongodb_username
MONGO_PASS=your_mongodb_password
DATABASE_NAME=bidbot_db
JWT_SECRET=your_jwt_secret_key
FRONT_END_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_LLM_API_URL=http://localhost:8000
REACT_APP_SCRAPPER_API_URL=http://localhost:5001
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**

   ```bash
   # Find process using port
   netstat -ano | findstr :5000
   # Kill process
   taskkill /PID <process_id> /F
   ```
2. **MongoDB Connection Issues**

   - Ensure MongoDB is running
   - Check connection string in .env file
   - Verify network connectivity
3. **Python Dependencies Issues**

   ```bash
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
4. **Node.js Dependencies Issues**

   ```bash
   # Clear npm cache
   npm cache clean --force
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```
5. **Chrome Driver Issues (Scrapper)**

   - Ensure Chrome/Chromium is installed
   - Update Chrome to latest version
   - Check undetected_chromedriver compatibility

### Development Tips

1. **Use different ports** if any service conflicts
2. **Enable CORS** properly for cross-origin requests
3. **Check console logs** for detailed error messages
4. **Use Postman/Insomnia** to test API endpoints
5. **Monitor network tab** in browser dev tools

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above

## 🎬 Demo Videos

<details>
<summary>Demo Application</summary>

<video src="../video/demo-application.mkv" controls width="600"></video>
</details>

<details>
<summary>Demo Extension</summary>

<video src="../video/demo-extension.mkv" controls width="600"></video>
</details>