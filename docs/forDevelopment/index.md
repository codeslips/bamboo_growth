# English Language Dubbing Application Documentation

Welcome to the documentation for the English Language Dubbing Application. This application allows users to create voiceovers and dub content in English with a user-friendly interface.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Components](#components)
6. [Audio Utilities](#audio-utilities)
7. [Contributing](#contributing)
8. [License](#license)

## Overview

The English Language Dubbing Application is a comprehensive solution for recording, editing, and managing audio dubbing projects. It consists of a React frontend for user interaction and an Express.js backend for handling server-side operations.

## Features

- In-app audio recording
- Audio editing and management
- Intuitive user interface
- Video playback with synchronized audio recording
- Multi-track audio merging
- WAV format audio export

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```bash
   cd <project-directory>
   ```
3. Install dependencies for both frontend and backend:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

## Usage

To run the application using Docker Compose:

1. Ensure Docker and Docker Compose are installed on your system.
2. From the project root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the frontend at `http://localhost:3000`
4. The backend API is available at `http://localhost:5000`

## Components

### Frontend
The React application handles the user interface and audio recording functionality. It provides an intuitive interface for users to record, edit, and manage their dubbing projects.

### Backend
The Express.js server provides API endpoints for the frontend, handling data persistence, audio processing, and other server-side operations.

## Audio Utilities

The application includes several audio utilities to enhance the dubbing experience:

- **mergeAudioBuffers**: Combines multiple audio buffers into a single buffer, allowing for multi-track audio composition.
- **exportBufferToWavBlob**: Converts an AudioBuffer to a WAV Blob, enabling easy download and sharing of audio files.

## Contributing

We welcome contributions to improve the English Language Dubbing Application. Please submit pull requests or open issues for any suggestions, bug reports, or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file in the project repository for full details.