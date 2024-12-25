from sanic import Blueprint
from sanic.response import json
from datetime import datetime
from models import hash1
from sanic.exceptions import InvalidUsage, NotFound, SanicException
from database import Database
import asyncpg

import os
from dotenv import load_dotenv

load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')

user_group_bp = Blueprint('user_group_bp', url_prefix='/api/v1/user-groups')

def serialize_datetime(obj):
    """Helper function to serialize datetime objects"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_row(row):
    """Convert a database row to a serializable dictionary"""
    result = dict(row)
    return {k: serialize_datetime(v) for k, v in result.items()}

@user_group_bp.post("/create")
async def create_group(request):
    """Create a new user group"""
    data = request.json
    if 'name' not in data:
        raise InvalidUsage("Missing required field: name")
        
    try:
        group_hash = f"{data['name']}"

        query = """
            INSERT INTO {}_user_groups (
                hash, name, description, is_open, is_closed, is_shared,
                auto_open_time, auto_close_time, created_by_hash, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING hash, name, description, is_open, is_closed
        """.format(TABLE_PREFIX)
        
        print(group_hash)
        result = await Database.fetchrow(
            query,
            group_hash,
            data['name'],
            data.get('description'),
            data.get('is_open', False),
            data.get('is_closed', False),
            data.get('is_shared', True),
            data.get('auto_open_time'),
            data.get('auto_close_time'),
            request.ctx.user['hash'],
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        return json(serialize_row(result))
        
    except Exception as e:
        raise SanicException(str(e), status_code=400)

@user_group_bp.get("/<group_hash>")
async def get_group(request, group_hash):
    """Get user group details"""
    query = f"""
        SELECT hash, name, description, is_open, is_closed,
               auto_open_time, auto_close_time, created_at, created_by_hash
        FROM {TABLE_PREFIX}_user_groups
        WHERE hash = $1
    """
    
    result = await Database.fetchrow(query, group_hash)
    
    if not result:
        raise NotFound('Group not found')
        
    return json(serialize_row(result))

@user_group_bp.post("/<group_hash>/join")
async def join_group(request, group_hash):
    """Join a user group"""
    try:
        data = request.json
        if data is None or 'user_hash' not in data:
            raise InvalidUsage("Missing required field: user_hash")
            
        # Check if group exists and is open
        group = await Database.fetchrow(
            f"""
            SELECT is_open, is_closed 
            FROM {TABLE_PREFIX}_user_groups 
            WHERE hash = $1
            """,
            group_hash
        )
        
        if not group:
            raise NotFound('Group not found')
            
        if not group['is_open'] or group['is_closed']:
            raise SanicException('This group is not open for new members', status_code=400)
        
        # Try to create membership
        result = await Database.fetchrow(
            f"""
            INSERT INTO {TABLE_PREFIX}_user_group_memberships (user_hash, group_hash, joined_at)
            VALUES ($1, $2, $3)
            RETURNING user_hash, group_hash, joined_at
            """,
            data['user_hash'],  # Use user_hash from request payload
            group_hash,
            datetime.utcnow()
        )
        
        return json(serialize_row(result))
        
    except asyncpg.UniqueViolationError:
        raise SanicException('User is already a member of this group', status_code=400)

@user_group_bp.post("/<group_hash>/leave")
async def leave_group(request, group_hash):
    """Leave a user group"""
    data = request.json
    if 'user_hash' not in data:
        raise InvalidUsage("Missing required field: user_hash")

    result = await Database.execute(
        f"""
        DELETE FROM {TABLE_PREFIX}_user_group_memberships
        WHERE user_hash = $1 AND group_hash = $2
        """,
        data['user_hash'],  # Use user_hash from request payload
        group_hash
    )
    
    if result == "DELETE 0":
        return json({
            'status': 'error',
            'message': 'User is not a member of this group'
        }, status=400)
    
    return json({
        'status': 'success',
        'message': 'Successfully removed user from the group'
    })

@user_group_bp.get("/list")
async def list_groups(request):
    """List all user groups with optional filters"""
    conditions = []
    params = []
    param_count = 1
    
    if request.args.get('is_open'):
        conditions.append(f"is_open = ${param_count}")
        params.append(request.args.get('is_open').lower() == 'true')
        param_count += 1
        
    if request.args.get('is_closed'):
        conditions.append(f"is_closed = ${param_count}")
        params.append(request.args.get('is_closed').lower() == 'true')
        param_count += 1
        
    if request.args.get('created_by'):
        conditions.append(f"created_by_hash = ${param_count}")
        params.append(request.args.get('created_by'))
        param_count += 1
        
    if request.args.get('search'):
        conditions.append(f"(name ILIKE ${param_count} OR description ILIKE ${param_count})")
        params.append(f"%{request.args.get('search')}%")
        param_count += 1
    
    where_clause = " AND ".join(conditions)
    where_clause = f"WHERE {where_clause}" if where_clause else ""
    
    query = f"""
        SELECT hash, name, description, is_open, is_closed, 
               created_at, created_by_hash
        FROM {TABLE_PREFIX}_user_groups
        {where_clause}
        ORDER BY created_at DESC
    """
    
    results = await Database.fetch(query, *params)
    
    return json([serialize_row(row) for row in results])

@user_group_bp.get("/<group_hash>/members")
async def get_group_members(request, group_hash):
    """Get all members of a group"""
    query = """
        SELECT m.user_hash, m.joined_at, u.full_name
        FROM {0}_user_group_memberships m
        LEFT JOIN {0}_users u ON m.user_hash = u.hash
        WHERE m.group_hash = $1
    """.format(TABLE_PREFIX)
    
    results = await Database.fetch(query, group_hash)
    
    return json([serialize_row(row) for row in results])
