from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException, Unauthorized
from sanic_ext import openapi
from database import Database
from datetime import datetime
import json as json_lib
import uuid
from utils.encryption import simple_encrypt, simple_decrypt, url_encode, url_decode
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
LESSONS_TABLE = f"lessons"
USERS_TABLE = f"{TABLE_PREFIX}_users"
USER_LESSON_RESULTS_TABLE = f"{TABLE_PREFIX}_user_lesson_results"
PAGE_TABLE = f"{TABLE_PREFIX}_pages"

user_lessons_results_bp = Blueprint("user_lessons_results", url_prefix="/api/v1/user-lessons")

@user_lessons_results_bp.get("/results")
@openapi.summary("Get lesson results for a specific lesson or all lessons")
@openapi.parameter("limit", int, "Number of results per page", required=False)
@openapi.parameter("offset", int, "Number of results to skip", required=False)
@openapi.response(200, {"application/json": {"results": list, "total": int, "has_more": bool}})
async def get_lesson_results(request):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    # Get pagination parameters
    try:
        limit = int(request.args.get('limit', 10))  # Default to 10 items per page
        offset = int(request.args.get('offset', 0))
    except ValueError:
        raise SanicException("Invalid pagination parameters", status_code=400)

    # Get is_shared from query parameters
    lesson_hash = request.args.get('lesson_hash')
    is_shared = request.args.get('is_shared')
    is_shared_filter = None
    if is_shared is not None:
        is_shared_filter = is_shared.lower() == 'true'

    # Build the base query for counting total results
    count_query = f"""
        SELECT COUNT(*) as total
        FROM {USER_LESSON_RESULTS_TABLE} ulr
        WHERE ulr.user_hash = $1
    """
    
    # Build the base query for fetching results
    query = f"""
        SELECT ulr.*, u.full_name, 
               l.title, l.created_by, l.lesson_type, l.duration_minutes, l.thumbnail_path
        FROM {USER_LESSON_RESULTS_TABLE} ulr
        LEFT JOIN {USERS_TABLE} u ON ulr.user_hash = u.hash
        LEFT JOIN {LESSONS_TABLE} l ON ulr.lesson_hash = l.hash
        WHERE ulr.user_hash = $1
    """
    
    params = [user['hash']]
    param_count = 1

    # Add filters to both queries
    if lesson_hash:
        param_count += 1
        filter_clause = f" AND ulr.lesson_hash = ${param_count}"
        count_query += filter_clause
        query += filter_clause
        params.append(lesson_hash)

    if is_shared_filter is not None:
        param_count += 1
        filter_clause = f" AND ulr.is_shared = ${param_count}"
        count_query += filter_clause
        query += filter_clause
        params.append(is_shared_filter)

    # Add ordering and pagination to the main query
    query += " ORDER BY ulr.created_at DESC"
    query += f" LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
    
    try:
        # Get total count
        count_result = await Database.fetchrow(count_query, *params)
        total = count_result['total']

        # Get paginated results
        results = await Database.fetch(query, *params, limit, offset)
        
        formatted_results = [{
            "hash": result['hash'],
            "user_hash": result['user_hash'],
            "lesson_hash": result['lesson_hash'],
            "learning_log": json_lib.loads(result['learning_log']) if isinstance(result['learning_log'], str) else result['learning_log'],
            "score": float(result['score']) if result['score'] is not None else 0.0,
            "is_shared": result['is_shared'],
            "likes": result['likes'],
            "comments": result['comments'],
            "created_at": result['created_at'].isoformat(),
            "updated_at": result['updated_at'].isoformat(),
            "user": {
                "full_name": result['full_name']
            },
            "lesson": {
                "title": result['title'],
                "created_by": result['created_by'],
                "lesson_type": result['lesson_type'],
                "duration_minutes": result['duration_minutes'],
                "thumbnail_path": result['thumbnail_path']
            }
        } for result in results]
        
        return json({
            "results": formatted_results,
            "total": total,
            "has_more": (offset + len(formatted_results)) < total
        })
    except Exception as e:
        raise SanicException(f"Failed to fetch lesson results: {str(e)}", status_code=500)

@user_lessons_results_bp.get("/results/<result_hash:str>")
@openapi.summary("Get a specific lesson result")
@openapi.response(200, {"application/json": dict})
async def get_lesson_result(request, result_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        SELECT ulr.*, u.full_name, l.title, l.description
        FROM {USER_LESSON_RESULTS_TABLE} ulr
        LEFT JOIN {USERS_TABLE} u ON ulr.user_hash = u.hash
        LEFT JOIN {LESSONS_TABLE} l ON ulr.lesson_hash = l.hash
        WHERE ulr.hash = $1 AND (ulr.user_hash = $2 OR ulr.is_shared = true)
    """
    
    try:
        result = await Database.fetchrow(query, result_hash, user['hash'])
        
        if not result:
            raise SanicException("Lesson result not found", status_code=404)
        
        formatted_result = {
            "hash": result['hash'],
            "user_hash": result['user_hash'],
            "lesson_hash": result['lesson_hash'],
            "learning_log": json_lib.loads(result['learning_log']) if isinstance(result['learning_log'], str) else result['learning_log'],
            "score": float(result['score']) if result['score'] is not None else 0.0,
            "is_shared": result['is_shared'],
            "likes": result['likes'],
            "comments": result['comments'],
            "created_at": result['created_at'].isoformat(),
            "updated_at": result['updated_at'].isoformat(),
            "user": {
                "full_name": result['full_name']
            },
            "lesson": {
                "title": result['title'],
                "description": result['description']
            }
        }
        
        return json(formatted_result)
    except Exception as e:
        raise SanicException(f"Failed to fetch lesson result: {str(e)}", status_code=500)

@user_lessons_results_bp.put("/results/<result_hash:str>/share")
@openapi.summary("Toggle sharing status of a lesson result and get share token")
@openapi.response(200, {"application/json": {"is_shared": bool, "share_token": str}})
async def update_result_sharing(request, result_hash: str = None, is_shared: bool = None):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        UPDATE {USER_LESSON_RESULTS_TABLE}
        SET is_shared = $1,
            updated_at = $2
        WHERE hash = $4 AND user_hash = $3
        RETURNING *
    """

    if request.args.get('is_shared'):
        is_shared = request.args.get('is_shared') == 'true'
    
    try:
        result = await Database.fetchrow(query, is_shared, datetime.utcnow(), user['hash'], result_hash)

        if not result:
            raise SanicException("Lesson result not found", status_code=404)
        
        response = {
            "hash": result['hash'],
            "is_shared": result['is_shared']
        }
        
        # Only generate share token if the result is shared
        if result['is_shared']:
            # Combine user hash and result hash
            combined = f"{user['hash']}:result:{result_hash}"
            share_token = simple_encrypt(combined)
            # URL-encode the share_token
            encoded_share_token = url_encode(share_token)
            response["share_token"] = encoded_share_token
        
        return json(response)
    except Exception as e:
        raise SanicException(f"Failed to update sharing status: {str(e)}", status_code=500)

@user_lessons_results_bp.get("/results/shared/<share_token:str>")
@openapi.summary("Get a shared lesson result by share token")
@openapi.response(200, {"application/json": dict})
async def get_shared_result(request, share_token: str):
    try:
        # URL-decode the share_token
        decoded_share_token = url_decode(share_token)
        decrypted = simple_decrypt(decoded_share_token)
        
        if ':' not in decrypted or 'result:' not in decrypted:
            raise ValueError("Invalid token format - missing separator or result identifier")
                
        user_hash, _, result_hash = decrypted.split(':', 2)  # Split into user_hash, 'result', result_hash
        
        # Updated query to include page table join
        query = f"""
            SELECT ulr.*, u.full_name, l.title, l.description,
                   l.lesson_type, l.duration_minutes, l.is_preview,
                   l.file_path, l.from_course, l.lesson_content,
                   p.page_title, p.page_content, p.page_type, p.page_version
            FROM {USER_LESSON_RESULTS_TABLE} ulr
            LEFT JOIN {USERS_TABLE} u ON ulr.user_hash = u.hash
            LEFT JOIN {LESSONS_TABLE} l ON ulr.lesson_hash = l.hash
            LEFT JOIN {PAGE_TABLE} p ON ulr.lesson_hash = p.hash
            WHERE ulr.hash = $1 AND ulr.user_hash = $2
            AND ulr.is_shared = true
        """
        
        result = await Database.fetchrow(query, result_hash, user_hash)
        if not result:
            raise SanicException("Shared result not found", status_code=404)
        
        # Create lesson_page dictionary if page data exists
        lesson_page = None
        if result.get('page_type'):  # Check if page exists
            lesson_page = {
                "hash": result.get('lesson_hash'),  # Using lesson_hash as page hash
                "page_title": result.get('page_title'),
                "page_content": result.get('page_content'),
                "page_type": result.get('page_type'),
                "page_version": result.get('page_version')
            }
        
        formatted_result = {
            "hash": result['hash'],
            "user_hash": result['user_hash'],
            "lesson_hash": result['lesson_hash'],
            "learning_log": json_lib.loads(result['learning_log']) if isinstance(result['learning_log'], str) else result['learning_log'],
            "score": float(result['score']) if result['score'] is not None else 0.0,
            "is_shared": result['is_shared'],
            "likes": result['likes'],
            "comments": result['comments'],
            "created_at": result['created_at'].isoformat(),
            "updated_at": result['updated_at'].isoformat(),
            "user": {
                "full_name": result['full_name']
            },
            "lesson": {
                "title": result['title'],
                "file_path": result['file_path'],
                "description": result['description'],
                "lesson_type": result['lesson_type'],
                "duration_minutes": result['duration_minutes'],
                "is_preview": result['is_preview'],
                "from_course": result['from_course'],
                "lesson_content": result['lesson_content']
            },
            "lesson_page": lesson_page  # Add lesson_page to the response
        }
        
        return json(formatted_result)
    
    except ValueError as ve:
        raise SanicException(f"Invalid share token: {str(ve)}", status_code=400)
    except Exception as e:
        raise SanicException(f"Error retrieving shared result: {str(e)}", status_code=500)

@user_lessons_results_bp.get("/results/<result_hash:str>/share-token")
@openapi.summary("Get share token for a shared lesson result")
@openapi.response(200, {"application/json": {"share_token": str}})
async def get_result_sharing_token(request, result_hash: str):
    user = request.ctx.user
    if not user:
        raise Unauthorized("User not authenticated")

    query = f"""
        SELECT *
        FROM {USER_LESSON_RESULTS_TABLE}
        WHERE hash = $1 AND user_hash = $2 AND is_shared = true
    """
    
    try:
        result = await Database.fetchrow(query, result_hash, user['hash'])

        if not result:
            raise SanicException("Shared lesson result not found", status_code=404)
        
        # Combine user hash and result hash
        combined = f"{user['hash']}:result:{result_hash}"
        share_token = simple_encrypt(combined)
        # URL-encode the share_token
        encoded_share_token = url_encode(share_token)
        
        return json({"share_token": encoded_share_token})
    except Exception as e:
        raise SanicException(f"Failed to get sharing token: {str(e)}", status_code=500)
