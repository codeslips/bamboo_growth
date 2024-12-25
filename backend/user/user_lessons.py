from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException, Unauthorized
from sanic_ext import openapi
from database import Database
from datetime import datetime
import os
from dotenv import load_dotenv
import json as json_lib
import hashlib
from urllib.parse import quote, unquote
import string
import uuid
from typing import List, Optional

from utils.encryption import simple_encrypt, simple_decrypt, url_encode, url_decode

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USER_LESSONS_TABLE = f"{TABLE_PREFIX}_user_lessons"
LESSONS_TABLE = f"lessons"
USERS_TABLE = f"{TABLE_PREFIX}_users"
USER_LESSON_RESULTS_TABLE = f"{TABLE_PREFIX}_user_lesson_results"
user_lessons_bp = Blueprint("user_lessons", url_prefix="/api/v1/user-lessons")

VALID_STATUSES = {
    'not_started': 'Not Started',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'locked': 'Locked',
    'archived': 'Archived',
    'deleted': 'Deleted'
}

def format_lesson_response(lesson, simple=True):
    """Format lesson response with configurable detail level.
    
    Args:
        lesson: The lesson record from database
        simple: If True, returns only essential fields
    """
    # Parse learning_log if it's a string
    try:
        learning_log = json_lib.loads(lesson['learning_log']) if 'learning_log' in lesson and isinstance(lesson['learning_log'], str) else {}
    except (json_lib.JSONDecodeError, TypeError):
        learning_log = {}

    if simple:
        response = {
            "id": lesson['id'],
            "user_hash": lesson['user_hash'],
            "teacher_hash": lesson['teacher_hash'] if 'teacher_hash' in lesson else lesson['user_hash'],
            "lesson_hash": lesson['lesson_hash'],
            "status": lesson['status'],
            "progress": float(lesson['progress']),
            "score": float(lesson['score']) if lesson.get('score') is not None else 0.0,
            "title": lesson['title'] if 'title' in lesson else None,
            "description": lesson['description'] if 'description' in lesson else None,
            "duration_minutes": lesson['duration_minutes'] if 'duration_minutes' in lesson else 0,
            "is_preview": lesson['is_preview'] if 'is_preview' in lesson else False,
            "is_published": lesson['is_published'] if 'is_published' in lesson else False,
            "last_accessed": lesson['last_accessed'].isoformat() if 'last_accessed' in lesson and lesson['last_accessed'] else None,
            "from_course": lesson['from_course'],
            "lesson_type": lesson.get('lesson_type') if lesson.get('lesson_type') else None,
            "file_path": lesson['file_path'] if 'file_path' in lesson else '',
            "thumbnail_path": lesson['thumbnail_path'] if 'thumbnail_path' in lesson else None,
            "created_by": lesson['created_by'] if 'created_by' in lesson else 'System-None',
            # Add user info
            "student": {
                "email": lesson.get('student_email'),
                "full_name": lesson.get('student_name')
            },
            "teacher": {
                "email": lesson.get('teacher_email'),
                "full_name": lesson.get('teacher_name')
            }
        }
        return response
    
    full_response = {
        "id": lesson['id'],
        "user_hash": lesson['user_hash'],
        "lesson_hash": lesson['lesson_hash'],
        "status": lesson['status'],
        "progress": float(lesson['progress']),
        "score": float(lesson['score']) if lesson.get('score') is not None else 0.0,
        "last_accessed": lesson['last_accessed'].isoformat() if 'last_accessed' in lesson and lesson['last_accessed'] else None,
        "learning_log": learning_log,
        "is_shared": lesson['is_shared'],
        "from_course": lesson['from_course'],
        "created_at": lesson['created_at'].isoformat(),
        "updated_at": lesson['updated_at'].isoformat(),
        "title": lesson['title'],
        "description": lesson['description'],
        "duration_minutes": lesson['duration_minutes'],
        "is_active": lesson['is_active'],
        "is_preview": lesson['is_preview'],
        "is_published": lesson['is_published'],
        "file_path": lesson['file_path'],
        "thumbnail_path": lesson['thumbnail_path'],
        "created_by": lesson['created_by']
    }

    # Add additional fields if they exist in the lesson record
    additional_fields = [
        'lesson_type', 'lesson_content', 'lesson_resources',
        'target', 'base_knowledges', 'target_knowledges',
        'created_by'
    ]
    
    for field in additional_fields:
        if field in lesson:
            full_response[field] = lesson[field]
    
    return full_response

@user_lessons_bp.get("/")
@openapi.summary("Get all user lessons")
@openapi.parameter("status", str, "query", description="Filter by status")
@openapi.parameter("lesson_hash", str, "query", description="Filter by lesson hash")
@openapi.parameter("from_course", str, "query", description="Filter by course hash")
@openapi.parameter("current_user", bool, "query", description="Show only current user's lessons (default: true)")
@openapi.parameter("current_teacher", bool, "query", description="Show only current teacher's lessons (default: false)")
@openapi.parameter("limit", int, "query", description="Number of results per page (default: 10)")
@openapi.parameter("offset", int, "query", description="Number of results to skip (default: 0)")
@openapi.response(200, {"application/json": dict})
@openapi.response(401, {"application/json": dict}, description="Unauthorized")
async def get_user_lessons(request):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    # Get pagination parameters
    try:
        limit = int(request.args.get('limit', 10))  # Default to 10 items per page
        offset = int(request.args.get('offset', 0))
    except ValueError:
        raise SanicException("Invalid pagination parameters", status_code=400)

    # Get current_user parameter, default to true
    current_user = request.args.get('current_user', 'true').lower() == 'true'

    current_teacher = request.args.get('current_teacher', 'false').lower() == 'true'
    print('current_teacher', current_teacher)
    
    # Only admin/teacher can set current_user to false
    if current_user is False and user.get('role') not in ['admin', 'teacher']:
        current_user = True

    # First, get total count
    count_query = f"""
        SELECT COUNT(*) as total
        FROM {USER_LESSONS_TABLE} ul
        LEFT JOIN {LESSONS_TABLE} l ON ul.lesson_hash = l.hash
    """
    
    params = []
    where_clauses = []

    # Add user filter based on current_user parameter
    if current_user:
        where_clauses.append("ul.user_hash = $1")
        params.append(user['hash'])

    if current_teacher:
        where_clauses.append(f"ul.teacher_hash = ${len(params) + 1}")
        params.append(user['hash'])

    if request.args.get('status'):
        where_clauses.append(f"ul.status = ${len(params) + 1}")
        params.append(request.args.get('status'))
        
    if request.args.get('lesson_hash'):
        where_clauses.append(f"ul.lesson_hash = ${len(params) + 1}")
        params.append(request.args.get('lesson_hash'))

    if request.args.get('from_course'):
        where_clauses.append(f"ul.from_course = ${len(params) + 1}")
        params.append(request.args.get('from_course'))

    # Add WHERE clause if we have any conditions
    if where_clauses:
        count_query += " WHERE " + " AND ".join(where_clauses)

    # Get total count
    count_result = await Database.fetchrow(count_query, *params)
    total = count_result['total']

    # Main query with pagination
    query = f"""
        SELECT ul.id, ul.user_hash, ul.teacher_hash, ul.lesson_hash, ul.status, ul.progress,
               ul.last_accessed, ul.is_shared, ul.from_course, 
               ul.created_at, ul.updated_at, ul.score,
               l.title, l.description, l.duration_minutes, l.is_active,
               l.is_preview, l.is_published, l.file_path, l.lesson_type,
               l.created_by, l.thumbnail_path,
               -- Add student info
               u.mobile_phone as student_mobile,
               u.email as student_email,
               u.full_name as student_name,
               u.role as student_role,
               -- Add teacher info
               t.mobile_phone as teacher_mobile,
               t.email as teacher_email,
               t.full_name as teacher_name,
               t.role as teacher_role
        FROM {USER_LESSONS_TABLE} ul
        LEFT JOIN {LESSONS_TABLE} l ON ul.lesson_hash = l.hash
        LEFT JOIN {USERS_TABLE} u ON ul.user_hash = u.hash
        LEFT JOIN {USERS_TABLE} t ON ul.teacher_hash = t.hash
    """
    
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)

    # Add ORDER BY and pagination
    query += f"""
        ORDER BY ul.created_at DESC
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    
    params.extend([limit, offset])

    lessons = await Database.fetch(query, *params)
    
    return json({
        "items": [format_lesson_response(lesson, simple=True) for lesson in lessons],
        "total": total,
        "has_more": (offset + len(lessons)) < total
    })

@user_lessons_bp.post("/")
@openapi.summary("Start a new lesson")
@openapi.body({"application/json": {"lesson_hash": str}})
@openapi.response(201, {"application/json": dict})
async def create_user_lesson(request):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")
    teacher = request.ctx.user
    teacher_hash = teacher['hash']

    data = request.json

    query = f"""
        INSERT INTO {USER_LESSONS_TABLE} (
            user_hash, teacher_hash, lesson_hash, status, progress,
            last_accessed, learning_log, is_shared, from_course, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    """

    try:
        now = datetime.utcnow()
        lesson = await Database.fetchrow(
            query,
            user['hash'],
            teacher_hash,
            data["lesson_hash"],
            "not_started",
            0.0,
            now,
            {},
            False,
            data.get("from_course"),
            now,
            now
        )
        return json(format_lesson_response(lesson), status=201)
    except Exception as e:
        raise SanicException(f"Failed to create lesson: {str(e)}", status_code=400)

@user_lessons_bp.get("/<lesson_hash:str>")
@openapi.summary("Get a specific user lesson")
@openapi.response(200, {"application/json": dict})
async def get_user_lesson(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        SELECT ul.id, ul.user_hash, ul.teacher_hash, ul.lesson_hash, ul.status, ul.progress,
               ul.last_accessed, ul.learning_log, ul.is_shared, ul.from_course, 
               ul.created_at, ul.updated_at, ul.score,
               l.title, l.description, l.duration_minutes, l.is_active,
               l.is_preview, l.is_published, l.file_path,
               l.lesson_type, l.lesson_content,
               l.target, l.base_knowledges, l.target_knowledges,
               l.created_by, l.thumbnail_path
        FROM {USER_LESSONS_TABLE} ul
        LEFT JOIN {LESSONS_TABLE} l ON ul.lesson_hash = l.hash
        WHERE ul.user_hash = $1 AND ul.lesson_hash = $2
    """
    
    lesson = await Database.fetchrow(query, user['hash'], lesson_hash)
    
    if not lesson:
        raise SanicException("User lesson not found", status_code=404)
    
    # Use full response for individual lesson details
    response = format_lesson_response(lesson, simple=False)
    # Add additional fields for detailed view
    response.update({
        "lesson_type": lesson['lesson_type'],
        "lesson_content": lesson['lesson_content'],
        "target": lesson['target'],
        "base_knowledges": lesson['base_knowledges'],
        "target_knowledges": lesson['target_knowledges'],
        "created_by": lesson['created_by'],
        "thumbnail_path": lesson['thumbnail_path']
    })
    
    return json(response)

@user_lessons_bp.put("/<lesson_hash:str>")
async def update_user_lesson(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    data = request.json
    
    # Check if user_hash is in data and handle authorization
    target_user_hash = data.get('user_hash', user['hash'])
    
    # If user is not admin/teacher, they can only update their own lessons
    if target_user_hash != user['hash'] and user.get('role') not in ['admin', 'teacher']:
        raise Unauthorized("You can only update your own lessons")
    
    # Validate status if it's being updated
    if 'status' in data and data['status'] not in VALID_STATUSES:
        raise SanicException(
            f"Invalid status. Must be one of: {', '.join(VALID_STATUSES.keys())}", 
            status_code=400
        )
    
    # Remove hashes from updateable fields if present
    data = {k: v for k, v in data.items() if k not in ['user_hash', 'lesson_hash']}
    
    # Build update query dynamically based on provided fields
    set_clauses = []
    params = []
    param_count = 1
    
    for key, value in data.items():
        set_clauses.append(f"{key} = ${param_count}")
        params.append(value)
        param_count += 1
    
    params.extend([datetime.utcnow(), target_user_hash, lesson_hash])
    
    query = f"""
        UPDATE {USER_LESSONS_TABLE} ul
        SET {', '.join(set_clauses)}, updated_at = ${param_count}
        FROM {LESSONS_TABLE} l
        WHERE ul.user_hash = ${param_count + 1} 
        AND ul.lesson_hash = ${param_count + 2}
        AND ul.lesson_hash = l.hash
        RETURNING ul.*, l.title, l.teacher_hash, l.description, l.duration_minutes, l.is_active, 
                  l.is_preview, l.is_published, l.file_path, l.lesson_type,
                  l.lesson_content, l.target,
                  l.base_knowledges, l.target_knowledges, l.created_by,
                  l.thumbnail_path
    """
    
    lesson = await Database.fetchrow(query, *params)
    if not lesson:
        raise SanicException("User lesson not found", status_code=404)
    
    return json(format_lesson_response(lesson))

@user_lessons_bp.delete("/<lesson_hash:str>")
@openapi.summary("Delete a user lesson")
@openapi.response(204, description="User lesson deleted successfully")
async def delete_user_lesson(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        DELETE FROM {USER_LESSONS_TABLE} 
        WHERE user_hash = $1 AND lesson_hash = $2 
        RETURNING id
    """
    result = await Database.fetchrow(query, user['hash'], lesson_hash)
    
    if not result:
        raise SanicException("User lesson not found", status_code=404)
    
    return json({}, status=204)

@user_lessons_bp.put("/<lesson_hash:str>/complete")
@openapi.summary("Mark a lesson as completed")
@openapi.response(200, {"application/json": dict})
async def complete_lesson(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        UPDATE {USER_LESSONS_TABLE} 
        SET status = 'completed', 
            progress = 100.0,
            last_accessed = $1,
            updated_at = $1
        WHERE user_hash = $2 AND lesson_hash = $3
        RETURNING *
    """
    
    lesson = await Database.fetchrow(query, datetime.utcnow(), user['hash'], lesson_hash)
    if not lesson:
        raise SanicException("User lesson not found", status_code=404)
    
    return json(format_lesson_response(lesson))

@user_lessons_bp.put("/<lesson_hash:str>/progress")
@openapi.summary("Update lesson progress")
@openapi.body({"application/json": {"progress": float, "learning_log": dict}})
@openapi.response(200, {"application/json": dict})
async def update_lesson_progress(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    data = request.json
    progress = data.get('progress')
    learning_log = data.get('learning_log', {})
    
    # Validate progress
    if progress is None or not (0.0 <= float(progress) <= 100.0):
        raise SanicException("Invalid progress. Must be between 0.0 and 100.0", status_code=400)
    
    # Validate learning_log
    if not isinstance(learning_log, dict):
        raise SanicException("learning_log must be a valid JSON object", status_code=400)
    
    try:
        # Create a new user lesson result record
        now = datetime.utcnow()
        result_hash = str(uuid.uuid4())
        
        create_result_query = f"""
            INSERT INTO {USER_LESSON_RESULTS_TABLE} (
                hash, user_hash, lesson_hash, learning_log, score,
                is_shared, likes, comments, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        """
        
        await Database.fetchrow(
            create_result_query,
            result_hash,
            user['hash'],
            lesson_hash,
            json_lib.dumps(learning_log),  # Detailed learning log in results table
            learning_log.get('score', 0.0),
            False,
            0,
            0,
            now,
            now
        )
        
        # Update user lesson with simplified learning log
        simplified_log = {
            "last_progress": progress,
            "last_update": now.isoformat(),
            "result_hash": result_hash  # Reference to the detailed result
        }
        
        status = 'completed' if float(progress) == 100.0 else 'in_progress'
        
        query = f"""
            UPDATE {USER_LESSONS_TABLE} ul
            SET progress = $1,
                status = $2,
                learning_log = learning_log || $3::jsonb,
                last_accessed = $4,
                updated_at = $4
            FROM {LESSONS_TABLE} l
            WHERE ul.user_hash = $5 
            AND ul.lesson_hash = $6
            AND ul.lesson_hash = l.hash
            RETURNING ul.id, ul.user_hash, ul.teacher_hash, ul.lesson_hash, ul.status, ul.progress,
                     ul.last_accessed, ul.learning_log, ul.is_shared, ul.from_course,
                     ul.created_at, ul.updated_at,
                     l.title, l.description, l.duration_minutes, l.is_active,
                     l.is_preview, l.is_published, l.file_path, l.lesson_type,
                     l.lesson_content, l.target,
                     l.base_knowledges, l.target_knowledges, l.created_by,
                     l.thumbnail_path
        """
        
        lesson = await Database.fetchrow(
            query, 
            float(progress),
            status,
            json_lib.dumps(simplified_log),
            now,
            user['hash'],
            lesson_hash
        )
        
        if not lesson:
            raise SanicException("User lesson not found", status_code=404)
        
        result_json = format_lesson_response(lesson, simple=True)
        result_json['learning_log'] = simplified_log
        return json(result_json)
        
    except Exception as e:
        raise SanicException(f"Failed to update lesson progress: {str(e)}", status_code=500)

@user_lessons_bp.put("/<lesson_hash:str>/share")
@openapi.summary("Update lesson sharing status and get share token")
@openapi.response(200, {"application/json": {"share_token": str}})
async def get_lesson_share_token(request, lesson_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    update_query = f"""
        UPDATE {USER_LESSONS_TABLE}
        SET is_shared = $1, updated_at = $2
        WHERE user_hash = $3 AND lesson_hash = $4
        RETURNING *
    """
    
    try:
        lesson = await Database.fetchrow(update_query, True, datetime.utcnow(), user['hash'], lesson_hash)
        if not lesson:
            raise SanicException("User lesson not found", status_code=404)
        
        # Combine and encrypt
        combined = f"{user['hash']}:{lesson_hash}"
        share_token = simple_encrypt(combined)
        # URL-encode the share_token
        encoded_share_token = url_encode(share_token)
        print(f"Original: {combined}")  # Debug log
        print(f"Encrypted: {share_token}")  # Debug log
        
        return json({"share_token": encoded_share_token})
    except Exception as e:
        raise SanicException(f"Failed to update lesson sharing status: {str(e)}", status_code=500)

@user_lessons_bp.get("/shared/<share_token:str>")
@openapi.summary("Get a shared lesson by share token")
@openapi.response(200, {"application/json": dict})
async def get_shared_lesson(request, share_token: str):
    try:
        # URL-decode the share_token
        decoded_share_token = url_decode(share_token)
        decrypted = simple_decrypt(decoded_share_token)
        print(f"Decrypted value: {decrypted}")  # Debug log
        
        if ':' not in decrypted:
            raise ValueError("Invalid token format - missing separator")
                
        user_hash, lesson_hash = decrypted.split(':', 1)
        print(f"Parsed values - user_hash: {user_hash}, lesson_hash: {lesson_hash}")  # Debug log
        
        query = f"""
            SELECT ul.*, l.*,
                   u.full_name
            FROM {USER_LESSONS_TABLE} ul
            LEFT JOIN {LESSONS_TABLE} l ON ul.lesson_hash = l.hash
            LEFT JOIN {USERS_TABLE} u ON ul.user_hash = u.hash
            WHERE ul.user_hash = $1 AND ul.lesson_hash = $2
            AND ul.is_shared = true
        """
        
        lesson = await Database.fetchrow(query, user_hash, lesson_hash)
        if not lesson:
            print(f"No lesson found for user_hash: {user_hash}, lesson_hash: {lesson_hash}")  # Debug log
            raise SanicException("Shared lesson not found", status_code=404)
        
        response = format_lesson_response(lesson, simple=False)
        response['user'] = {
            'full_name': lesson['full_name']
        }
        
        return json(response)
    
    except ValueError as ve:
        raise SanicException(f"Invalid share token: {str(ve)}", status_code=400)
    except Exception as e:
        print(f"Unexpected error: {str(e)}")  # Debug log
        raise SanicException(f"Error retrieving shared lesson: {str(e)}", status_code=500)

@user_lessons_bp.post("/<lesson_hash:str>/users")
@openapi.summary("Add users to a lesson")
@openapi.body({"application/json": {"user_hashes": List[str]}})
@openapi.response(201, {"application/json": dict})
async def add_users_to_lesson(request, lesson_hash: str):
    """Add multiple users to a lesson"""
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    teacher_hash = user['hash']
    data = request.json
    user_hashes = data.get('user_hashes', [])
    
    if not user_hashes:
        raise SanicException("No users provided", status_code=400)

    # Get lesson details first
    lesson_query = f"""
        SELECT * FROM {LESSONS_TABLE}
        WHERE hash = $1
    """
    lesson = await Database.fetchrow(lesson_query, lesson_hash)
    if not lesson:
        raise SanicException("Lesson not found", status_code=404)

    # Insert new user lessons
    now = datetime.utcnow()
    values_list = []
    params = []
    for i, user_hash in enumerate(user_hashes):
        offset = i * 10
        values_list.append(f"(${1+offset}, ${2+offset}, ${3+offset}, ${4+offset}, ${5+offset}, ${6+offset}, ${7+offset}, ${8+offset}, ${9+offset}, ${10+offset})")
        params.extend([
            user_hash,
            teacher_hash,
            lesson_hash,
            "not_started",
            0.0,
            now,
            "{}",  # empty learning_log
            False,  # is_shared
            now,
            now
        ])

    insert_query = f"""
        INSERT INTO {USER_LESSONS_TABLE} (
            user_hash, teacher_hash, lesson_hash, status, progress,
            last_accessed, learning_log, is_shared, created_at, updated_at
        )
        VALUES {', '.join(values_list)}
        ON CONFLICT (user_hash, lesson_hash) DO NOTHING
        RETURNING *
    """

    try:
        results = await Database.fetch(insert_query, *params)
        return json({
            "message": f"Successfully added {len(results)} users to lesson",
            "added_users": [format_lesson_response(result, simple=True) for result in results]
        }, status=201)
    except Exception as e:
        raise SanicException(f"Failed to add users to lesson: {str(e)}", status_code=500)



