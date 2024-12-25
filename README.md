## Bamboo Growth Learning Management System

## Project Description
The Course Management System is an innovative platform designed to enhance the educational experience for both teachers and students. This open-source project provides a comprehensive suite of tools that allow educators to create custom course types, manage student learning, and conduct evaluations. For students, it offers features for course learning, note-taking, and learning path analysis. The system supports various preset course types, including programming, English reading aloud, English dubbing, book reading, and general courses.

## Core Functions
- **For Teachers:**
  - Create custom course types.
  - Manage students' course learning.
  - Conduct evaluations.

- **For Students:**
  - Access course learning materials.
  - Utilize note-taking features.
  - Record and analyze learning paths.

- **Customization:**
  - Design and customize learning pages tailored to different course types.

## Technology Stack
- **Front End:**
  - React
  - Vite
  - Material UI
  - CodeMirror (Markdown Code Editor)
  - Video.js (Video Control)
  - Peaks.js (Audio Visualization)

- **Back End:**
  - Sanic (API Framework)
  - JWT (Authentication)
  - asyncpg (Database Connection)
  - Tencent COS (File Storage)
  - Docker Compose (Containerization)

## Getting Started
To set up the project locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/codeslips/bamboo_growth.git
   cd bamboo_growth
   ```

2. **Install dependencies:**
   For the front end:
   ```bash
   cd frontend
   yarn
   ```

   For the back end:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Run the application:**
   Start the front end:
   ```bash
   yarn dev
   ```

   Start the back end:
   ```bash
   python app.py
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000` for the front end.

## Features
- Customizable course types for diverse learning experiences.
- Integrated tools for student evaluations and performance tracking.
- User-friendly interfaces for both teachers and students.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.