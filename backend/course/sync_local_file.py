from sanic import Blueprint, json
import os
import json as json_lib
from database import Database
import uuid
from datetime import datetime
from decimal import Decimal
from os import getenv

sync_course_local_bp = Blueprint("sync_course_local", url_prefix="/api/v1/sync")

# Add these constants to match the Django models
LANGUAGE_CHOICES = {
    'EN': 'English',
    'ES': 'Spanish',
    'FR': 'French',
    'DE': 'German',
    'ZH': 'Chinese',
    'JA': 'Japanese'
}

DIFFICULTY_CHOICES = {
    'BEG': 'Beginner',
    'INT': 'Intermediate',
    'ADV': 'Advanced'
}

STATUS_CHOICES = {
    'DRAFT': 'Draft',
    'PUBLISHED': 'Published',
    'ARCHIVED': 'Archived'
}

async def read_course_index(folder_path):
    """Read and parse index.json from course folder"""
    index_path = os.path.join(folder_path, 'index.json')
    if not os.path.exists(index_path):
        return None
    
    with open(index_path, 'r', encoding='utf-8') as f:
        return json_lib.load(f)

async def get_lesson_files(course_folder, folder_name):
    """Scan course folder and get all lesson files from lessons directory"""
    lessons = []
    lessons_dir = os.path.join(course_folder, 'lesson')
    
    if not os.path.exists(lessons_dir):
        return lessons
        
    for lesson_folder in os.listdir(lessons_dir):
        lesson_path = os.path.join(lessons_dir, lesson_folder)
        
        if not os.path.isdir(lesson_path) or lesson_folder.startswith('.'):
            continue
        
        lesson_index_path = os.path.join(lesson_path, 'index.json')
        lesson_title = lesson_folder
        lesson_description = f"Lesson for {lesson_folder}"
        lesson_data = {}
        lesson_type = "DUBBING"
        
        if os.path.exists(lesson_index_path):
            try:
                with open(lesson_index_path, 'r', encoding='utf-8') as f:
                    lesson_data = json_lib.load(f)
                    lesson_type = lesson_data.get('lesson_type', 'DUBBING')
                    lesson_title = lesson_data.get('title', lesson_folder)
                    lesson_description = lesson_data.get('description', lesson_description)
            except:
                pass

        lessons.append({
            'file_path': folder_name + '/lesson/' + lesson_folder,
            'lesson_type': lesson_type,
            'title': lesson_title,
            'description': lesson_description,
            'lesson_content': lesson_data,
            'lesson_resources': lesson_data.get('resources', {}),
            'target': lesson_data.get('target', ''),
            'duration_minutes': lesson_data.get('duration_minutes', None),
            'base_knowledges': lesson_data.get('base_knowledges', []),
            'target_knowledges': lesson_data.get('target_knowledges', [])
        })
    
    return lessons

def normalize_language_code(language):
    """Convert language code to match LANGUAGE_CHOICES"""
    # Map common codes to our format
    language_mapping = {
        'en': 'EN',
        'eng': 'EN',
        'es': 'ES',
        'spa': 'ES',
        'fr': 'FR',
        'fra': 'FR',
        'de': 'DE',
        'deu': 'DE',
        'zh': 'ZH',
        'zho': 'ZH',
        'ja': 'JA',
        'jpn': 'JA'
    }
    
    # Remove any region specifiers and convert to lowercase
    base_lang = language.lower().split('-')[0].split('_')[0]
    
    # Return mapped code or default to 'EN'
    return language_mapping.get(base_lang, 'EN')

def normalize_difficulty(difficulty):
    """Convert difficulty to match DIFFICULTY_CHOICES"""
    difficulty_mapping = {
        'beginner': 'BEG',
        'intermediate': 'INT',
        'advanced': 'ADV',
        'beg': 'BEG',
        'int': 'INT',
        'adv': 'ADV'
    }
    return difficulty_mapping.get(difficulty.lower(), 'BEG')

@sync_course_local_bp.route("/courses", methods=["POST"])
async def sync_courses(request):
    try:
        data_folder = getenv('BASE_COURSE_DATA_PATH')
        if not data_folder:
            return json({"error": "BASE_COURSE_DATA_PATH not set in environment"}, status=500)
            
        if not os.path.exists(data_folder):
            return json({"error": f"Course data folder not found: {data_folder}"}, status=404)

        sync_results = {
            "courses_created": 0,
            "courses_updated": 0,
            "lessons_created": 0,
            "lessons_updated": 0,
            "errors": []
        }

        for folder_name in os.listdir(data_folder):
            folder_path = os.path.join(data_folder, folder_name) 
            print(folder_path)
            if not os.path.isdir(folder_path):
                continue

            try:
                course_data = await read_course_index(folder_path)
                if not course_data:
                    sync_results["errors"].append(f"No index.json found in {folder_name}")
                    continue

                query = "SELECT hash FROM courses WHERE folder_name = $1"
                course_hash = await Database.fetchval(query, folder_name)

                if not course_hash:
                    course_hash = str(uuid.uuid4())[:8]
                    course_query = """
                        INSERT INTO courses (
                            hash, title, description, language, folder_name,
                            difficulty, duration_hours, prerequisites,
                            learning_objectives, status, thumbnail, created_at, 
                            updated_at, is_active, enrollment_count, average_rating
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                            $12, true, 0, null
                        )
                    """
                    
                    now = datetime.utcnow()
                    language_code = normalize_language_code(course_data.get('language', 'EN'))
                    difficulty_code = normalize_difficulty(course_data.get('difficulty', 'BEG'))
                    
                    await Database.execute(
                        course_query,
                        course_hash,
                        course_data.get('title', '')[:255],  # Respect max_length
                        course_data.get('description', ''),
                        language_code,
                        folder_name,
                        difficulty_code,
                        Decimal(str(course_data.get('duration_hours', 1))),
                        course_data.get('prerequisites', ''),
                        course_data.get('learning_objectives', ''),
                        course_data.get('status', 'DRAFT'),
                        course_data.get('thumbnail', '')[:255],  # Respect max_length
                        now
                    )
                    sync_results["courses_created"] += 1
                else:
                    update_query = """
                        UPDATE courses 
                        SET title = $2, description = $3, updated_at = $4
                        WHERE hash = $1
                    """
                    await Database.execute(
                        update_query,
                        course_hash,
                        course_data.get('title', ''),
                        course_data.get('description', ''),
                        datetime.utcnow()
                    )
                    sync_results["courses_updated"] += 1

                # Process lessons
                lessons = await get_lesson_files(folder_path, folder_name)
                for index, lesson in enumerate(lessons):
                    lesson_hash = str(uuid.uuid4())[:8]
                    
                    # Check if lesson exists
                    lesson_query = """
                        SELECT hash FROM lessons 
                        WHERE file_path = $1
                    """
                    existing_lesson = await Database.fetchval(
                        lesson_query, 
                        lesson['file_path']
                    )

                    # Use existing lesson hash or create new one
                    current_lesson_hash = existing_lesson if existing_lesson else lesson_hash

                    if not existing_lesson:
                        # Create new lesson
                        create_lesson_query = """
                            INSERT INTO lessons (
                                hash, title, lesson_type, lesson_content, file_path,
                                lesson_resources, description, target, base_knowledges,
                                target_knowledges, duration_minutes, is_active,
                                is_preview, is_published, created_by, created_at, updated_at,
                                from_course
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                                true, false, true, 'SYSTEM', $12, $12, $13
                            )
                        """
                        now = datetime.utcnow()
                        await Database.execute(
                            create_lesson_query,
                            current_lesson_hash,
                            lesson['title'],
                            lesson['lesson_type'],
                            json_lib.dumps(lesson['lesson_content']),
                            lesson['file_path'],
                            json_lib.dumps(lesson['lesson_resources']),
                            lesson['description'],
                            lesson['target'],
                            json_lib.dumps(lesson['base_knowledges']),
                            json_lib.dumps(lesson['target_knowledges']),
                            lesson['duration_minutes'],
                            now,
                            folder_name  # Add folder_name as from_course
                        )
                        sync_results["lessons_created"] += 1
                    else:
                        # Update existing lesson
                        update_lesson_query = """
                            UPDATE lessons 
                            SET title = $2, lesson_type = $3, lesson_content = $4,
                                lesson_resources = $5, description = $6, target = $7,
                                base_knowledges = $8, target_knowledges = $9,
                                duration_minutes = $10, updated_at = $11,
                                from_course = $12
                            WHERE hash = $1
                        """
                        await Database.execute(
                            update_lesson_query,
                            current_lesson_hash,
                            lesson['title'],
                            lesson['lesson_type'],
                            json_lib.dumps(lesson['lesson_content']),
                            json_lib.dumps(lesson['lesson_resources']),
                            lesson['description'],
                            lesson['target'],
                            json_lib.dumps(lesson['base_knowledges']),
                            json_lib.dumps(lesson['target_knowledges']),
                            lesson['duration_minutes'],
                            datetime.utcnow(),
                            folder_name  # Add folder_name as from_course
                        )
                        sync_results["lessons_updated"] += 1

                    # Check if course-lesson relationship exists
                    relation_query = """
                        SELECT course_hash FROM course_lessons 
                        WHERE course_hash = $1 AND lesson_hash = $2
                    """
                    existing_relation = await Database.fetchval(
                        relation_query,
                        course_hash,
                        current_lesson_hash
                    )

                    if not existing_relation:
                        # Create new course-lesson relationship
                        create_relation_query = """
                            INSERT INTO course_lessons (
                                course_hash, lesson_hash, order_index, is_visible
                            ) VALUES ($1, $2, $3, true)
                        """
                        await Database.execute(
                            create_relation_query,
                            course_hash,
                            current_lesson_hash,
                            index  # Use the loop index as order_index
                        )
                    else:
                        # Update existing relationship order
                        update_relation_query = """
                            UPDATE course_lessons 
                            SET order_index = $3
                            WHERE course_hash = $1 AND lesson_hash = $2
                        """
                        await Database.execute(
                            update_relation_query,
                            course_hash,
                            current_lesson_hash,
                            index
                        )

                # Clean up old course-lesson relationships that are no longer valid
                current_lesson_hashes = [
                    existing_lesson if existing_lesson else str(uuid.uuid4())[:8]
                    for lesson in lessons
                ]

            except Exception as e:
                sync_results["errors"].append(f"Error processing {folder_name}: {str(e)}")

        return json(sync_results)

    except Exception as e:
        return json({"error": str(e)}, status=500)
