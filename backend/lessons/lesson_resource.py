from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import InvalidUsage, NotFound
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')

lesson_resource_bp = Blueprint('lesson_resource_bp', url_prefix='/api/lesson-resources')

@lesson_resource_bp.post("/create")
async def create_lesson_resource(request):
    """Create a new lesson resource association"""
    data = request.json
    required_fields = ['lesson_hash', 'resource_hash']
    for field in required_fields:
        if field not in data:
            raise InvalidUsage(f"Missing required field: {field}")
    
    try:
        pool = request.app.ctx.db_pool
        
        query = """
            INSERT INTO {}_lesson_resources (
                lesson_hash, resource_hash, order_index, is_visible
            ) VALUES ($1, $2, $3, $4)
            RETURNING lesson_hash, resource_hash, order_index, is_visible, created_at
        """.format(TABLE_PREFIX)
        
        result = await pool.fetchrow(
            query,
            data['lesson_hash'],
            data['resource_hash'],
            data.get('order_index', 0),
            data.get('is_visible', True)
        )
        
        return json({
            'status': 'success',
            'message': 'Lesson resource created successfully',
            'data': dict(result)
        })
        
    except asyncpg.UniqueViolationError:
        return json({
            'status': 'error',
            'message': 'This lesson-resource association already exists'
        }, status=400)
    except Exception as e:
        return json({
            'status': 'error',
            'message': str(e)
        }, status=400)

@lesson_resource_bp.get("/<lesson_hash>/<resource_hash>")
async def get_lesson_resource(request, lesson_hash, resource_hash):
    """Get lesson resource details"""
    pool = request.app.ctx.db_pool
    query = """
        SELECT lesson_hash, resource_hash, order_index, is_visible, created_at
        FROM {}_lesson_resources
        WHERE lesson_hash = $1 AND resource_hash = $2
    """.format(TABLE_PREFIX)
    
    result = await pool.fetchrow(query, lesson_hash, resource_hash)
    
    if not result:
        raise NotFound('Lesson resource association not found')
        
    return json({
        'status': 'success',
        'data': dict(result)
    })

@lesson_resource_bp.put("/<lesson_hash>/<resource_hash>")
async def update_lesson_resource(request, lesson_hash, resource_hash):
    """Update lesson resource details"""
    data = request.json
    pool = request.app.ctx.db_pool
    
    # Build update query dynamically based on provided fields
    update_fields = []
    values = []
    param_count = 1
    
    updateable_fields = ['order_index', 'is_visible']
    
    for field in updateable_fields:
        if field in data:
            update_fields.append(f"{field} = ${param_count}")
            values.append(data[field])
            param_count += 1
    
    if not update_fields:
        return json({
            'status': 'error',
            'message': 'No fields to update'
        }, status=400)
    
    values.extend([lesson_hash, resource_hash])
    query = """
        UPDATE {}_lesson_resources
        SET {}
        WHERE lesson_hash = ${} AND resource_hash = ${}
        RETURNING *
    """.format(
        TABLE_PREFIX,
        ", ".join(update_fields),
        param_count,
        param_count + 1
    )
    
    result = await pool.fetchrow(query, *values)
    
    if not result:
        raise NotFound('Lesson resource association not found')
    
    return json({
        'status': 'success',
        'message': 'Lesson resource updated successfully',
        'data': dict(result)
    })

@lesson_resource_bp.delete("/<lesson_hash>/<resource_hash>")
async def delete_lesson_resource(request, lesson_hash, resource_hash):
    """Delete a lesson resource association"""
    pool = request.app.ctx.db_pool
    
    result = await pool.execute(
        """
        DELETE FROM {}_lesson_resources
        WHERE lesson_hash = $1 AND resource_hash = $2
        """.format(TABLE_PREFIX),
        lesson_hash,
        resource_hash
    )
    
    if result == "DELETE 0":
        raise NotFound('Lesson resource association not found')
    
    return json({
        'status': 'success',
        'message': 'Lesson resource deleted successfully'
    })

@lesson_resource_bp.get("/lesson/<lesson_hash>")
async def list_lesson_resources(request, lesson_hash):
    """List all resources for a specific lesson"""
    pool = request.app.ctx.db_pool
    
    query = """
        SELECT lr.*, r.name as resource_name, r.description as resource_description
        FROM {0}_lesson_resources lr
        LEFT JOIN {0}_resources r ON lr.resource_hash = r.hash
        WHERE lr.lesson_hash = $1
        ORDER BY lr.order_index ASC
    """.format(TABLE_PREFIX)
    
    results = await pool.fetch(query, lesson_hash)
    
    return json({
        'status': 'success',
        'data': [dict(row) for row in results]
    })

@lesson_resource_bp.get("/resource/<resource_hash>")
async def list_resource_lessons(request, resource_hash):
    """List all lessons for a specific resource"""
    pool = request.app.ctx.db_pool
    
    query = """
        SELECT lr.*, l.name as lesson_name, l.description as lesson_description
        FROM {0}_lesson_resources lr
        LEFT JOIN {0}_lessons l ON lr.lesson_hash = l.hash
        WHERE lr.resource_hash = $1
        ORDER BY lr.order_index ASC
    """.format(TABLE_PREFIX)
    
    results = await pool.fetch(query, resource_hash)
    
    return json({
        'status': 'success',
        'data': [dict(row) for row in results]
    }) 