from sanic import Blueprint, json
import json as json_module
import os
from dotenv import load_dotenv
from sanic.response import json
import aiofiles
import os.path

load_dotenv()

BASE_PATH = os.getenv('BASE_COURSE_DATA_PATH', 'data/course')

course_file_bp = Blueprint("course_file", url_prefix="/api/v1/course-file")

@course_file_bp.route("/")
async def course_file_root(request):
    return json({"message": "Course File API"})

@course_file_bp.route("/list")
async def course_list(request):
    try:
        with open(os.path.join(BASE_PATH, 'index.json'), 'r') as file:
            courses = json_module.load(file)
        return json(courses)
    except FileNotFoundError:
        return json({"error": "Course list not found"}, status=404)
    except json_module.JSONDecodeError:
        return json({"error": "Invalid course list data"}, status=500)

@course_file_bp.route("/<course_id>")
async def get_course_info(request, course_id):
    try:
        file_path = os.path.join(BASE_PATH, course_id, 'index.json')
        with open(file_path, 'r') as file:
            course_info = json_module.load(file)
        return json(course_info)
    except FileNotFoundError:
        return json({"error": f"Course information not found for ID: {course_id}"}, status=404)
    except json_module.JSONDecodeError:
        return json({"error": f"Invalid course information data for ID: {course_id}"}, status=500)

@course_file_bp.route("/<course_id>", methods=["PUT"])
async def update_course_info(request, course_id):
    try:
        # Get the request body containing the updated course data
        update_data = request.json

        if not update_data:
            return json({"error": "No data provided for update"}, status=400)

        # Validate fields and their types
        allowed_fields = {
            'title': str,
            'description': str,
            'lessons': list,
            'tags': list,
            'difficulty': str,
            'language': str
        }

        # Filter and validate only the allowed fields
        filtered_update_data = {}
        for field, expected_type in allowed_fields.items():
            if field in update_data:
                if not isinstance(update_data[field], expected_type):
                    return json({
                        "error": f"Invalid type for {field}. Expected {expected_type.__name__}, got {type(update_data[field]).__name__}"
                    }, status=400)
                filtered_update_data[field] = update_data[field]

        # Check if the course file exists
        file_path = os.path.join(BASE_PATH, course_id, 'index.json')
        if not os.path.exists(file_path):
            return json({"error": f"Course not found for ID: {course_id}"}, status=404)

        # Read existing data
        with open(file_path, 'r') as file:
            existing_data = json_module.load(file)

        # Update only the allowed fields
        existing_data.update(filtered_update_data)

        # Write the updated data to the file
        with open(file_path, 'w') as file:
            json_module.dump(existing_data, file, indent=4)
        
        return json({"message": "Course information updated successfully"})

    except json_module.JSONDecodeError:
        return json({"error": "Invalid JSON data in request"}, status=400)
    except Exception as e:
        return json({"error": f"Failed to update course information: {str(e)}"}, status=500)

@course_file_bp.route("/<course_id>/lesson/<lesson_id>")
async def get_lesson_info(request, course_id, lesson_id):
    try:
        # First try to find index.json
        file_path = os.path.join(BASE_PATH, course_id, 'lesson', lesson_id, 'index.json')
        
        # If index.json doesn't exist, try lesson.json
        if not os.path.exists(file_path):
            file_path = os.path.join(BASE_PATH, course_id, 'lesson.json')
            
            # If neither file exists, return 404
            if not os.path.exists(file_path):
                return json({"error": f"Lesson information not found for Course ID: {course_id}, Lesson ID: {lesson_id}"}, status=404)
        
        with open(file_path, 'r') as file:
            lesson_info = json_module.load(file)
        return json(lesson_info)
    except FileNotFoundError:
        return json({"error": f"Lesson information not found for Course ID: {course_id}, Lesson ID: {lesson_id}"}, status=404)
    except json_module.JSONDecodeError:
        return json({"error": f"Invalid lesson information data for Course ID: {course_id}, Lesson ID: {lesson_id}"}, status=500)

@course_file_bp.route("/<course_id>/lesson/<lesson_id>", methods=["PUT"])
async def update_lesson_info(request, course_id, lesson_id):
    try:
        # Get the request body containing the updated lesson data
        update_data = request.json

        if not update_data:
            return json({"error": "No data provided for update"}, status=400)

        # Validate fields and their types
        allowed_fields = {
            'fullSentences': dict,
            'sentences': list,
            'title': str
        }

        # Check if only allowed fields are present
        invalid_fields = [field for field in update_data.keys() if field not in allowed_fields]
        if invalid_fields:
            return json({"error": f"Invalid fields provided: {invalid_fields}"}, status=400)

        # Validate data types
        for field, value in update_data.items():
            if not isinstance(value, allowed_fields[field]):
                return json({
                    "error": f"Invalid type for {field}. Expected {allowed_fields[field].__name__}, got {type(value).__name__}"
                }, status=400)

        # Check if index.json exists, if not try lesson.json
        file_path = os.path.join(BASE_PATH, course_id, 'lesson', lesson_id, 'index.json')
        if not os.path.exists(file_path):
            file_path = os.path.join(BASE_PATH, course_id, 'lesson.json')
            if not os.path.exists(file_path):
                return json({"error": f"Lesson not found for Course ID: {course_id}, Lesson ID: {lesson_id}"}, status=404)

        # Read existing data
        with open(file_path, 'r') as file:
            existing_data = json_module.load(file)

        # Update only the specified fields
        existing_data.update(update_data)

        # Write the updated data to the file
        with open(file_path, 'w') as file:
            json_module.dump(existing_data, file, indent=4)
        
        return json({"message": "Lesson information updated successfully"})

    except json_module.JSONDecodeError:
        return json({"error": "Invalid JSON data in request"}, status=400)
    except Exception as e:
        return json({"error": f"Failed to update lesson information: {str(e)}"}, status=500)

@course_file_bp.route("/<course_id>/lesson/<lesson_id>/background", methods=["PUT"])
async def update_lesson_background(request, course_id, lesson_id):
    try:
        if 'file' not in request.files:
            return json({"error": "No file provided"}, status=400)

        file = request.files['file'][0]
        if not file.name or not file.name.lower().endswith(('.jpg', '.jpeg')):
            return json({"error": "Invalid file format. Only JPG files are allowed"}, status=400)

        # Ensure the lesson directory exists
        lesson_dir = os.path.join(BASE_PATH, course_id, 'lesson', lesson_id)
        os.makedirs(lesson_dir, exist_ok=True)

        # Define the path for bg.jpg
        bg_path = os.path.join(lesson_dir, 'bg.jpg')

        # Save the uploaded file
        async with aiofiles.open(bg_path, 'wb') as f:
            await f.write(file.body)

        return json({"message": "Background image updated successfully"})

    except Exception as e:
        return json({"error": f"Failed to update background image: {str(e)}"}, status=500)

# Add more route handlers for course file operations here
