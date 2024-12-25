import asyncio
from sanic import Blueprint
from sanic.response import json
from sanic.exceptions import SanicException
from sanic_ext import openapi
import base64
import edge_tts

tts_bp = Blueprint("tts", url_prefix="/api/v1/tts")

async def text_to_speech(text: str, voice: str, output_format: str) -> bytes:
    """
    Convert text to speech using Edge TTS.
    """
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if isinstance(chunk, dict) and chunk.get('type') == 'audio':
            audio_data += chunk['data']
    return audio_data

@tts_bp.post("/")
@openapi.summary("Convert text to speech")
@openapi.body({
    "application/json": {
        "text": str,
        "voice": str,
        "output_format": str
    }
})
@openapi.response(200, {"application/json": {"audio": "base64 string"}})
async def convert_text_to_speech(request):
    try:
        data = request.json
        text = data.get("text")
        voice = data.get("voice", "en-US-AriaNeural")
        output_format = data.get("output_format", "audio-16khz-32kbitrate-mono-mp3")

        if not text:
            raise SanicException("Text field is required", status_code=400)
        
        audio_bytes = await text_to_speech(text, voice, output_format)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return json({
            "audio": audio_base64,
            "voice": voice,
            "output_format": output_format
        })
    except Exception as e:
        raise SanicException(str(e), status_code=500)

# Register the blueprint
# from your_main_app import app
# app.blueprint(tts_bp)
