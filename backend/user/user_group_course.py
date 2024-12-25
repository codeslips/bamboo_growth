from sanic import Blueprint
from sanic.response import json
from datetime import datetime
from models import hash1
from sanic.exceptions import InvalidUsage, NotFound
import asyncpg

import os
from dotenv import load_dotenv

load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')

user_group_course_bp = Blueprint('user_group_course_bp', url_prefix='/api/group-courses')

@user_group_course_bp.post("/create")
async def create_group_course(request):
    """Create a new group course association"""
    data = request.json
    required_fields = ['group_hash', 'course_hash']
    for field in required_fields:
        if field not in data:
            raise InvalidUsage(f"Missing required field: {field}")
    
    try:
        pool = request.app.ctx.db_pool
        
        query = """
            INSERT INTO {}_group_courses (
                group_hash, course_hash, progress_summary, score_summary,
                is_open, is_closed, auto_open_time, auto_close_time,
                created_by_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING group_hash, course_hash, progress_summary, score_summary,
                      is_open, is_closed, created_at
        """.format(TABLE_PREFIX)
        
        result = await pool.fetchrow(
            query,
            data['group_hash'],
            data['course_hash'],
            data.get('progress_summary', {}),
            data.get('score_summary', {}),
            data.get('is_open', False),
            data.get('is_closed', False),
            data.get('auto_open_time'),
            data.get('auto_close_time'),
            request.ctx.user_hash
        )
        
        return json({
            'status': 'success',
            'message': 'Group course created successfully',
            'data': dict(result)
        })
        
    except asyncpg.UniqueViolationError:
        return json({
            'status': 'error',
            'message': 'This group-course association already exists'
        }, status=400)
    except Exception as e:
        return json({
            'status': 'error',
            'message': str(e)
        }, status=400)

@user_group_course_bp.get("/<group_hash>/<course_hash>")
async def get_group_course(request, group_hash, course_hash):
    """Get group course details"""
    pool = request.app.ctx.db_pool
    query = """
        SELECT group_hash, course_hash, progress_summary, score_summary,
               is_open, is_closed, auto_open_time, auto_close_time,
               created_at, created_by_hash
        FROM {}_group_courses
        WHERE group_hash = $1 AND course_hash = $2
    """.format(TABLE_PREFIX)
    
    result = await pool.fetchrow(query, group_hash, course_hash)
    
    if not result:
        raise NotFound('Group course association not found')
        
    return json({
        'status': 'success',
        'data': dict(result)
    })

@user_group_course_bp.put("/<group_hash>/<course_hash>")
async def update_group_course(request, group_hash, course_hash):
    """Update group course details"""
    data = request.json
    pool = request.app.ctx.db_pool
    
    # Build update query dynamically based on provided fields
    update_fields = []
    values = []
    param_count = 1
    
    updateable_fields = [
        'progress_summary', 'score_summary', 'is_open', 'is_closed',
        'auto_open_time', 'auto_close_time'
    ]
    
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
    
    values.extend([group_hash, course_hash])
    query = """
        UPDATE {}_group_courses
        SET {}
        WHERE group_hash = ${} AND course_hash = ${}
        RETURNING *
    """.format(
        TABLE_PREFIX,
        ", ".join(update_fields),
        param_count,
        param_count + 1
    )
    
    result = await pool.fetchrow(query, *values)
    
    if not result:
        raise NotFound('Group course association not found')
    
    return json({
        'status': 'success',
        'message': 'Group course updated successfully',
        'data': dict(result)
    })

@user_group_course_bp.delete("/<group_hash>/<course_hash>")
async def delete_group_course(request, group_hash, course_hash):
    """Delete a group course association"""
    pool = request.app.ctx.db_pool
    
    result = await pool.execute(
        """
        DELETE FROM {}_group_courses
        WHERE group_hash = $1 AND course_hash = $2
        """.format(TABLE_PREFIX),
        group_hash,
        course_hash
    )
    
    if result == "DELETE 0":
        raise NotFound('Group course association not found')
    
    return json({
        'status': 'success',
        'message': 'Group course deleted successfully'
    })

@user_group_course_bp.get("/group/<group_hash>")
async def list_group_courses(request, group_hash):
    """List all courses for a specific group"""
    pool = request.app.ctx.db_pool
    
    query = """
        SELECT gc.*, c.name as course_name, c.description as course_description
        FROM {0}_group_courses gc
        LEFT JOIN {0}_courses c ON gc.course_hash = c.hash
        WHERE gc.group_hash = $1
        ORDER BY gc.created_at DESC
    """.format(TABLE_PREFIX)
    
    results = await pool.fetch(query, group_hash)
    
    return json({
        'status': 'success',
        'data': [dict(row) for row in results]
    })

@user_group_course_bp.get("/course/<course_hash>")
async def list_course_groups(request, course_hash):
    """List all groups for a specific course"""
    pool = request.app.ctx.db_pool
    
    query = """
        SELECT gc.*, g.name as group_name, g.description as group_description
        FROM {0}_group_courses gc
        LEFT JOIN {0}_user_groups g ON gc.group_hash = g.hash
        WHERE gc.course_hash = $1
        ORDER BY gc.created_at DESC
    """.format(TABLE_PREFIX)
    
    results = await pool.fetch(query, course_hash)
    
    return json({
        'status': 'success',
        'data': [dict(row) for row in results]
    })
