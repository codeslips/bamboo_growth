from sanic import Blueprint, json
from database import Database
import uuid
from datetime import datetime
from decimal import Decimal

course_bp = Blueprint("course", url_prefix="/api/v1/course")

def serialize_course(course):
    course_dict = dict(course)
    # Convert datetime objects to ISO format strings
    for key, value in course_dict.items():
        if isinstance(value, datetime):
            course_dict[key] = value.isoformat()
        elif isinstance(value, Decimal):
            course_dict[key] = float(value)
    return course_dict

@course_bp.route("/")
async def course_root(request):
    return json({"message": "Course API"})

@course_bp.route("/list")
async def course_list(request):
    try:
        query = """
            SELECT * FROM courses 
            WHERE is_active = true 
            ORDER BY created_at DESC
        """
        courses = await Database.fetch(query)
        return json([serialize_course(course) for course in courses])
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/<course_hash>")
async def get_course(request, course_hash):
    try:
        query = "SELECT * FROM courses WHERE hash = $1"
        course = await Database.fetchrow(query, course_hash)
        
        if not course:
            return json({"error": "Course not found"}, status=404)
            
        return json(serialize_course(course))
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/", methods=["POST"])
async def create_course(request):
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['title', 'description', 'language', 'folder_name', 
                         'difficulty', 'duration_hours', 'learning_objectives']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Generate hash
        course_hash = str(uuid.uuid4())[:8]
        
        query = """
            INSERT INTO courses (
                hash, title, description, language, folder_name, difficulty,
                duration_hours, prerequisites, learning_objectives, status,
                thumbnail, created_at, updated_at, is_active
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, true
            ) RETURNING hash
        """
        
        now = datetime.utcnow()
        values = (
            course_hash,
            data['title'],
            data['description'],
            data['language'],
            data['folder_name'],
            data['difficulty'],
            Decimal(str(data['duration_hours'])),
            data.get('prerequisites', ''),
            data['learning_objectives'],
            data.get('status', 'DRAFT'),
            data.get('thumbnail'),
            now
        )
        
        result = await Database.fetchval(query, *values)
        return json({"hash": result, "message": "Course created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/<course_hash>", methods=["PUT"])
async def update_course(request, course_hash):
    try:
        data = request.json
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = [course_hash]  # First parameter is course_hash
        param_count = 1
        
        updateable_fields = [
            'title', 'description', 'language', 'folder_name', 'difficulty',
            'duration_hours', 'prerequisites', 'learning_objectives', 'status',
            'thumbnail', 'is_active'
        ]
        
        for field in updateable_fields:
            if field in data:
                param_count += 1
                update_fields.append(f"{field} = ${param_count}")
                values.append(data[field])
        
        if not update_fields:
            return json({"error": "No valid fields to update"}, status=400)
        
        # Add updated_at
        param_count += 1
        update_fields.append(f"updated_at = ${param_count}")
        values.append(datetime.utcnow())
        
        query = f"""
            UPDATE courses 
            SET {', '.join(update_fields)}
            WHERE hash = $1
            RETURNING hash
        """
        
        result = await Database.fetchval(query, *values)
        
        if not result:
            return json({"error": "Course not found"}, status=404)
            
        return json({"message": "Course updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/<course_hash>/rating", methods=["POST"])
async def update_course_rating(request, course_hash):
    try:
        data = request.json
        if 'rating' not in data:
            return json({"error": "Rating is required"}, status=400)
            
        rating = float(data['rating'])
        if not (0 <= rating <= 5):
            return json({"error": "Rating must be between 0 and 5"}, status=400)
        
        query = """
            UPDATE courses 
            SET average_rating = COALESCE(
                (COALESCE(average_rating, 0) + $2) / 2,
                $2
            )
            WHERE hash = $1
            RETURNING hash
        """
        
        result = await Database.fetchval(query, course_hash, rating)
        
        if not result:
            return json({"error": "Course not found"}, status=404)
            
        return json({"message": "Course rating updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/<course_hash>/enroll", methods=["POST"])
async def enroll_course(request, course_hash):
    try:
        query = """
            UPDATE courses 
            SET enrollment_count = enrollment_count + 1
            WHERE hash = $1 AND status = 'PUBLISHED'
            RETURNING hash
        """
        
        result = await Database.fetchval(query, course_hash)
        
        if not result:
            return json({"error": "Course not found or not published"}, status=404)
            
        return json({"message": "Enrollment count updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@course_bp.route("/search")
async def search_courses(request):
    try:
        # Get search parameters
        language = request.args.get('language')
        difficulty = request.args.get('difficulty')
        status = request.args.get('status')
        
        # Build query conditions
        conditions = ["is_active = true"]
        values = []
        param_count = 0
        
        if language:
            param_count += 1
            conditions.append(f"language = ${param_count}")
            values.append(language)
            
        if difficulty:
            param_count += 1
            conditions.append(f"difficulty = ${param_count}")
            values.append(difficulty)
            
        if status:
            param_count += 1
            conditions.append(f"status = ${param_count}")
            values.append(status)
        
        query = f"""
            SELECT * FROM courses 
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC
        """
        
        courses = await Database.fetch(query, *values)
        return json([serialize_course(course) for course in courses])
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
