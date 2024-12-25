from sanic.exceptions import SanicException
from database import Database
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USER_LESSONS_TABLE = f"{TABLE_PREFIX}_user_lessons"

class LessonStatus:
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

    # Define valid status transitions
    VALID_TRANSITIONS = {
        NOT_STARTED: [IN_PROGRESS],
        IN_PROGRESS: [COMPLETED],
        COMPLETED: []  # No transitions allowed from completed
    }

class LessonStatusManager:
    @staticmethod
    async def change_status(user_hash: str, lesson_hash: str, new_status: str):
        """
        Change the status of a user's lesson progress
        """
        # Get current status
        current_status = await LessonStatusManager._get_current_status(user_hash, lesson_hash)
        
        # Validate status transition
        if not LessonStatusManager._is_valid_transition(current_status, new_status):
            raise SanicException(
                f"Invalid status transition from {current_status} to {new_status}",
                status_code=400
            )

        # Perform status change
        await LessonStatusManager._handle_status_change(user_hash, lesson_hash, current_status, new_status)

    @staticmethod
    async def _get_current_status(user_hash: str, lesson_hash: str) -> str:
        """
        Get the current status of a user's lesson progress
        """
        query = f"""
            SELECT status 
            FROM {USER_LESSONS_TABLE}
            WHERE user_hash = $1 AND lesson_hash = $2
        """
        result = await Database.fetchrow(query, user_hash, lesson_hash)
        
        if not result:
            raise SanicException("Lesson progress record not found", status_code=404)
        
        return result['status']

    @staticmethod
    def _is_valid_transition(current_status: str, new_status: str) -> bool:
        """
        Check if the status transition is valid
        """
        if current_status not in LessonStatus.VALID_TRANSITIONS:
            return False
        
        return new_status in LessonStatus.VALID_TRANSITIONS[current_status]

    @staticmethod
    async def _handle_status_change(user_hash: str, lesson_hash: str, 
                                  old_status: str, new_status: str):
        """
        Handle the status change and perform necessary actions
        """
        now = datetime.utcnow()
        
        # Update the lesson status
        query = f"""
            UPDATE {USER_LESSONS_TABLE}
            SET status = $1, 
                updated_at = $2,
                last_accessed = $2
            WHERE user_hash = $3 AND lesson_hash = $4
            RETURNING *
        """
        
        result = await Database.fetchrow(query, new_status, now, 
                                       user_hash, lesson_hash)

        # Handle status-specific actions
        if new_status == LessonStatus.IN_PROGRESS:
            await LessonStatusManager._handle_in_progress(user_hash, lesson_hash)
        elif new_status == LessonStatus.COMPLETED:
            await LessonStatusManager._handle_completed(user_hash, lesson_hash)

    @staticmethod
    async def _handle_in_progress(user_hash: str, lesson_hash: str):
        """
        Handle actions when a lesson is marked as in progress
        """
        # Get the course hash for this lesson
        course_query = """
            SELECT course_hash 
            FROM course_lessons 
            WHERE lesson_hash = $1
        """
        course_result = await Database.fetchrow(course_query, lesson_hash)
        
        if course_result:
            # Update the corresponding course status to IN_PROGRESS if it's not already
            from .user_course_status import CourseStatusManager, CourseStatus
            try:
                current_course_status = await CourseStatusManager._get_current_status(
                    user_hash, course_result['course_hash']
                )
                if current_course_status == CourseStatus.ENROLLED:
                    await CourseStatusManager.change_status(
                        user_hash, 
                        course_result['course_hash'],
                        CourseStatus.IN_PROGRESS
                    )
            except SanicException:
                pass  # Handle case where course status doesn't exist

    @staticmethod
    async def _handle_completed(user_hash: str, lesson_hash: str):
        """
        Handle actions when a lesson is completed:
        1. Update progress to 100%
        2. Check if all lessons in the course are completed
        3. If all lessons are completed, mark the course as completed
        """
        # Update progress to 100%
        progress_query = f"""
            UPDATE {USER_LESSONS_TABLE}
            SET progress = 100.0
            WHERE user_hash = $1 AND lesson_hash = $2
        """
        await Database.execute(progress_query, user_hash, lesson_hash)

        # Get the course hash for this lesson
        course_query = """
            SELECT course_hash 
            FROM course_lessons 
            WHERE lesson_hash = $1
        """
        course_result = await Database.fetchrow(course_query, lesson_hash)
        
        if course_result:
            course_hash = course_result['course_hash']
            
            # Check if all lessons in the course are completed
            all_lessons_query = f"""
                SELECT 
                    COUNT(*) as total_lessons,
                    COUNT(CASE WHEN ul.status = 'completed' THEN 1 END) as completed_lessons
                FROM course_lessons cl
                LEFT JOIN {USER_LESSONS_TABLE} ul 
                    ON cl.lesson_hash = ul.lesson_hash 
                    AND ul.user_hash = $1
                WHERE cl.course_hash = $2
                    AND cl.is_visible = true 
                    AND cl.is_published = true
            """
            
            lesson_counts = await Database.fetchrow(all_lessons_query, user_hash, course_hash)
            
            # If all lessons are completed, mark the course as completed
            if (lesson_counts['total_lessons'] > 0 and 
                lesson_counts['total_lessons'] == lesson_counts['completed_lessons']):
                from .user_course_status import CourseStatusManager, CourseStatus
                try:
                    await CourseStatusManager.change_status(
                        user_hash, 
                        course_hash,
                        CourseStatus.COMPLETED
                    )
                except SanicException:
                    pass  # Handle case where course status doesn't exist
