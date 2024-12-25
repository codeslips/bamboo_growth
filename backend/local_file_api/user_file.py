from sanic import Blueprint
from sanic.response import json as sanic_json
from sanic.exceptions import SanicException
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
import json  # Add this import
import hashlib  # Add this import
from models import UserSharesORM  # Add this import
from database import get_session  # Add this import (ensure you have a session manager)

load_dotenv()

BASE_PATH = os.getenv('BASE_USER_DATA_PATH', 'data/user')
BASE_COURSE_PATH = os.getenv('BASE_COURSE_DATA_PATH', 'data/course')

user_file_bp = Blueprint("user_file", url_prefix="api/v1/user-file")

@user_file_bp.route("/")
async def user_file_root(request):
    return sanic_json({"message": "User File API"})

@user_file_bp.route("/upload-audio", methods=["POST"])
async def upload_audio_file(request):
    if not request.ctx.user:
        raise SanicException("User not authenticated", status_code=401)
    
    if "file" not in request.files:
        raise SanicException("No file part in the request", status_code=400)

    file = request.files["file"][0]
    
    if not file.name or not file.type.startswith("audio/"):
        raise SanicException("Invalid file or not an audio file", status_code=400)

    # Get course name, lesson, and user name from form data
    course_id = request.form.get("course_id", "000000")
    lesson = request.form.get("lesson", "0")
    user_name = request.ctx.user.full_name  # Set user_name from request.ctx.user

    # Get pronunciation data from form data
    pronunciation_data = request.form.get("pronunciation_data")
    if pronunciation_data:
        pronunciation_data = json.loads(pronunciation_data)

    # Generate current date in YYYYMMDD format
    current_date = datetime.now().strftime("%Y%m%d")

    # Generate a unique filename based on course_id, lesson, and user_name
    unique_string = f"{course_id}_{lesson}_{user_name}_{current_date}"
    hashed_filename = hashlib.md5(unique_string.encode()).hexdigest()
    filename = f"{hashed_filename}{os.path.splitext(file.name)[1]}"
    
    # **Start of changes**
    try:
        session = next(get_session())
        # Check if the hashed_filename already exists
        existing_record = session.query(UserSharesORM).filter_by(hash=hashed_filename).first()
        if existing_record:
            # Delete existing record
            session.delete(existing_record)
            session.commit()
            
            # Delete the existing file and pronunciation data if they exist
            existing_file_path = os.path.join(BASE_PATH, existing_record.path, f"{existing_record.hash}{os.path.splitext(file.name)[1]}")
            if os.path.exists(existing_file_path):
                os.remove(existing_file_path)
            pronunciation_file_path = os.path.join(BASE_PATH, existing_record.path, f"{existing_record.hash}_pronunciation.json")
            if os.path.exists(pronunciation_file_path):
                os.remove(pronunciation_file_path)
    except Exception as e:
        session.rollback()
        print(f"Error checking/deleting existing record: {str(e)}")
    finally:
        session.close()
    # **End of changes**
    
    # Define the upload directory
    upload_dir = os.path.join(BASE_PATH, course_id, current_date)
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    
    # Delete the previous file if it exists
    if os.path.exists(file_path):
        os.remove(file_path)
        # Also delete the associated pronunciation data file if it exists
        pronunciation_file_path = f"{file_path}_pronunciation.json"
        if os.path.exists(pronunciation_file_path):
            os.remove(pronunciation_file_path)

    # Save the audio file
    with open(file_path, "wb") as f:
        f.write(file.body)

    # Save pronunciation data if available
    if pronunciation_data:
        pronunciation_file_path = os.path.join(upload_dir, f"{hashed_filename}_pronunciation.json")
        with open(pronunciation_file_path, "w") as f:
            json.dump(pronunciation_data, f)

    # Add record to UserSharesORM instead of index.json
    try:
        session = next(get_session())
        user_share = UserSharesORM(
            mobile_phone=request.ctx.user.mobile_phone,
            hash=hashed_filename,
            path=f"{course_id}/{current_date}/",
            course_id=course_id,
            lesson=lesson,
            user_name=user_name,
            date=current_date,
            has_pronunciation_data=bool(pronunciation_data)
        )
        session.add(user_share)
        session.commit()  # Commit the transaction
        session.close()  # Ensure the session is closed
    except Exception as e:
        session.rollback()  # Revert any changes due to the error
        print(f"Error saving to database: {str(e)}")

    return sanic_json({
        "message": "Audio file and pronunciation data uploaded successfully",
        "hash": hashed_filename,  # Changed from "filename" to "hash"
        "path": f"{course_id}/{current_date}/{filename}"
    }, status=201)

@user_file_bp.route("/get-data/<hashed_filename>", methods=["GET"])
async def get_data_by_hash(request, hashed_filename):
    # Path to the user index.json file
    user_index_path = os.path.join(BASE_PATH, "index.json")
    
    # Check if the user index.json file exists
    if not os.path.exists(user_index_path):
        raise SanicException("User index file not found", status_code=404)
    
    # Load the user index data
    with open(user_index_path, "r") as f:
        user_index_data = json.load(f)
    
    # Find the record with the matching hash
    user_record = next((item for item in user_index_data if item["hash"] == hashed_filename), None)
    
    if not user_record:
        raise SanicException("Record not found", status_code=404)
    
    # Get the pronunciation data
    pronunciation_file_path = os.path.join(BASE_PATH, user_record["path"] + user_record["hash"] + "_pronunciation.json")
    print(pronunciation_file_path)
    pronunciation_data = None
    if os.path.exists(pronunciation_file_path):
        with open(pronunciation_file_path, "r") as f:
            pronunciation_data = json.load(f)
    
    # Get the course data
    course_index_path = os.path.join(BASE_COURSE_PATH, user_record["course_id"], "lesson", user_record["lesson"], "index.json")
    print(course_index_path)
    course_data = None
    if os.path.exists(course_index_path):
        with open(course_index_path, "r") as f:
            course_data = json.load(f)
    
    # Combine all the data
    response_data = {
        "user_record": user_record,
        "pronunciation_data": pronunciation_data,
        "course_data": course_data
    }
    
    return sanic_json(response_data)

@user_file_bp.route("/lesson-audio/<user_hash>/<lesson_hash>", methods=["POST"])
async def upload_lesson_audio(request, user_hash: str, lesson_hash: str):
    if not request.ctx.user:
        raise SanicException("User not authenticated", status_code=401)
    
    if "file" not in request.files:
        raise SanicException("No file part in the request", status_code=400)

    file = request.files["file"][0]
    
    if not file.name or not file.type.startswith("audio/"):
        raise SanicException("Invalid file or not an audio file", status_code=400)

    # Get pronunciation data from form data
    pronunciation_data = request.form.get("pronunciation_data")
    if pronunciation_data:
        pronunciation_data = json.loads(pronunciation_data)

    # Generate current date in YYYYMMDD format
    current_date = datetime.now().strftime("%Y%m%d")

    # Generate a unique filename
    unique_string = f"{user_hash}_{lesson_hash}_{current_date}"
    hashed_filename = hashlib.md5(unique_string.encode()).hexdigest()
    filename = f"{hashed_filename}{os.path.splitext(file.name)[1]}"

    # Define the upload directory
    upload_dir = os.path.join(BASE_PATH, user_hash, lesson_hash, current_date)
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, filename)
    
    # Delete previous files if they exist
    if os.path.exists(file_path):
        os.remove(file_path)
        pronunciation_file_path = f"{os.path.splitext(file_path)[0]}_pronunciation.json"
        if os.path.exists(pronunciation_file_path):
            os.remove(pronunciation_file_path)

    # Save the audio file
    with open(file_path, "wb") as f:
        f.write(file.body)

    # Save pronunciation data if available
    if pronunciation_data:
        pronunciation_file_path = os.path.join(upload_dir, f"{hashed_filename}_pronunciation.json")
        with open(pronunciation_file_path, "w") as f:
            json.dump(pronunciation_data, f)

    # Create response data
    response_data = {
        "message": "Audio file and pronunciation data uploaded successfully",
        "hash": hashed_filename,
        "path": f"{user_hash}/{lesson_hash}/{current_date}/{filename}",
        "has_pronunciation_data": bool(pronunciation_data),
        "created_at": datetime.now().isoformat()
    }

    return sanic_json(response_data, status=201)

@user_file_bp.route("/lesson-audio/<user_hash>/<lesson_hash>/<hash>", methods=["GET"])
async def get_lesson_audio(request, user_hash: str, lesson_hash: str, hash: str):
    """Get lesson audio and pronunciation data by hash"""
    # Find the audio file
    for date_folder in os.listdir(os.path.join(BASE_PATH, user_hash, lesson_hash)):
        audio_path = os.path.join(BASE_PATH, user_hash, lesson_hash, date_folder)
        for file in os.listdir(audio_path):
            if file.startswith(hash):
                if file.endswith('.json'):
                    continue
                
                # Get the pronunciation data if it exists
                pronunciation_data = None
                pronunciation_path = os.path.join(audio_path, f"{hash}_pronunciation.json")
                if os.path.exists(pronunciation_path):
                    with open(pronunciation_path, 'r') as f:
                        pronunciation_data = json.load(f)
                
                return sanic_json({
                    "hash": hash,
                    "path": f"{user_hash}/{lesson_hash}/{date_folder}/{file}",
                    "pronunciation_data": pronunciation_data
                })
    
    raise SanicException("Audio file not found", status_code=404)

# Add more route handlers for user file operations here

