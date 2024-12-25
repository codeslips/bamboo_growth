from sanic import Blueprint, json
from database import Database
from datetime import datetime
from utils.auth import admin_required

lesson_type_bp = Blueprint("lesson_type", url_prefix="/api/v1/lesson-types")

def serialize_lesson_type(lesson_type):
    lesson_type_dict = dict(lesson_type)
    # Convert datetime objects to ISO format strings
    for key, value in lesson_type_dict.items():
        if isinstance(value, datetime):
            lesson_type_dict[key] = value.isoformat()
    return lesson_type_dict

@lesson_type_bp.route("/")
async def lesson_type_root(request):
    return json({"message": "Lesson Types API"})

@lesson_type_bp.route("/list")
async def lesson_type_list(request):
    try:
        query = """
            SELECT * FROM lesson_types 
            WHERE is_active = true 
            ORDER BY created_at DESC
        """
        lesson_types = await Database.fetch(query)
        return json([serialize_lesson_type(lt) for lt in lesson_types])
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_type_bp.route("/<name>")
async def get_lesson_type(request, name):
    try:
        query = "SELECT * FROM lesson_types WHERE name = $1"
        lesson_type = await Database.fetchrow(query, name)
        
        if not lesson_type:
            return json({"error": "Lesson type not found"}, status=404)
            
        return json(serialize_lesson_type(lesson_type))
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_type_bp.route("/", methods=["POST"])
async def create_lesson_type(request):
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['name', 'content_template']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Check if lesson type already exists
        existing = await Database.fetchval(
            "SELECT name FROM lesson_types WHERE name = $1",
            data['name']
        )
        if existing:
            return json({"error": "Lesson type with this name already exists"}, status=400)
        
        query = """
            INSERT INTO lesson_types (
                name, description, content_template, is_active,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING name
        """
        
        now = datetime.utcnow()
        values = (
            data['name'],
            data.get('description', ''),
            data['content_template'],
            data.get('is_active', True),
            now
        )
        
        result = await Database.fetchval(query, *values)
        return json({"name": result, "message": "Lesson type created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_type_bp.route("/<name>", methods=["PUT"])
async def update_lesson_type(request, name):
    try:
        data = request.json
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = [name]  # First parameter is name
        param_count = 1
        
        updateable_fields = [
            'description', 'content_template', 'is_active'
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
            UPDATE lesson_types 
            SET {', '.join(update_fields)}
            WHERE name = $1
            RETURNING name
        """
        
        result = await Database.fetchval(query, *values)
        
        if not result:
            return json({"error": "Lesson type not found"}, status=404)
            
        return json({"message": "Lesson type updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_type_bp.route("/search")
async def search_lesson_types(request):
    try:
        # Get search parameters
        is_active = request.args.get('is_active')
        search_term = request.args.get('search')
        
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
        conditions = []
        values = []
        param_count = 0
        
        if is_active is not None:
            param_count += 1
            conditions.append(f"is_active = ${param_count}")
            values.append(is_active.lower() == 'true')
            
        if search_term:
            param_count += 1
            conditions.append(f"(name ILIKE ${param_count} OR description ILIKE ${param_count})")
            values.append(f"%{search_term}%")
        
        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM lesson_types{where_clause}"
        total_count = await Database.fetchval(count_query, *values)
        
        # Get paginated results
        param_count += 1
        param_count += 1
        query = f"""
            SELECT * FROM lesson_types
            {where_clause}
            ORDER BY created_at DESC
            OFFSET ${param_count-1} LIMIT ${param_count}
        """
        values.extend([offset, page_size])
        
        lesson_types = await Database.fetch(query, *values)
        
        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size
        
        return json({
            "items": [serialize_lesson_type(lt) for lt in lesson_types],
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

@lesson_type_bp.route("/<name>/toggle-status", methods=["POST"])
async def toggle_lesson_type_status(request, name):
    try:
        data = request.json
        if 'value' not in data:
            return json({"error": "value is required"}, status=400)
        
        query = """
            UPDATE lesson_types 
            SET is_active = $2, updated_at = $3
            WHERE name = $1
            RETURNING name
        """
        
        result = await Database.fetchval(query, name, data['value'], datetime.utcnow())
        
        if not result:
            return json({"error": "Lesson type not found"}, status=404)
            
        return json({"message": "Lesson type status updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@lesson_type_bp.route("/<name>", methods=["DELETE"])
@admin_required
async def delete_lesson_type(request, name):
    try:
        query = """
            DELETE FROM lesson_types 
            WHERE name = $1
            RETURNING name
        """
        
        result = await Database.fetchval(query, name)
        
        if not result:
            return json({"error": "Lesson type not found"}, status=404)
            
        return json({
            "message": "Lesson type deleted successfully",
            "deleted": name
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
