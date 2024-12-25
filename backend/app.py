from sanic import Sanic, json, Request
from sanic_cors import CORS
from dotenv import load_dotenv
from routes import blueprints  # Import the blueprints list instead of individual blueprints
from sanic_ext import Extend, openapi
from pathlib import Path
from sanic.response import HTTPResponse, JSONResponse
import json as json_module
from sanic.exceptions import Unauthorized
from utils.auth import verify_token
import time  # Add this import at the top of the file
from database import Database, init_db, close_db  # Add these imports
import os


# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
print(f"Looking for .env file at: {env_path}")
load_dotenv(dotenv_path=env_path)

# Initialize Sanic app
app = Sanic("BambooGrowthApp")
Extend(app)

# Configure CORS properly
CORS(app, resources={
    r"/*": {
        "origins": "http://localhost:10086",  # Replace with your frontend's origin
        "allow_headers": ["Authorization", "Content-Type"],
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }
}, supports_credentials=True)

# Add custom JSON response middleware
@app.middleware('response')
async def custom_json_response(request, response):
    print('response', response)
    if isinstance(response, JSONResponse):
        try:
            # If the body is bytes, decode it to string first
            if isinstance(response.body, bytes):
                original_json = json_module.loads(response.body.decode('utf-8'))
            else:
                original_json = response.body

            custom_response = {
                "status": "success" if response.status < 400 else "error",
                "data": original_json,
                "message": None,  # You can set this based on your needs
                "code": response.status
            }
            new_response = json(custom_response, status=response.status)
            
            # Preserve original CORS headers
            for header, value in response.headers.items():
                if header.lower().startswith("access-control-"):
                    new_response.headers[header] = value
            new_response.headers["Access-Control-Allow-Origin"] = "*"  # Add CORS header
            print('new_response', new_response)
            return new_response
        except Exception as e:
            print(e)
            # If we can't decode the JSON, return the original response
            return response
    print('response', response)
    return response


# Configure OpenAPI info
@app.after_server_start
async def configure_openapi(app, _):
    app.ext.openapi.describe(
        title="Bamboo Language API",
        version="1.0.0",
        description="API for Bamboo Language learning platform",
        #spec_version="2.0.0"  # Specify the OpenAPI version
    )

# Add database initialization on server start
@app.listener('before_server_start')
async def setup_db(app, loop):
    await init_db()
    app.ctx.db = Database

# Add database cleanup on server stop
@app.listener('after_server_stop')
async def cleanup_db(app, loop):
    await close_db()

# Update the auth_middleware function to use asyncpg
async def auth_middleware(request: Request):
    print('path', request.path)
    request.ctx.user = None
    
    skip_auth_prefixes = [
        #'/api/v1', 
        # '/api/v1/user_shares', 
        '/api/v1/auth/login', 
        '/data',
        #'/api/v1/sync/courses',
        '/api/v1/user-lessons/results/shared/',
        # '/api/v1/data/', 
        '/static/',
        # '/docs/'
    ]
    
    if any(request.path.startswith(prefix) for prefix in skip_auth_prefixes):
        return
    if request.path == '/':
        return

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise Unauthorized("Missing or invalid authorization header")

    token = auth_header.split(' ')[1]
    try:
        payload = verify_token(token)
        mobile_phone = payload.get("sub")
        if not mobile_phone:
            raise Unauthorized("Invalid token")
        
        # Query user from database using asyncpg
        user = await app.ctx.db.fetchrow(
            "SELECT * FROM sdl_users WHERE mobile_phone = $1",
            mobile_phone
        )
        
        if not user:
            raise Unauthorized("User not found")
            
        request.ctx.user = dict(user)  # Convert Record to dict
    except Exception as e:
        raise Unauthorized("Invalid token")

# Register the middleware
app.middleware('request')(auth_middleware)

# Register all blueprints from routes.py
for blueprint in blueprints:
    app.blueprint(blueprint)

# Add static file server
app.static("/", os.path.join(os.environ.get("BASE_FRONTEND_PATH"), "index.html"), name="home")
app.static("/data", os.environ.get("BASE_DATA_PATH"), name="data")
app.static("/static", os.environ.get("BASE_FRONTEND_PATH"), name="static_files")

# Endpoint to provide speech key
@app.route('/api/speech-config', methods=['GET'])
async def get_speech_config(request):
    return json({
        'speechKey': os.getenv('AZURE_SPEECH_KEY'),
        'region': os.getenv('AZURE_SPEECH_REGION')
    })

if __name__ == "__main__":
    server_host = os.getenv('SERVER_HOST')
    server_port = int(os.getenv('SERVER_PORT', 8001))  # Convert port to integer
    server_debug = os.getenv('SERVER_DEBUG', 'False').lower() == 'true'  # Convert debug to boolean
    server_auto_reload = os.getenv('SERVER_AUTO_RELOAD', 'False').lower() == 'true'  # Convert auto_reload to boolean
    print('server_host', server_host)
    print('server_port', server_port)
    print('server_debug', server_debug)
    print('server_auto_reload', server_auto_reload)
    app.run(
        host=server_host, 
        port=server_port, 
        debug=server_debug, 
        auto_reload=server_auto_reload
    )