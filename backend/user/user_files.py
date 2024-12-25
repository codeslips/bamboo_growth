from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException, Unauthorized
from sanic_ext import openapi
from datetime import datetime
import os
import hashlib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
BASE_PATH = os.getenv('BASE_USER_DATA_PATH', 'data/user')

user_files_bp = Blueprint("user_files", url_prefix="/api/v1/user-file")

@user_files_bp.get("/folders")
@openapi.summary("List folders for a user")
@openapi.parameter("path", str, "query", description="Folder path (optional)")
@openapi.response(200, {"application/json": dict})
async def list_folders(request):
    """List folders and files in the specified path"""
    if not request.ctx.user:
        raise Unauthorized("User not authenticated")
    
    user_hash = request.ctx.user['hash']
    relative_path = request.args.get('path', '')
    current_path = os.path.join(BASE_PATH, user_hash, relative_path)
    
    if not os.path.exists(current_path):
        raise SanicException("Path not found", status_code=404)
    
    items = []
    for item in os.listdir(current_path):
        item_path = os.path.join(current_path, item)
        item_stat = os.stat(item_path)
        items.append({
            "name": item,
            "type": "folder" if os.path.isdir(item_path) else "file",
            "size": item_stat.st_size,
            "modified": datetime.fromtimestamp(item_stat.st_mtime).isoformat(),
            "path": os.path.join(relative_path, item) if relative_path else item
        })
    
    return json({
        "items": items,
        "current_path": relative_path
    })

@user_files_bp.post("/upload-audio")
@openapi.summary("Upload a file")
@openapi.parameter("path", str, "form", description="Target folder path")
@openapi.body({"multipart/form-data": {"file": "file"}})
@openapi.response(201, {"application/json": dict})
async def upload_file(request):
    """Upload a file to the specified path"""
    print(request.ctx.user)
    if not request.ctx.user:
        raise Unauthorized("User not authenticated")
    
    user_hash = request.ctx.user['hash']
    if "file" not in request.files:
        raise SanicException("No file part in the request", status_code=400)

    file = request.files["file"][0]
    relative_path = request.form.get("path", "")
    
    if not file.name:
        raise SanicException("Invalid file", status_code=400)

    # Create target directory
    upload_dir = os.path.join(BASE_PATH, user_hash, relative_path)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.name}"
    file_path = os.path.join(upload_dir, filename)

    # Save the file
    with open(file_path, "wb") as f:
        f.write(file.body)

    return json({
        "message": "File uploaded successfully",
        "path": os.path.join(relative_path, filename),
        "name": filename,
        "size": os.path.getsize(file_path),
        "created_at": datetime.utcnow().isoformat()
    }, status=201)

@user_files_bp.patch("/rename")
@openapi.summary("Rename a file or folder")
@openapi.body({"application/json": {
    "old_path": str,
    "new_name": str
}})
@openapi.response(200, {"application/json": dict})
async def rename_item(request):
    """Rename a file or folder"""
    if not request.ctx.user:
        raise Unauthorized("User not authenticated")
    
    user_hash = request.ctx.user['hash']
    data = request.json
    old_path = data.get('old_path')
    new_name = data.get('new_name')

    if not old_path or not new_name:
        raise SanicException("Missing required parameters", status_code=400)

    full_old_path = os.path.join(BASE_PATH, user_hash, old_path)
    if not os.path.exists(full_old_path):
        raise SanicException("File or folder not found", status_code=404)

    # Create new path with new name but same directory
    dir_path = os.path.dirname(full_old_path)
    full_new_path = os.path.join(dir_path, new_name)

    if os.path.exists(full_new_path):
        raise SanicException("A file or folder with this name already exists", status_code=409)

    os.rename(full_old_path, full_new_path)
    
    return json({
        "message": "Item renamed successfully",
        "new_path": os.path.join(os.path.dirname(old_path), new_name)
    })

@user_files_bp.delete("/delete")
@openapi.summary("Delete a file or folder")
@openapi.parameter("path", str, "query", description="Path to delete")
@openapi.response(204, description="Item deleted successfully")
async def delete_item(request):
    """Delete a file or folder"""
    if not request.ctx.user:
        raise Unauthorized("User not authenticated")
    
    user_hash = request.ctx.user['hash']
    relative_path = request.args.get('path')
    if not relative_path:
        raise SanicException("Path parameter is required", status_code=400)

    full_path = os.path.join(BASE_PATH, user_hash, relative_path)
    if not os.path.exists(full_path):
        raise SanicException("File or folder not found", status_code=404)

    if os.path.isdir(full_path):
        import shutil
        shutil.rmtree(full_path)
    else:
        os.remove(full_path)

    return json({}, status=204) 