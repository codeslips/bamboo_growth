from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
import hashlib

ROLE_CHOICES = [
    ('user', 'User'),
    ('admin', 'Admin'),
    ('teacher', 'Teacher'),
    ('student', 'Student')
]

def hash1(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_user_hash(mobile_phone: str) -> str:
    """Generate a consistent hash for a user based on mobile phone"""
    hash_string = f"{mobile_phone}"
    return hashlib.sha256(hash_string.encode()).hexdigest()[:32]

# User related models
class UserBase(BaseModel):
    mobile_phone: str
    email: str
    full_name: Optional[str] = None

class UserCreate(BaseModel):
    mobile_phone: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: str
    role: Optional[str] = 'user'
    hash: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        self.hash = generate_user_hash(self.mobile_phone)

    def get_password_hash(self):
        return hash1(self.password)
    
    def model_dump(self, *args, **kwargs):
        data = super().model_dump(*args, **kwargs)
        # Add hash to the data before dumping
        data['hash'] = generate_user_hash(self.mobile_phone)
        return data

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None

class User(BaseModel):
    id: int
    hash: str
    mobile_phone: str
    email: Optional[str]
    full_name: Optional[str]
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# UserShare related models
class UserShareBase(BaseModel):
    hash: str
    path: str
    course_id: str
    lesson: str
    user_name: str
    date: str
    has_pronunciation_data: Optional[bool] = False

class UserShareCreate(UserShareBase):
    pass

class UserShareUpdate(BaseModel):
    path: Optional[str] = None
    course_id: Optional[str] = None
    lesson: Optional[str] = None
    user_name: Optional[str] = None
    date: Optional[str] = None
    has_pronunciation_data: Optional[bool] = None

class UserShare(BaseModel):
    id: int
    hash: str
    path: str
    course_id: str
    lesson: str
    user_name: str
    date: str
    has_pronunciation_data: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# UserPage related models
class UserPageBase(BaseModel):
    hash: str
    user_mobile_phone: str
    course_id: str
    page: str
    page_title: str
    page_type: str
    page_version: str
    page_history: list[Dict[str, Any]]

class UserPageCreate(UserPageBase):
    pass

class UserPageUpdate(BaseModel):
    page: Optional[str] = None
    page_type: Optional[str] = None
    page_version: Optional[str] = None
    page_history: Optional[list[Dict[str, Any]]] = None
    page_title: Optional[str] = None
class UserPage(UserPageBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# UserCourse related models
class UserCourseBase(BaseModel):
    user_hash: str
    course_hash: str
    status: str = 'ENROLLED'  # ENROLLED, COMPLETED, DROPPED, PAUSED
    progress_percentage: float = 0.0
    last_accessed_at: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    user_rating: Optional[float] = None

class UserCourseCreate(BaseModel):
    user_hash: str
    course_hash: str

class UserCourseUpdate(BaseModel):
    status: Optional[str] = None
    progress_percentage: Optional[float] = None
    last_accessed_at: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    user_rating: Optional[float] = None

class UserCourse(UserCourseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @property
    def is_completed(self) -> bool:
        return self.status == 'COMPLETED'

    @property
    def is_active(self) -> bool:
        return self.status in ['ENROLLED', 'PAUSED']

