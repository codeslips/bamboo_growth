from sanic import Blueprint, json, Request, HTTPResponse
from database import Database
import uuid
from datetime import datetime
import json as json_lib
from functools import wraps
import os
from typing import List, Dict, Any, Optional

# Constants
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
PAGE_TABLE = f"{TABLE_PREFIX}_pages"

PAGE_TYPES = [
    'knowledge', 'lesson', 'course', 'quiz', 'survey',
    'resource', 'group', 'user', 'note', 'user-lesson'
]

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 10

page_bp = Blueprint("page", url_prefix="/api/v1/pages")

def serialize_page(page: Dict[str, Any]) -> Dict[str, Any]:
    """
    Serialize page dictionary by converting datetime objects to ISO format strings.
    
    Args:
        page: Dictionary containing page data
        
    Returns:
        Dict with datetime values converted to ISO format strings
    """
    page_dict = dict(page)
    return {
        key: value.isoformat() if isinstance(value, datetime) else value
        for key, value in page_dict.items()
    }

def check_page_ownership(func):
    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs) -> HTTPResponse:
        try:
            page_hash = kwargs.get('page_hash')
            user: Optional[Dict[str, Any]] = getattr(request.ctx, 'user', None)
            
            if not user:
                return json({"error": "Authentication required"}, status=401)
            
            if user['role'] == 'admin':
                return await func(request, *args, **kwargs)
            
            query = f"SELECT created_by_hash FROM {PAGE_TABLE} WHERE hash = $1"
            created_by = await Database.fetchval(query, page_hash)
            
            if not created_by or created_by != user['hash']:
                return json(
                    {"error": "You don't have permission to modify this page"},
                    status=403
                )
            
            return await func(request, *args, **kwargs)
            
        except Exception as e:
            return json({"error": str(e)}, status=500)
    
    return wrapper

# Route handlers
@page_bp.route("/")
async def pages_root(request: Request) -> HTTPResponse:
    """Root endpoint for Pages API."""
    return json({"message": "Pages API"})

@page_bp.route("/list")
async def pages_list(request: Request) -> HTTPResponse:
    """List all pages ordered by creation date."""
    try:
        query = f"SELECT * FROM {PAGE_TABLE} ORDER BY created_at DESC"
        pages = await Database.fetch(query)
        return json([serialize_page(page) for page in pages])
    except Exception as e:
        return json({"error": str(e)}, status=500)

@page_bp.route("/<page_hash>")
async def get_page(request, page_hash):
    try:
        query = f"SELECT * FROM {PAGE_TABLE} WHERE hash = $1"
        page = await Database.fetchrow(query, page_hash)
        
        if not page:
            return json({"error": "Page not found"}, status=404)
            
        return json(serialize_page(page))
    except Exception as e:
        return json({"error": str(e)}, status=500)

@page_bp.route("/", methods=["POST"])
async def create_page(request):
    try:
        data = request.json
        
        # Get user from request context
        user = request.ctx.user if hasattr(request.ctx, 'user') else None
        created_by_hash = user['hash'] if user else None

        # For user-student-lesson type, extract student and lesson hash
        if data.get('page_type') == 'user-student-lesson':
            student_hash = data.get('page_hash').split('-')[0]
            lesson_hash = data.get('page_hash').split('-')[1]
            
            # Query user_lessons table to get teacher_hash
            query = f"SELECT teacher_hash FROM {TABLE_PREFIX}_user_lessons WHERE user_hash = $1 AND lesson_hash = $2"
            teacher_hash = await Database.fetchval(query, student_hash, lesson_hash)
            
            # Set created_by_hash to the teacher_hash if found
            if teacher_hash and teacher_hash == created_by_hash:
                created_by_hash = student_hash
                data['page_type'] = 'user-lesson'
            else:
                return json({"error": "You don't have permission to create this page"}, status=403)
        
        # Validate required fields
        required_fields = ['page_title', 'page_type', 'page_version']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Validate page type
        if data['page_type'] not in PAGE_TYPES:
            return json({"error": f"Invalid page type. Must be one of: {', '.join(PAGE_TYPES)}"}, 
                       status=400)
        
        # Generate hash
        page_hash = str(uuid.uuid4())[:8]
        if data.get('page_type') in ['lesson', 'user-lesson'] and data.get('page_hash'):
            page_hash = data.get('page_hash')
        
        # Convert dictionary fields to JSON strings
        page_history = json_lib.dumps(data.get('page_history', {}))
        
        query = f"""
            INSERT INTO {PAGE_TABLE} (
                hash, page_content, page_title, page_type,
                page_version, page_history, created_by_hash,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $8
            ) RETURNING hash
        """
        
        now = datetime.utcnow()
        values = (
            page_hash,
            data.get('page_content'),
            data['page_title'],
            data['page_type'],
            data['page_version'],
            page_history,
            created_by_hash,
            now
        )
        
        result = await Database.fetchval(query, *values)
        return json({"hash": result, "message": "Page created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@page_bp.route("/<page_hash>", methods=["PUT"])
@check_page_ownership
async def update_page(request, page_hash):
    try:
        data = request.json
        
        # Validate page type if provided
        if 'page_type' in data and data['page_type'] not in PAGE_TYPES:
            return json({"error": f"Invalid page type. Must be one of: {', '.join(PAGE_TYPES)}"}, 
                       status=400)
        
        # Convert dictionary fields to JSON strings if they exist
        if 'page_history' in data:
            data['page_history'] = json_lib.dumps(data['page_history'])
        
        # Build update query dynamically based on provided fields
        update_fields = []
        values = [page_hash]  # First parameter is page_hash
        param_count = 1
        
        updateable_fields = [
            'page_content', 'page_title', 'page_type',
            'page_version', 'page_history'
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
            UPDATE {PAGE_TABLE} 
            SET {', '.join(update_fields)}
            WHERE hash = $1
            RETURNING hash
        """
        
        result = await Database.fetchval(query, *values)
        
        if not result:
            return json({"error": "Page not found"}, status=404)
            
        return json({"message": "Page updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@page_bp.route("/search")
async def search_pages(request: Request) -> HTTPResponse:
    """
    Search pages with filtering and pagination.
    
    Query parameters:
        page_type: Filter by page type
        search: Search term for title and content
        page: Page number (default: 1)
        page_size: Results per page (default: 10, max: 100)
    """
    try:
        page_type = request.args.get('page_type')
        search_term = request.args.get('search')
        
        try:
            page = max(1, int(request.args.get('page', 1)))
            page_size = min(
                max(1, int(request.args.get('page_size', DEFAULT_PAGE_SIZE))),
                MAX_PAGE_SIZE
            )
        except ValueError:
            return json({"error": "Invalid pagination parameters"}, status=400)
        
        offset = (page - 1) * page_size
        
        conditions = []
        values = []
        
        if page_type:
            if page_type not in PAGE_TYPES:
                return json({
                    "error": f"Invalid page type. Must be one of: {', '.join(PAGE_TYPES)}"
                }, status=400)
            conditions.append("page_type = $1")
            values.append(page_type)
            
        if search_term:
            param_idx = len(values) + 1
            conditions.append(
                f"(page_title ILIKE ${param_idx} OR page_content ILIKE ${param_idx})"
            )
            values.append(f"%{search_term}%")
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM {PAGE_TABLE} {where_clause}"
        total_count = await Database.fetchval(count_query, *values)
        
        # Get paginated results
        query = f"""
            SELECT * FROM {PAGE_TABLE} 
            {where_clause}
            ORDER BY created_at DESC
            OFFSET ${len(values) + 1} LIMIT ${len(values) + 2}
        """
        values.extend([offset, page_size])
        
        pages = await Database.fetch(query, *values)
        total_pages = (total_count + page_size - 1) // page_size
        
        return json({
            "items": [serialize_page(page) for page in pages],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages
            }
        })
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@page_bp.route("/<page_hash>", methods=["DELETE"])
@check_page_ownership
async def delete_page(request, page_hash):
    try:
        query = f"DELETE FROM {PAGE_TABLE} WHERE hash = $1 RETURNING hash"
        result = await Database.fetchval(query, page_hash)
        
        if not result:
            return json({"error": "Page not found"}, status=404)
            
        return json({"message": "Page deleted successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
