from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException
from sanic_ext import openapi
from models import UserSharesORM
from database import SessionLocal
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from models import UserShareCreate, UserShare, UserShareUpdate
import json as json_lib
import os

use_shares_bp = Blueprint("use_shares", url_prefix="api/v1/user_shares")

class DateTimeEncoder(json_lib.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

BASE_PATH = os.getenv('BASE_USER_DATA_PATH', 'data/user')
BASE_COURSE_PATH = os.getenv('BASE_COURSE_DATA_PATH', 'data/course')

@use_shares_bp.get("/")
@openapi.summary("Get all user shares")
@openapi.response(200, {"application/json": list})
async def get_user_shares(request):
    db = SessionLocal()
    try:
        shares = db.query(UserSharesORM).all()
        return json([{
            "id": share.id,
            "hash": share.hash,
            "path": share.path,
            "course_id": share.course_id,
            "lesson": share.lesson,
            "user_name": share.user_name,
            "date": share.date,
            "has_pronunciation_data": share.has_pronunciation_data,
            "created_at": share.created_at.isoformat(),
            "updated_at": share.updated_at.isoformat()
        } for share in shares])
    finally:
        db.close()

@use_shares_bp.post("/")
@openapi.summary("Create a new user share")
@openapi.body({"application/json": UserShareCreate})
@openapi.response(201, {"application/json": UserShare})
async def create_user_share(request):
    data = request.json
    db = SessionLocal()
    try:
        new_share = UserSharesORM(
            hash=data["hash"],
            path=data["path"],
            course_id=data["course_id"],
            lesson=data["lesson"],
            user_name=data["user_name"],
            date=data["date"],
            has_pronunciation_data=data.get("has_pronunciation_data", False),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_share)
        db.commit()
        db.refresh(new_share)
        return json(json_lib.loads(json_lib.dumps(UserShare.from_orm(new_share).dict(), cls=DateTimeEncoder)), status=201)
    except IntegrityError:
        raise SanicException("Share with this hash already exists", status_code=400)
    finally:
        db.close()

@use_shares_bp.get("/<share_hash:str>")
@openapi.summary("Get a user share by hash")
@openapi.response(200, {"application/json": dict})
async def get_user_share(request, share_hash: str):
    db = SessionLocal()
    try:
        share = db.query(UserSharesORM).filter(UserSharesORM.hash == share_hash).first()
        if not share:
            raise SanicException("User share not found", status_code=404)
        
        user_record = json_lib.loads(json_lib.dumps(UserShare.from_orm(share).dict(), cls=DateTimeEncoder))
        
        # Get the pronunciation data
        pronunciation_file_path = os.path.join(BASE_PATH, user_record["path"], f"{user_record['hash']}_pronunciation.json")
        pronunciation_data = None
        if os.path.exists(pronunciation_file_path):
            with open(pronunciation_file_path, "r") as f:
                pronunciation_data = json_lib.load(f)
        
        # Get the course data
        course_index_path = os.path.join(BASE_COURSE_PATH, user_record["course_id"], "lesson", user_record["lesson"], "index.json")
        course_data = None
        if os.path.exists(course_index_path):
            with open(course_index_path, "r") as f:
                course_data = json_lib.load(f)
        
        # Combine all the data
        response_data = {
            "user_record": user_record,
            "pronunciation_data": pronunciation_data,
            "course_data": course_data
        }
        
        return json(response_data, status=200)
    finally:
        db.close()

@use_shares_bp.put("/<share_hash:str>")
@openapi.summary("Update a user share")
@openapi.body({"application/json": UserShareUpdate})
@openapi.response(200, {"application/json": UserShare})
async def update_user_share(request, share_hash: str):
    data = request.json
    db = SessionLocal()
    try:
        share = db.query(UserSharesORM).filter(UserSharesORM.hash == share_hash).first()
        if not share:
            raise SanicException("User share not found", status_code=404)
        
        for key, value in data.items():
            if key != 'hash':  # Prevent updating the hash
                setattr(share, key, value)
        share.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(share)
        return json(json_lib.loads(json_lib.dumps(UserShare.from_orm(share).dict(), cls=DateTimeEncoder)))
    finally:
        db.close()

@use_shares_bp.delete("/<share_hash:str>")
@openapi.summary("Delete a user share")
@openapi.response(204, description="User share deleted successfully")
async def delete_user_share(request, share_hash: str):
    db = SessionLocal()
    try:
        share = db.query(UserSharesORM).filter(UserSharesORM.hash == share_hash).first()
        if not share:
            raise SanicException("User share not found", status_code=404)
        
        db.delete(share)
        db.commit()
        return json({}, status=204)
    finally:
        db.close()