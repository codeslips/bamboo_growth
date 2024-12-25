from sanic import Blueprint, json
from database import Database
from datetime import datetime
import uuid

lesson_bp = Blueprint("lesson", url_prefix="/api/v1/course")

def serialize_lesson(lesson):
    return {
        'course_hash': lesson['course_hash'],
        'lesson_hash': lesson['lesson_hash'],
        'order_index': lesson['order_index'],
        'is_visible': lesson['is_visible'],
        'title': lesson['title'],
        'file_path': lesson['file_path'],
        'description': lesson['description'],
        'duration_minutes': lesson['duration_minutes'],
        'is_active': lesson['is_active'],
        'is_preview': lesson['is_preview'],
        'is_published': lesson['is_published'],
        'created_by': lesson['created_by'],
        'from_course': lesson['from_course']
    }

@lesson_bp.route("/<course_hash>/lessons")
async def get_course_lessons(request, course_hash):
    try:
        # First verify the course exists
        course_query = "SELECT hash FROM courses WHERE hash = $1"
        course = await Database.fetchrow(course_query, course_hash)
        
        if not course:
            return json({"error": "Course not found"}, status=404)
        
        # Get filter parameters from query string
        is_visible = request.args.get('is_visible', 'true').lower() == 'true'
        
        # Updated query with specific fields from lessons table
        query = """
            SELECT 
                cl.course_hash, 
                cl.lesson_hash, 
                cl.order_index, 
                cl.is_visible,
                l.title,
                l.file_path,
                l.description,
                l.duration_minutes,
                l.is_active,
                l.is_preview,
                l.is_published,
                l.created_by,
                l.from_course
            FROM course_lessons cl
            JOIN lessons l ON cl.lesson_hash = l.hash
            WHERE cl.course_hash = $1 AND cl.is_visible = $2
            ORDER BY cl.order_index ASC
        """
        
        lessons = await Database.fetch(query, course_hash, is_visible)
        
        return json([serialize_lesson(lesson) for lesson in lessons])
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_bp.route("/<course_hash>/lessons/<lesson_hash>")
async def get_course_lesson(request, course_hash, lesson_hash):
    try:
        query = """
            SELECT 
                cl.course_hash, 
                cl.lesson_hash, 
                cl.order_index, 
                cl.is_visible,
                l.title,
                l.file_path,
                l.description,
                l.duration_minutes,
                l.is_active,
                l.is_preview,
                l.is_published,
                l.created_by,
                l.from_course
            FROM course_lessons cl
            JOIN lessons l ON cl.lesson_hash = l.hash
            WHERE cl.course_hash = $1 AND cl.lesson_hash = $2
        """
        
        lesson = await Database.fetchrow(query, course_hash, lesson_hash)
        
        if not lesson:
            return json({"error": "Lesson not found"}, status=404)
            
        return json(serialize_lesson(lesson))
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_bp.route("/<course_hash>/lessons", methods=["POST"])
async def create_lesson(request, course_hash):
    try:
        # First verify the course exists
        course_query = "SELECT hash FROM courses WHERE hash = $1"
        course = await Database.fetchrow(course_query, course_hash)
        
        if not course:
            return json({"error": "Course not found"}, status=404)

        data = request.json
        lesson_hash = str(uuid.uuid4())[:8]
        
        # Get the maximum order_index for the course
        max_order_query = """
            SELECT COALESCE(MAX(order_index), -1) 
            FROM course_lessons 
            WHERE course_hash = $1
        """
        max_order = await Database.fetchval(max_order_query, course_hash)
        new_order = max_order + 1

        query = """
            INSERT INTO course_lessons (
                course_hash, lesson_hash, order_index, is_visible
            ) VALUES ($1, $2, $3, $4)
            RETURNING lesson_hash
        """
        
        values = (
            course_hash,
            lesson_hash,
            new_order,
            data.get('is_visible', True)
        )
        
        result = await Database.fetchval(query, *values)
        return json({"lesson_hash": result, "message": "Lesson created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_bp.route("/<course_hash>/lessons/<lesson_hash>", methods=["PUT"])
async def update_lesson(request, course_hash, lesson_hash):
    try:
        data = request.json
        
        if 'is_visible' not in data:
            return json({"error": "No valid fields to update"}, status=400)
        
        query = """
            UPDATE course_lessons 
            SET is_visible = $3
            WHERE course_hash = $1 AND lesson_hash = $2
            RETURNING lesson_hash
        """
        
        result = await Database.fetchval(query, course_hash, lesson_hash, data['is_visible'])
        
        if not result:
            return json({"error": "Lesson not found"}, status=404)
            
        return json({"message": "Lesson updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_bp.route("/<course_hash>/lessons/<lesson_hash>", methods=["DELETE"])
async def delete_lesson(request, course_hash, lesson_hash):
    try:
        query = """
            DELETE FROM course_lessons
            WHERE course_hash = $1 AND lesson_hash = $2
            RETURNING lesson_hash
        """
        
        result = await Database.fetchval(query, course_hash, lesson_hash)
        
        if not result:
            return json({"error": "Lesson not found"}, status=404)
            
        return json({"message": "Lesson deleted successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_bp.route("/<course_hash>/lessons/reorder", methods=["POST"])
async def reorder_lessons(request, course_hash):
    try:
        data = request.json
        
        if 'lesson_order' not in data:
            return json({"error": "lesson_order is required"}, status=400)
            
        lesson_order = data['lesson_order']  # List of lesson_hash in desired order
        
        # Update each lesson's order
        for index, lesson_hash in enumerate(lesson_order):
            query = """
                UPDATE course_lessons
                SET order_index = $1
                WHERE course_hash = $2 AND lesson_hash = $3
            """
            await Database.execute(query, index, course_hash, lesson_hash)
            
        return json({"message": "Lesson order updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500) 