from sanic import Blueprint
from sanic import json, response
from utils.auth import auth_bp
from user.users import users_bp
from utils.tts import tts_bp
from utils.pronunciation import perform_pronunciation_assessment
import tempfile
from pydub import AudioSegment
import os
import time
from course.course import course_bp
from course.course_lesson import lesson_bp
from course.sync_local_file import sync_course_local_bp
from lessons.lessons import lessons_bp
from user.user_course import user_courses_bp
from user.user_lessons import user_lessons_bp
from user.user_files import user_files_bp
from user.user_lessons_results import user_lessons_results_bp
from user.user_group import user_group_bp
from lessons.lesson_type import lesson_type_bp
from page.page import page_bp
from resources.resources import resources_bp

# Create the main blueprint
bp = Blueprint("main_blueprint", url_prefix="/api")

# Get DATABASE_BACKEND from environment variables
database_backend = os.getenv('DATABASE_BACKEND', '').upper()

# Create a list of all blueprints to be registered
blueprints = [
    bp,                  # Main blueprint
    auth_bp,            # Auth blueprint
    users_bp,           # Users blueprint
    tts_bp,             # TTS blueprint
    sync_course_local_bp, # Sync blueprint
    user_files_bp,       # User files blueprint
    user_lessons_bp,
    user_lessons_results_bp,
    lessons_bp,
    user_group_bp,
    lesson_type_bp,
    page_bp,
    resources_bp
]

# Only add file-related blueprints if DATABASE_BACKEND is LOCALFILE
if database_backend == 'LOCALFILE':
    from local_file_api.course_file import course_file_bp
    from local_file_api.user_file import user_file_bp
    from local_file_api.use_shares import use_shares_bp
    blueprints.extend([
        course_file_bp,      # Course file blueprint
        user_file_bp,        # User file blueprint
        use_shares_bp,       # User shares blueprint
    ])
if database_backend == 'POSTGRESQL':
    blueprints.append(course_bp)
    blueprints.append(lesson_bp)
    blueprints.append(user_courses_bp)

@bp.route("/")
async def hello_world(request):
    return json({"message": "Hello, Bamboo Language!"})

@bp.route('/v1/assess-pronunciation', methods=['POST'])
async def assess_pronunciation(request):
    if 'audio' not in request.files:
        return response.json({'error': 'No audio file provided'}, status=400)

    audio_file = request.files.get('audio')
    reference_text = request.form.get('reference_text')
    language = request.form.get('language', 'en-US')

    if not audio_file or not reference_text:
        return response.json({'error': 'Missing audio file or reference text'}, status=400)

    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
        temp_audio.write(audio_file.body)
        temp_audio_path = temp_audio.name

    # Convert WebM to WAV
    wav_path = temp_audio_path + '.wav'
    try:
        # Start timing for WebM to WAV conversion
        conversion_start_time = time.time()
        
        audio = AudioSegment.from_file(temp_audio_path, format="webm")
        audio.export(wav_path, format="wav")
        
        # End timing for WebM to WAV conversion
        conversion_end_time = time.time()
        
        # Calculate and print execution time for conversion
        conversion_time = conversion_end_time - conversion_start_time
        print(f"WebM to WAV conversion took {conversion_time:.4f} seconds")
        
        print(f"Temp audio path: {temp_audio_path}")
        print(f"WAV path: {wav_path}")
        print(f"Reference text: {reference_text}")
        print(f"Language: {language}")
        
        # Start timing for pronunciation assessment
        assessment_start_time = time.time()
        
        result = perform_pronunciation_assessment(wav_path, reference_text, language)
        
        # End timing for pronunciation assessment
        assessment_end_time = time.time()
        
        # Calculate and print execution time for pronunciation assessment
        assessment_time = assessment_end_time - assessment_start_time
        print(f"Pronunciation assessment took {assessment_time:.4f} seconds")
        
        return response.json(result)
    except Exception as e:
        print(f"Error in assess_pronunciation: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return response.json({'error': str(e)}, status=500)
    finally:
        os.unlink(temp_audio_path)
        if os.path.exists(wav_path):
            os.unlink(wav_path)

def setup_routes(app):
    # ... existing blueprints ...
    pass