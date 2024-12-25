from sanic import Blueprint, json
from database import Database
import uuid
from datetime import datetime
import json as json_lib
from functools import wraps
import os

resources_bp = Blueprint("resources", url_prefix="/api/v1/resources")

TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')

STORAGE_TYPES = ['file', 'object']
RESOURCE_TYPES = ['audio', 'video', 'page', 'image', 'document', 'subtitle', 'other']
STATUS_CHOICES = ['active', 'deleted', 'processing', 'error']

def serialize_resource(resource):
    resource_dict = dict(resource)
    # Convert datetime objects to ISO format strings
    for key, value in resource_dict.items():
        if isinstance(value, datetime):
            resource_dict[key] = value.isoformat()
    return resource_dict

def check_resource_ownership(func):
    @wraps(func)
    async def wrapper(request, *args, **kwargs):
        try:
            resource_hash = kwargs.get('resource_hash')
            user = request.ctx.user if hasattr(request.ctx, 'user') else None
            
            if not user:
                return json({"error": "Authentication required"}, status=401)
            
            # Check if user is admin
            if user['role'] == 'admin':
                return await func(request, *args, **kwargs)
            
            # Check resource ownership
            query = f"SELECT created_by FROM {TABLE_PREFIX}_resources WHERE hash = $1"
            created_by = await Database.fetchval(query, resource_hash)
            
            if not created_by or created_by != user['hash']:
                return json({"error": "You don't have permission to modify this resource"}, status=403)
            
            return await func(request, *args, **kwargs)
            
        except Exception as e:
            return json({"error": str(e)}, status=500)
    
    return wrapper

@resources_bp.route("/")
async def resources_root(request):
    return json({"message": "Resources API"})

@resources_bp.route("/list")
async def resources_list(request):
    try:
        user = request.ctx.user if hasattr(request.ctx, 'user') else None
        if not user:
            return json({"error": "Authentication required"}, status=401)

        # Get pagination parameters
        try:
            limit = int(request.args.get('limit', 10))
            offset = int(request.args.get('offset', 0))
        except ValueError:
            return json({"error": "Invalid pagination parameters"}, status=400)

        # Get filter parameters
        resource_type = request.args.get('resource_type')
        storage_type = request.args.get('storage_type')
        status = request.args.get('status')
        current_user = request.args.get('current_user', 'true').lower() == 'true'

        # Build query conditions
        conditions = ["status != 'deleted'"]
        params = []
        param_count = 0

        # Add user filter based on current_user parameter and role
        if current_user and user['role'] not in ['admin']:
            param_count += 1
            conditions.append(f"created_by = ${param_count}")
            params.append(user['hash'])

        if resource_type:
            if resource_type not in RESOURCE_TYPES:
                return json({"error": f"Invalid resource type. Must be one of: {', '.join(RESOURCE_TYPES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"resource_type = ${param_count}")
            params.append(resource_type)

        if storage_type:
            if storage_type not in STORAGE_TYPES:
                return json({"error": f"Invalid storage type. Must be one of: {', '.join(STORAGE_TYPES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"storage_type = ${param_count}")
            params.append(storage_type)

        if status:
            if status not in STATUS_CHOICES:
                return json({"error": f"Invalid status. Must be one of: {', '.join(STATUS_CHOICES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"status = ${param_count}")
            params.append(status)

        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total 
            FROM {TABLE_PREFIX}_resources
            WHERE {' AND '.join(conditions)}
        """
        count_result = await Database.fetchrow(count_query, *params)
        total = count_result['total']

        # Main query with pagination
        param_count += 1
        param_count += 1
        query = f"""
            SELECT r.*,
                   u.email as creator_email,
                   u.full_name as creator_name
            FROM {TABLE_PREFIX}_resources r
            LEFT JOIN {TABLE_PREFIX}_users u ON r.created_by = u.hash
            WHERE {' AND '.join(conditions)}
            ORDER BY r.created_at DESC
            OFFSET ${param_count-1} LIMIT ${param_count}
        """
        params.extend([offset, limit])

        resources = await Database.fetch(query, *params)

        return json({
            "items": [serialize_resource(resource) for resource in resources],
            "total": total,
            "has_more": (offset + len(resources)) < total,
            "pagination": {
                "offset": offset,
                "limit": limit,
                "total": total
            }
        })

    except Exception as e:
        return json({"error": str(e)}, status=500)

@resources_bp.route("/<resource_hash>")
async def get_resource(request, resource_hash):
    try:
        query = f"SELECT * FROM {TABLE_PREFIX}_resources WHERE hash = $1"
        resource = await Database.fetchrow(query, resource_hash)
        
        if not resource:
            return json({"error": "Resource not found"}, status=404)
            
        return json(serialize_resource(resource))
    except Exception as e:
        return json({"error": str(e)}, status=500)

@resources_bp.route("/", methods=["POST"])
async def create_resource(request):
    try:
        data = request.json
        
        # Get user from request context
        user = request.ctx.user if hasattr(request.ctx, 'user') else None
        created_by = user['hash'] if user else 'SYSTEM'
        
        # Validate required fields
        required_fields = ['title', 'resource_type', 'storage_type']
        for field in required_fields:
            if field not in data:
                return json({"error": f"Missing required field: {field}"}, status=400)
        
        # Validate resource type and storage type
        if data['resource_type'] not in RESOURCE_TYPES:
            return json({"error": f"Invalid resource type. Must be one of: {', '.join(RESOURCE_TYPES)}"}, 
                       status=400)
        
        if data['storage_type'] not in STORAGE_TYPES:
            return json({"error": f"Invalid storage type. Must be one of: {', '.join(STORAGE_TYPES)}"}, 
                       status=400)
        
        # Generate hash
        resource_hash = str(uuid.uuid4())[:8]
        
        # Convert dictionary/list fields to JSON strings
        content = json_lib.dumps(data.get('content', {}))
        metadata = json_lib.dumps(data.get('metadata', {}))
        tags = json_lib.dumps(data.get('tags', []))
        
        query = f"""
            INSERT INTO {TABLE_PREFIX}_resources (
                hash, title, description, resource_type, storage_type,
                file_path, file_size, mime_type, content, metadata,
                tags, status, created_by, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14
            ) RETURNING hash
        """
        
        now = datetime.utcnow()
        values = (
            resource_hash,
            data['title'],
            data.get('description'),
            data['resource_type'],
            data['storage_type'],
            data.get('file_path'),
            data.get('file_size'),
            data.get('mime_type'),
            content,
            metadata,
            tags,
            data.get('status', 'active'),
            created_by,
            now
        )
        
        result = await Database.fetchval(query, *values)
        return json({"hash": result, "message": "Resource created successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@resources_bp.route("/<resource_hash>", methods=["PUT"])
@check_resource_ownership
async def update_resource(request, resource_hash):
    try:
        data = request.json
        
        # Validate resource type and storage type if provided
        if 'resource_type' in data and data['resource_type'] not in RESOURCE_TYPES:
            return json({"error": f"Invalid resource type. Must be one of: {', '.join(RESOURCE_TYPES)}"}, 
                       status=400)
        
        if 'storage_type' in data and data['storage_type'] not in STORAGE_TYPES:
            return json({"error": f"Invalid storage type. Must be one of: {', '.join(STORAGE_TYPES)}"}, 
                       status=400)
        
        # Convert dictionary/list fields to JSON strings if they exist
        if 'content' in data:
            data['content'] = json_lib.dumps(data['content'])
        if 'metadata' in data:
            data['metadata'] = json_lib.dumps(data['metadata'])
        if 'tags' in data:
            data['tags'] = json_lib.dumps(data['tags'])
        
        # Build update query dynamically
        update_fields = []
        values = [resource_hash]
        param_count = 1
        
        updateable_fields = [
            'title', 'description', 'resource_type', 'storage_type',
            'file_path', 'file_size', 'mime_type', 'content', 'metadata',
            'tags', 'status'
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
            UPDATE {TABLE_PREFIX}_resources 
            SET {', '.join(update_fields)}
            WHERE hash = $1
            RETURNING hash
        """
        
        result = await Database.fetchval(query, *values)
        
        if not result:
            return json({"error": "Resource not found"}, status=404)
            
        return json({"message": "Resource updated successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)

@resources_bp.route("/search")
async def search_resources(request):
    try:
        # Get search parameters
        resource_type = request.args.get('resource_type')
        storage_type = request.args.get('storage_type')
        status = request.args.get('status')
        
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
        conditions = ["status != 'deleted'"]
        values = []
        param_count = 0
        
        if resource_type:
            if resource_type not in RESOURCE_TYPES:
                return json({"error": f"Invalid resource type. Must be one of: {', '.join(RESOURCE_TYPES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"resource_type = ${param_count}")
            values.append(resource_type)
            
        if storage_type:
            if storage_type not in STORAGE_TYPES:
                return json({"error": f"Invalid storage type. Must be one of: {', '.join(STORAGE_TYPES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"storage_type = ${param_count}")
            values.append(storage_type)
            
        if status:
            if status not in STATUS_CHOICES:
                return json({"error": f"Invalid status. Must be one of: {', '.join(STATUS_CHOICES)}"}, 
                          status=400)
            param_count += 1
            conditions.append(f"status = ${param_count}")
            values.append(status)
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) FROM {TABLE_PREFIX}_resources 
            WHERE {' AND '.join(conditions)}
        """
        total_count = await Database.fetchval(count_query, *values)
        
        # Get paginated results
        param_count += 1
        param_count += 1
        query = f"""
            SELECT * FROM {TABLE_PREFIX}_resources 
            WHERE {' AND '.join(conditions)}
            ORDER BY created_at DESC
            OFFSET ${param_count-1} LIMIT ${param_count}
        """
        values.extend([offset, page_size])
        
        resources = await Database.fetch(query, *values)
        
        # Calculate total pages
        total_pages = (total_count + page_size - 1) // page_size
        
        return json({
            "items": [serialize_resource(resource) for resource in resources],
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

@resources_bp.route("/<resource_hash>", methods=["DELETE"])
@check_resource_ownership
async def delete_resource(request, resource_hash):
    try:
        # Soft delete by setting status to 'deleted'
        query = f"""
            UPDATE {TABLE_PREFIX}_resources 
            SET status = 'deleted', updated_at = $2
            WHERE hash = $1 
            RETURNING hash
        """
        
        result = await Database.fetchval(query, resource_hash, datetime.utcnow())
        
        if not result:
            return json({"error": "Resource not found"}, status=404)
            
        return json({"message": "Resource deleted successfully"})
        
    except Exception as e:
        return json({"error": str(e)}, status=500)
