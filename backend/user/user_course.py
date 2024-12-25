from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException, Unauthorized
from sanic_ext import openapi
from models import UserCourse, UserCourseCreate, UserCourseUpdate
from database import Database
from datetime import datetime
import os
from dotenv import load_dotenv
from .user_course_status import CourseStatusManager

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USER_COURSES_TABLE = f"{TABLE_PREFIX}_user_courses"

user_courses_bp = Blueprint("user_courses", url_prefix="api/v1/user_courses")

def format_course_response(course):
    return {
        "id": course['id'],
        "user_hash": course['user_hash'],
        "course_hash": course['course_hash'],
        "status": course['status'],
        "progress_percentage": float(course['progress_percentage']),
        "last_accessed_at": course['last_accessed_at'].isoformat() if course['last_accessed_at'] else None,
        "completion_date": course['completion_date'].isoformat() if course['completion_date'] else None,
        "user_rating": float(course['user_rating']) if course['user_rating'] else None,
        "created_at": course['created_at'].isoformat(),
        "updated_at": course['updated_at'].isoformat(),
    }

@user_courses_bp.get("/")
@openapi.summary("Get all user courses")
@openapi.parameter("status", str, "query", description="Filter by status")
@openapi.parameter("user_hash", str, "query", description="Filter by user hash")
@openapi.parameter("course_hash", str, "query", description="Filter by course hash")
@openapi.response(200, {"application/json": list})
@openapi.response(401, {"application/json": dict}, description="Unauthorized")
async def get_user_courses(request):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        SELECT id, user_hash, course_hash, status, progress_percentage,
               last_accessed_at, completion_date, user_rating, created_at, updated_at
        FROM {USER_COURSES_TABLE}
        WHERE 1=1
    """
    params = []

    if request.args.get('status'):
        query += " AND status = $" + str(len(params) + 1)
        params.append(request.args.get('status'))
    
    if request.args.get('user_hash'):
        query += " AND user_hash = $" + str(len(params) + 1)
        params.append(request.args.get('user_hash'))
        
    if request.args.get('course_hash'):
        query += " AND course_hash = $" + str(len(params) + 1)
        params.append(request.args.get('course_hash'))

    courses = await Database.fetch(query, *params)
    
    return json([format_course_response(course) for course in courses])

@user_courses_bp.post("/")
@openapi.summary("Enroll in a course")
@openapi.body({"application/json": UserCourseCreate})
@openapi.response(201, {"application/json": UserCourse})
async def create_user_course(request):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    data = request.json

    # First check if enrollment already exists
    check_query = f"""
        SELECT id FROM {USER_COURSES_TABLE}
        WHERE user_hash = $1 AND course_hash = $2
    """
    existing_enrollment = await Database.fetchrow(check_query, 
                                                data["user_hash"], 
                                                data["course_hash"])
    
    if existing_enrollment:
        raise SanicException("User is already enrolled in this course", 
                           status_code=409)  # 409 Conflict

    query = f"""
        INSERT INTO {USER_COURSES_TABLE} (user_hash, course_hash, status, progress_percentage,
                                last_accessed_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    """

    try:
        now = datetime.utcnow()
        course = await Database.fetchrow(
            query,
            data["user_hash"],
            data["course_hash"],
            "ENROLLED",
            0.0,
            now,
            now,
            now
        )
        
        # After successful enrollment, handle the enrolled status
        await CourseStatusManager._handle_enrolled(data["user_hash"], data["course_hash"])
        
        return json(format_course_response(course), status=201)
    except Exception as e:
        raise SanicException(f"Failed to enroll in course: {str(e)}", status_code=400)

@user_courses_bp.get("/<user_hash:str>/<course_hash:str>")
@openapi.summary("Get a specific user course enrollment")
@openapi.response(200, {"application/json": UserCourse})
async def get_user_course(request, user_hash: str, course_hash: str):
    query = f"SELECT * FROM {USER_COURSES_TABLE} WHERE user_hash = $1 AND course_hash = $2"
    course = await Database.fetchrow(query, user_hash, course_hash)
    
    if not course:
        raise SanicException("User course enrollment not found", status_code=404)
    
    return json(format_course_response(course))

@user_courses_bp.put("/<user_hash:str>/<course_hash:str>")
@openapi.summary("Update a user course enrollment")
@openapi.body({"application/json": UserCourseUpdate})
@openapi.response(200, {"application/json": UserCourse})
async def update_user_course(request, user_hash: str, course_hash: str):
    data = request.json
    
    # Remove hashes from updateable fields if present
    data = {k: v for k, v in data.items() if k not in ['user_hash', 'course_hash']}
    
    # Build update query dynamically based on provided fields
    set_clauses = []
    params = []
    param_count = 1
    
    for key, value in data.items():
        set_clauses.append(f"{key} = ${param_count}")
        params.append(value)
        param_count += 1
    
    params.extend([datetime.utcnow(), user_hash, course_hash])
    
    query = f"""
        UPDATE {USER_COURSES_TABLE} 
        SET {', '.join(set_clauses)}, updated_at = ${param_count}
        WHERE user_hash = ${param_count + 1} AND course_hash = ${param_count + 2}
        RETURNING *
    """
    
    course = await Database.fetchrow(query, *params)
    if not course:
        raise SanicException("User course enrollment not found", status_code=404)
    
    return json(format_course_response(course))

@user_courses_bp.delete("/<user_hash:str>/<course_hash:str>")
@openapi.summary("Delete a user course enrollment")
@openapi.response(204, description="User course enrollment deleted successfully")
async def delete_user_course(request, user_hash: str, course_hash: str):
    query = f"""
        DELETE FROM {USER_COURSES_TABLE} 
        WHERE user_hash = $1 AND course_hash = $2 
        RETURNING id
    """
    result = await Database.fetchrow(query, user_hash, course_hash)
    
    if not result:
        raise SanicException("User course enrollment not found", status_code=404)
    
    return json({}, status=204)

@user_courses_bp.put("/<user_hash:str>/<course_hash:str>/complete")
@openapi.summary("Mark a course as completed")
@openapi.response(200, {"application/json": UserCourse})
async def complete_course(request, user_hash: str, course_hash: str):
    query = f"""
        UPDATE {USER_COURSES_TABLE} 
        SET status = 'COMPLETED', 
            completion_date = $1,
            progress_percentage = 100.0,
            updated_at = $1
        WHERE user_hash = $2 AND course_hash = $3
        RETURNING *
    """
    
    course = await Database.fetchrow(query, datetime.utcnow(), user_hash, course_hash)
    if not course:
        raise SanicException("User course enrollment not found", status_code=404)
    
    return json(format_course_response(course))

@user_courses_bp.put("/<user_hash:str>/<course_hash:str>/rate")
@openapi.summary("Rate a course")
@openapi.body({"application/json": {"rating": float}})
@openapi.response(200, {"application/json": UserCourse})
async def rate_course(request, user_hash: str, course_hash: str):
    data = request.json
    rating = data.get('rating')
    
    if not rating or not (1.0 <= float(rating) <= 5.0):
        raise SanicException("Invalid rating. Must be between 1.0 and 5.0", status_code=400)
    
    query = f"""
        UPDATE {USER_COURSES_TABLE} 
        SET user_rating = $1,
            updated_at = $2
        WHERE user_hash = $3 AND course_hash = $4
        RETURNING *
    """
    
    course = await Database.fetchrow(query, float(rating), datetime.utcnow(), 
                                   user_hash, course_hash)
    if not course:
        raise SanicException("User course enrollment not found", status_code=404)
    
    return json(format_course_response(course))
