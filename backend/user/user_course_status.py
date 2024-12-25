from sanic.exceptions import SanicException
from database import Database
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USER_COURSES_TABLE = f"{TABLE_PREFIX}_user_courses"
USER_LESSONS_TABLE = f"{TABLE_PREFIX}_user_lessons"

class CourseStatus:
    ENROLLED = "ENROLLED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    PAUSED = "PAUSED"

    # Define valid status transitions
    VALID_TRANSITIONS = {
        ENROLLED: [IN_PROGRESS, DROPPED],
        IN_PROGRESS: [COMPLETED, DROPPED, PAUSED],
        PAUSED: [IN_PROGRESS, DROPPED],
        COMPLETED: [],  # No transitions allowed from completed
        DROPPED: [ENROLLED]  # Allow re-enrollment
    }

class CourseStatusManager:
    @staticmethod
    async def change_status(user_hash: str, course_hash: str, new_status: str):
        """
        Change the status of a user's course enrollment
        """
        # Get current status
        current_status = await CourseStatusManager._get_current_status(user_hash, course_hash)
        
        # Validate status transition
        if not CourseStatusManager._is_valid_transition(current_status, new_status):
            raise SanicException(
                f"Invalid status transition from {current_status} to {new_status}",
                status_code=400
            )

        # Perform status-specific actions
        await CourseStatusManager._handle_status_change(user_hash, course_hash, current_status, new_status)

    @staticmethod
    async def _get_current_status(user_hash: str, course_hash: str) -> str:
        """
        Get the current status of a user's course enrollment
        """
        query = f"""
            SELECT status 
            FROM {USER_COURSES_TABLE}
            WHERE user_hash = $1 AND course_hash = $2
        """
        result = await Database.fetchrow(query, user_hash, course_hash)
        
        if not result:
            raise SanicException("Course enrollment not found", status_code=404)
        
        return result['status']

    @staticmethod
    def _is_valid_transition(current_status: str, new_status: str) -> bool:
        """
        Check if the status transition is valid
        """
        if current_status not in CourseStatus.VALID_TRANSITIONS:
            return False
        
        return new_status in CourseStatus.VALID_TRANSITIONS[current_status]

    @staticmethod
    async def _handle_status_change(user_hash: str, course_hash: str, 
                                  old_status: str, new_status: str,
                                  create_all_lessons: bool = False):
        """
        Handle the status change and perform necessary actions
        
        Args:
            user_hash (str): The user's hash
            course_hash (str): The course's hash 
            old_status (str): The current status
            new_status (str): The new status to change to
            create_all_lessons (bool, optional): Whether to create all lesson records when enrolling.
                                               Defaults to False.
        """
        # Update the course status
        query = f"""
            UPDATE {USER_COURSES_TABLE}
            SET status = $1, updated_at = $2
            WHERE user_hash = $3 AND course_hash = $4
            RETURNING *
        """
        
        await Database.fetchrow(query, new_status, datetime.utcnow(), 
                              user_hash, course_hash)

        # Handle status-specific actions
        if new_status == CourseStatus.ENROLLED:
            await CourseStatusManager._handle_enrolled(user_hash, course_hash, create_all_lessons)
        elif new_status == CourseStatus.IN_PROGRESS:
            await CourseStatusManager._handle_in_progress(user_hash, course_hash)
        elif new_status == CourseStatus.COMPLETED:
            await CourseStatusManager._handle_completed(user_hash, course_hash)
        elif new_status == CourseStatus.DROPPED:
            await CourseStatusManager._handle_dropped(user_hash, course_hash)
        elif new_status == CourseStatus.PAUSED:
            await CourseStatusManager._handle_paused(user_hash, course_hash)

    # Status-specific handlers (to be implemented based on requirements)
    @staticmethod
    async def _handle_enrolled(user_hash: str, course_hash: str, create_all_lessons: bool = False):
        """
        Handle actions when a course is enrolled:
        1. Get visible lessons of the course
        2. Create user_lesson record(s):
           - If create_all_lessons is True: Create records for all visible lessons
           - If create_all_lessons is False (default): Create record only for the first lesson
        
        Args:
            user_hash (str): The user's hash
            course_hash (str): The course's hash
            create_all_lessons (bool, optional): Whether to create records for all lessons. 
                                               Defaults to False.
        """
        # Get visible lessons of the course ordered by display_order
        lessons_query = """
            SELECT lesson_hash
            FROM course_lessons 
            WHERE course_hash = $1 
                AND is_visible = true
            ORDER BY COALESCE(order_index, 0)
        """
        
        lessons = await Database.fetch(lessons_query, course_hash)
        if not lessons:
            return  # No lessons available yet

        # If create_all_lessons is False, only take the first lesson
        if not create_all_lessons:
            lessons = lessons[:1]

        # Create user_lesson records using batch insert
        now = datetime.utcnow()
        create_lesson_query = f"""
            INSERT INTO {USER_LESSONS_TABLE} (
                user_hash, 
                lesson_hash, 
                status, 
                progress,
                last_accessed, 
                learning_log, 
                is_shared,
                from_course,
                created_at, 
                updated_at
            )
            SELECT * FROM UNNEST(
                $1::text[], $2::text[], $3::text[], $4::float[], 
                $5::timestamp[], $6::jsonb[], $7::boolean[], $8::text[],
                $9::timestamp[], $10::timestamp[]
            )
            ON CONFLICT (user_hash, lesson_hash) DO NOTHING
        """

        try:
            # Prepare batch data
            user_hashes = [user_hash] * len(lessons)
            lesson_hashes = [lesson['lesson_hash'] for lesson in lessons]
            statuses = ['not_started'] * len(lessons)
            progresses = [0.0] * len(lessons)
            last_accessed_times = [now] * len(lessons)
            learning_logs = ['{}'] * len(lessons)
            is_shared_values = [False] * len(lessons)
            course_hashes = [course_hash] * len(lessons)
            created_ats = [now] * len(lessons)
            updated_ats = [now] * len(lessons)

            # Execute batch insert
            await Database.execute(
                create_lesson_query,
                user_hashes,
                lesson_hashes,
                statuses,
                progresses,
                last_accessed_times,
                learning_logs,
                is_shared_values,
                course_hashes,
                created_ats,
                updated_ats
            )
        except Exception as e:
            raise SanicException(f"Failed to create user lesson records: {str(e)}", status_code=500)

    @staticmethod
    async def _handle_in_progress(user_hash: str, course_hash: str):
        """Handle actions when a course is marked as in progress"""
        pass

    @staticmethod
    async def _handle_completed(user_hash: str, course_hash: str):
        """Handle actions when a course is completed"""
        pass

    @staticmethod
    async def _handle_dropped(user_hash: str, course_hash: str):
        """Handle actions when a course is dropped"""
        pass

    @staticmethod
    async def _handle_paused(user_hash: str, course_hash: str):
        """Handle actions when a course is paused"""
        pass
