from sanic import Blueprint
from sanic.response import json
from sanic import Sanic
from sanic.exceptions import SanicException, Unauthorized, Forbidden
from sanic_ext import openapi
from models import UserCreate, User, hash1
from database import Database
from datetime import datetime, timedelta
import jwt  # Ensure this is PyJWT
import json as json_lib  # Import the standard json library
import os
from dotenv import load_dotenv
from functools import wraps
from urllib.parse import unquote  # Add this import at the top

# Load environment variables
load_dotenv()
TABLE_PREFIX = os.getenv('DATABASE_TABLE_PREFIX', '')
USERS_TABLE = f"{TABLE_PREFIX}_users"

SECRET_KEY = "your_secret_key_here"  # Replace with a secure secret key

auth_bp = Blueprint("auth", url_prefix="/api/v1/auth")

@auth_bp.route("/signup", methods=["POST"])
@openapi.summary("Sign up a new user")
@openapi.body({"application/json": UserCreate})
@openapi.response(201, {"application/json": User}, description="User created successfully")
@openapi.response(400, {"application/json": {"error": str}}, description="User already exists")
async def signup(request):
    user_data = UserCreate.parse_obj(request.json)
    
    # Check if user already exists
    existing_user = await Database.fetchrow(
        f"""
        SELECT id FROM {USERS_TABLE} 
        WHERE mobile_phone = $1 OR email = $2
        """,
        user_data.mobile_phone,
        user_data.email
    )
    
    if existing_user:
        raise SanicException("User with this mobile phone or email already exists", status_code=400)
    
    # Create new user
    try:
        user_row = await Database.fetchrow(
            f"""
            INSERT INTO {USERS_TABLE} (
                hash,
                mobile_phone, 
                email, 
                full_name, 
                hashed_password,
                role,
                created_at,
                updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, hash, mobile_phone, email, full_name, role, created_at, updated_at
            """,
            user_data.hash,  # You'll need to add this to UserCreate model
            user_data.mobile_phone,
            user_data.email,
            user_data.full_name,
            user_data.get_password_hash(),
            'user',  # default role
            datetime.utcnow(),
            datetime.utcnow()
        )
        
        # Convert the database row to a User model
        user = User(
            id=user_row['id'],
            hash=user_row['hash'],
            mobile_phone=user_row['mobile_phone'],
            email=user_row['email'],
            full_name=user_row['full_name'],
            role=user_row['role'],
            created_at=user_row['created_at'],
            updated_at=user_row['updated_at']
        )
        
        return json(user.dict(), status=201)
    except Exception as e:
        raise SanicException(f"Error creating user: {str(e)}", status_code=500)

@auth_bp.route("/login", methods=["POST"])
async def login(request):
    print("Login POST request received")
    
    try:
        # Decode the request body from bytes to string
        body_str = request.body.decode('utf-8')
        # Split the string into key-value pairs
        pairs = body_str.split('&')
        # Create a dictionary from the key-value pairs and URL-decode the values
        data = {k: unquote(v) for k, v in (pair.split('=') for pair in pairs)}
        
        mobile_phone = data.get("mobile_phone")
        password = data.get("password")
        
        print("Mobile phone:", mobile_phone)
        print("Password:", password)

        if not mobile_phone or not password:
            print("Missing credentials")
            return json({"error": "Mobile phone and password are required"}, status=400)

        # Get user from database
        user_row = await Database.fetchrow(
            f"""
            SELECT id, hash, mobile_phone, email, full_name, role, hashed_password, created_at, updated_at
            FROM {USERS_TABLE}
            WHERE mobile_phone = $1
            """,
            mobile_phone
        )

        if user_row and user_row['hashed_password'] == hash1(password):
            access_token = create_access_token(data={"sub": mobile_phone})
            
            # Create User object from database row
            user = User(
                id=user_row['id'],
                hash=user_row['hash'],
                mobile_phone=user_row['mobile_phone'],
                email=user_row['email'],
                full_name=user_row['full_name'],
                role=user_row['role'],
                created_at=user_row['created_at'],
                updated_at=user_row['updated_at']
            )
            
            # Convert to dict and handle datetime serialization
            user_dict = user.dict()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            user_dict['updated_at'] = user_dict['updated_at'].isoformat()
            
            response_data = {
                "message": "Login successful",
                "user": user_dict,
                "access_token": access_token,
                "token_type": "bearer"
            }
            print("Login successful, returning:", json_lib.dumps(response_data))
            return json(response_data, status=200)
        else:
            print("Invalid credentials")
            return json({"error": "Invalid mobile phone or password"}, status=401)
            
    except Exception as e:
        print("Exception occurred:", str(e))
        return json({"error": "An unexpected error occurred"}, status=500)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=120)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise Unauthorized("Could not validate credentials")
    return payload

def admin_required(f):
    @wraps(f)
    async def decorated_function(request, *args, **kwargs):
        # The user is already authenticated and stored in request.ctx.user by the middleware
        user = request.ctx.user
        
        if not user or user['role'] != 'admin':
            raise Forbidden("Admin access required")

        return await f(request, *args, **kwargs)
            
    return decorated_function
