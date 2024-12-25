from sanic import Blueprint, json
from database import Database
import uuid
from datetime import datetime
import json as json_lib  # Import json as json_lib to avoid conflict with sanic.json
from functools import wraps

lessons_bp = Blueprint("lessons", url_prefix="/api/v1/lessons")

ALL_LESSON_TYPES = ['DUBBING', 'READING', 'LISTENING', 'SPEAKING', 'QUIZ', 'VIDEO', 'EXERCISE']
LESSON_TYPES = ['DUBBING', 'SPEAKING', 'CODING', 'BASIC']


def serialize_lesson(lesson):
    lesson_dict = dict(lesson)
    # Convert datetime objects to ISO format strings
    for key, value in lesson_dict.items():
        if isinstance(value, datetime):
            lesson_dict[key] = value.isoformat()
    return lesson_dict

def check_lesson_ownership(func):
    @wraps(func)
    async def wrapper(request, *args, **kwargs):
        try:
            lesson_hash = kwargs.get('lesson_hash')
            user = request.ctx.user if hasattr(request.ctx, 'user') else None
            
            if not user:
                return json({"error": "Authentication required"}, status=401)
            
            # Check if user is admin
            if user['role'] == 'admin':
                return await func(request, *args, **kwargs)
            
            # Check lesson ownership
            query = "SELECT created_by FROM lessons WHERE hash = $1"
            created_by = await Database.fetchval(query, lesson_hash)
            
            if not created_by or created_by != user['hash']:
                return json({"error": "You don't have permission to modify this lesson"}, status=403)
            
            return await func(request, *args, **kwargs)
            
        except Exception as e:
            return json({"error": str(e)}, status=500)
    
    return wrapper

@lessons_bp.route("/")
async def lessons_root(request):
    return json({"message": "Lessons API"})

@lessons_bp.route("/list")
async def lessons_list(request):
    try:
        query = """
            SELECT * FROM lessons 
            WHERE is_active = true 
            ORDER BY created_at DESC
        """
        lessons = await Database.fetch(query)
        return json([serialize_lesson(lesson) for lesson in lessons])
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/<lesson_hash>")
async def get_lesson(request, lesson_hash):
    try:
        query = "SELECT * FROM lessons WHERE hash = $1"
        lesson = await Database.fetchrow(query, lesson_hash)
        
        if not lesson:
            return json({"error": "Lesson not found"}, status=404)
            
        return json(serialize_lesson(lesson))
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/", methods=["POST"])
async def create_lesson(request):
    try:
        data = request.json
        
        # Get user from request context
        user = request.ctx.user if hasattr(request.ctx, 'user') else None
        created_by = user['hash'] if user else 'SYSTEM'
        
        # Validate required fields
        required_fields = ['title', 'lesson_type']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Validate lesson type
        if data['lesson_type'] not in LESSON_TYPES:
            return json({"error": f"Invalid lesson type. Must be one of: {', '.join(LESSON_TYPES)}"}, 
                       status=400)
        
        # Generate hash
        lesson_hash = str(uuid.uuid4())[:8]
        
        # Convert dictionary/list fields to JSON strings
        lesson_content = json_lib.dumps(data.get('lesson_content', {}))
        base_knowledges = json_lib.dumps(data.get('base_knowledges', []))
        target_knowledges = json_lib.dumps(data.get('target_knowledges', []))
        
        query = """
            INSERT INTO lessons (
                hash, title, lesson_type, lesson_content, file_path,
                description, target, base_knowledges,
                target_knowledges, duration_minutes, is_active, is_preview,
                is_published, created_by, created_at, updated_at, from_course
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, $16
            ) RETURNING hash
        """
        
        now = datetime.utcnow()
        values = (
            lesson_hash,
            data['title'],
            data['lesson_type'],
            lesson_content,
            data.get('file_path'),
            data.get('description'),
            data.get('target'),
            base_knowledges,
            target_knowledges,
            data.get('duration_minutes'),
            data.get('is_active', True),
            data.get('is_preview', False),
            data.get('is_published', False),
            created_by,
            now,
            data.get('from_course')
        )
        
        result = await Database.fetchval(query, *values)
        return json({"hash": result, "message": "Lesson created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/<lesson_hash>", methods=["PUT"])
async def update_lesson(request, lesson_hash):
    try:
        data = request.json
        
        # Get user from request context
        user = request.ctx.user if hasattr(request.ctx, 'user') else None
        if user:
            data['created_by'] = user.get('hash')
        
        # Validate lesson type if provided
        if 'lesson_type' in data and data['lesson_type'] not in LESSON_TYPES:
            return json({"error": f"Invalid lesson type. Must be one of: {', '.join(LESSON_TYPES)}"}, 
                       status=400)
        
        # Convert dictionary/list fields to JSON strings if they exist in the data
        if 'lesson_content' in data:
            data['lesson_content'] = json_lib.dumps(data['lesson_content'])
        if 'base_knowledges' in data:
            data['base_knowledges'] = json_lib.dumps(data['base_knowledges'])
        if 'target_knowledges' in data:
            data['target_knowledges'] = json_lib.dumps(data['target_knowledges'])
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = [lesson_hash]  # First parameter is lesson_hash
        param_count = 1
        
        updateable_fields = [
            'title', 'lesson_type', 'lesson_content', 'file_path',
            'thumbnail_path', 'description', 'target', 'base_knowledges',
            'target_knowledges', 'duration_minutes', 'is_active', 'is_preview',
            'is_published', 'created_by', 'from_course'
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
            UPDATE lessons 
            SET {', '.join(update_fields)}
            WHERE hash = $1
            RETURNING hash
        """
        
        print(query, values)
        result = await Database.fetchval(query, *values)
        
        if not result:
            return json({"error": "Lesson not found"}, status=404)
            
        return json({"message": "Lesson updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/search")
async def search_lessons(request):
    try:
        # Get search parameters
        lesson_type = request.args.get('lesson_type')
        is_preview = request.args.get('is_preview')
        is_published = request.args.get('is_published')
        
        # Get pagination parameters
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        
        # Validate pagination parameters
        if page < 1:
            return json({"error": "Page number must be greater than 0"}, status=400)
        if page_size < 1 or page_size > 100:
            return json({"error": "Page size must be between 1 and 100"}, status=400)
        
        # Calculate offset
        offset = (page - 1) * page_size
        
        # Build query conditions
        conditions = ["is_active = true"]
        values = []
        param_count = 0
        
        if lesson_type:
            if lesson_type not in LESSON_TYPES:
                return json({"error": f"Invalid lesson type. Must be one of: {', '.join(LESSON_TYPES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"lesson_type = ${param_count}")
            values.append(lesson_type)
            
        if is_preview is not None:
            param_count += 1
            conditions.append(f"is_preview = ${param_count}")
            values.append(is_preview.lower() == 'true')
            
        if is_published is not None:
            param_count += 1
            conditions.append(f"is_published = ${param_count}")
            values.append(is_published.lower() == 'true')
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) FROM lessons 
            WHERE {' AND '.join(conditions)}
        """
        total_count = await Database.fetchval(count_query, *values)
        
        # Get paginated results
        param_count += 1
        param_count += 1
        query = f"""
            SELECT * FROM lessons 
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC
            OFFSET ${param_count-1} LIMIT ${param_count}
        """
        values.extend([offset, page_size])
        
        lessons = await Database.fetch(query, *values)
        
        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size
        
        return json({
            "items": [serialize_lesson(lesson) for lesson in lessons],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages
            }
        })
        
    except ValueError as ve:
        return json({"error": "Invalid pagination parameters"}, status=400)
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/<lesson_hash>/toggle-status", methods=["POST"])
async def toggle_lesson_status(request, lesson_hash):
    try:
        data = request.json
        if 'status_field' not in data or 'value' not in data:
            return json({"error": "status_field and value are required"}, status=400)
            
        valid_status_fields = ['is_active', 'is_preview', 'is_published']
        status_field = data['status_field']
        
        if status_field not in valid_status_fields:
            return json({"error": f"Invalid status field. Must be one of: {', '.join(valid_status_fields)}"}, 
                       status=400)
        
        query = f"""
            UPDATE lessons 
            SET {status_field} = $2, updated_at = $3
            WHERE hash = $1
            RETURNING hash
        """
        
        result = await Database.fetchval(query, lesson_hash, data['value'], datetime.utcnow())
        
        if not result:
            return json({"error": "Lesson not found"}, status=404)
            
        return json({"message": f"Lesson {status_field} updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/<lesson_hash>", methods=["DELETE"])
@check_lesson_ownership
async def delete_lesson(request, lesson_hash):
    try:
        # Soft delete by setting is_active to false
        query = """
            UPDATE lessons 
            SET is_active = false, updated_at = $2
            WHERE hash = $1 
            RETURNING hash
        """
        
        result = await Database.fetchval(query, lesson_hash, datetime.utcnow())
        
        if not result:
            return json({"error": "Lesson not found"}, status=404)
            
        return json({"message": "Lesson deleted successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lessons_bp.route("/<lesson_hash>/content", methods=["PATCH"])
@check_lesson_ownership
async def update_lesson_content(request, lesson_hash):
    try:
        data = request.json
        
        if not isinstance(data, dict):
            return json({"error": "Request body must be a JSON object"}, status=400)
            
        # First, get the current lesson_content
        query = "SELECT lesson_content FROM lessons WHERE hash = $1"
        current_content = await Database.fetchval(query, lesson_hash)
        
        if current_content is None:
            return json({"error": "Lesson not found"}, status=404)
            
        try:
            # Parse the current content
            current_content = json_lib.loads(current_content) if current_content else {}
        except json_lib.JSONDecodeError:
            current_content = {}  # Reset to empty dict if current content is invalid
            
        # Update only the specified keys
        current_content.update(data)
        
        # Update the lesson_content in the database
        update_query = """
            UPDATE lessons 
            SET lesson_content = $1, updated_at = $2
            WHERE hash = $3
            RETURNING hash
        """
        
        result = await Database.fetchval(
            update_query,
            json_lib.dumps(current_content),
            datetime.utcnow(),
            lesson_hash
        )
        
        if not result:
            return json({"error": "Failed to update lesson content"}, status=500)
            
        return json({
            "message": "Lesson content updated successfully",
            "lesson_content": current_content
        })
        
    except json_lib.JSONDecodeError:
        return json({"error": "Invalid JSON in request body"}, status=400)
    except Exception as e:
        return json({"error": str(e)}, status=500)
