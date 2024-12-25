from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException
from sanic_ext import openapi
from models import User, UserCreate, UserUpdate, hash1
from datetime import datetime
from database import Database
import os
from dotenv import load_dotenv

load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USERS_TABLE = f"{TABLE_PREFIX}_users"
USER_SHARES_TABLE = f"{TABLE_PREFIX}_user_shares"
users_bp = Blueprint("users", url_prefix="api/v1/users")

@users_bp.get("/")
@openapi.summary("Get all users")
@openapi.response(200, {"application/json": list[User]})
async def get_users(request):
    query = f"""
        SELECT id, hash, mobile_phone, role, email, full_name, created_at, updated_at 
        FROM {USERS_TABLE}
    """
    users = await Database.fetch(query)
    return json([
        {
            'id': user['id'],
            'hash': user['hash'],
            'mobile_phone': user['mobile_phone'],
            'role': user['role'],
            'email': user['email'],
            'full_name': user['full_name'],
            'created_at': user['created_at'].isoformat(),
            'updated_at': user['updated_at'].isoformat()
        }
        for user in users
    ])

@users_bp.post("/")
@openapi.summary("Create a new user")
@openapi.body({"application/json": UserCreate})
@openapi.response(201, {"application/json": User})
async def create_user(request):
    # Check if user is authenticated and has required role
    if not hasattr(request.ctx, 'user') or request.ctx.user is None:
        raise SanicException("Authentication required", status_code=401)
    
    current_user_role = request.ctx.user.get('role')
    if current_user_role not in ['admin', 'teacher']:
        raise SanicException("Permission denied", status_code=403)
    
    user_data = UserCreate.parse_obj(request.json)
    
    # Check role permissions
    requested_role = user_data.role if hasattr(user_data, 'role') else 'user'
    if current_user_role == 'teacher' and requested_role != 'student':
        raise SanicException("Teachers can only create student accounts", status_code=403)
    
    query = f"""
        INSERT INTO {USERS_TABLE} (hash, mobile_phone, role, email, full_name, hashed_password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, hash, mobile_phone, role, email, full_name, created_at, updated_at
    """
    try:
        user = await Database.fetchrow(
            query,
            user_data.hash,
            user_data.mobile_phone,
            requested_role,  # Use the requested role instead of default 'user'
            user_data.email,
            user_data.full_name,
            user_data.get_password_hash()
        )
        return json({
            'id': user['id'],
            'hash': user['hash'],
            'mobile_phone': user['mobile_phone'],
            'role': user['role'],
            'email': user['email'],
            'full_name': user['full_name'],
            'created_at': user['created_at'].isoformat(),
            'updated_at': user['updated_at'].isoformat()
        }, status=201)
    except Exception as e:
        if 'unique constraint' in str(e).lower():
            raise SanicException("Username already exists", status_code=400)
        raise

@users_bp.get("/<user_id:int>")
@openapi.summary("Get a user by ID")
@openapi.response(200, {"application/json": User})
async def get_user(request, user_id: int):
    user_query = f"""
        SELECT id, hash, mobile_phone, role, email, full_name, created_at, updated_at 
        FROM {USERS_TABLE} WHERE id = $1
    """
    user = await Database.fetchrow(user_query, user_id)
    
    if user is None:
        raise SanicException("User not found", status_code=404)

    shares_query = f"""
        SELECT hash, path, course_hash, lesson_hash, lesson_type, 
               user_name, user_hash, date, created_at, updated_at
        FROM {USER_SHARES_TABLE} 
        WHERE user_hash = $1
    """
    shares = await Database.fetch(shares_query, user['hash'])
    
    user_dict = {
        'id': user['id'],
        'hash': user['hash'],
        'mobile_phone': user['mobile_phone'],
        'role': user['role'],
        'email': user['email'],
        'full_name': user['full_name'],
        'created_at': user['created_at'].isoformat(),
        'updated_at': user['updated_at'].isoformat(),
        'shares': [{
            'hash': share['hash'],
            'path': share['path'],
            'course_hash': share['course_hash'],
            'lesson_hash': share['lesson_hash'],
            'lesson_type': share['lesson_type'],
            'user_name': share['user_name'],
            'user_hash': share['user_hash'],
            'date': share['date'],
            'created_at': share['created_at'].isoformat(),
            'updated_at': share['updated_at'].isoformat()
        } for share in shares]
    }
    return json(user_dict)

@users_bp.put("/<user_id:int>")
@openapi.summary("Update a user")
@openapi.body({"application/json": UserUpdate})
@openapi.response(200, {"application/json": User})
async def update_user(request, user_id: int):
    user_data = UserUpdate.parse_obj(request.json)
    update_fields = []
    values = []
    param_count = 1

    for field, value in user_data.dict(exclude_unset=True).items():
        if field == 'password':
            update_fields.append(f"hashed_password = ${param_count}")
            values.append(hash1(value))
        else:
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
        param_count += 1
    
    if not update_fields:
        raise SanicException("No fields to update", status_code=400)

    values.append(user_id)
    query = f"""
        UPDATE {USERS_TABLE}
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = ${param_count}
        RETURNING id, hash, mobile_phone, role, email, full_name, created_at, updated_at
    """
    
    user = await Database.fetchrow(query, *values)
    if user is None:
        raise SanicException("User not found", status_code=404)

    return json({
        'id': user['id'],
        'hash': user['hash'],
        'mobile_phone': user['mobile_phone'],
        'role': user['role'],
        'email': user['email'],
        'full_name': user['full_name'],
        'created_at': user['created_at'].isoformat(),
        'updated_at': user['updated_at'].isoformat()
    })

@users_bp.delete("/<user_id:int>")
@openapi.summary("Delete a user")
@openapi.response(204, description="User deleted successfully")
async def delete_user(request, user_id: int):
    query = f"DELETE FROM {USERS_TABLE} WHERE id = $1 RETURNING id"
    result = await Database.fetchrow(query, user_id)
    
    if result is None:
        raise SanicException("User not found", status_code=404)
    
    return json({}, status=204)