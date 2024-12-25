FROM python:3.12

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install -i https://mirrors.ustc.edu.cn/pypi/simple -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application
CMD ["python3", "app.py"]