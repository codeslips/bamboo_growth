# /home/bamboo/bamboo_language/backend/utils/encryption.py

import base64
from urllib.parse import quote, unquote

# Define translation tables
ENCRYPT_TABLE = str.maketrans({
    'a': 'x', 'b': 'y', 'c': 'z', 'd': 'u', 'e': 'v', 'f': 'w',
    'g': 't', 'h': 's', 'i': 'r', 'j': 'q', 'k': 'p', 'l': 'o',
    'm': 'n', 'n': 'm', 'o': 'l', 'p': 'k', 'q': 'j', 'r': 'i',
    's': 'h', 't': 'g', 'u': 'f', 'v': 'e', 'w': 'd', 'x': 'c',
    'y': 'b', 'z': 'a',
    'A': 'X', 'B': 'Y', 'C': 'Z', 'D': 'U', 'E': 'V', 'F': 'W',
    'G': 'T', 'H': 'S', 'I': 'R', 'J': 'Q', 'K': 'P', 'L': 'O',
    'M': 'N', 'N': 'M', 'O': 'L', 'P': 'K', 'Q': 'J', 'R': 'I',
    'S': 'H', 'T': 'G', 'U': 'F', 'V': 'E', 'W': 'D', 'X': 'C',
    'Y': 'B', 'Z': 'A',
    '0': '9', '1': '8', '2': '7', '3': '6', '4': '5',
    '5': '4', '6': '3', '7': '2', '8': '1', '9': '0',
    '!': '@', '@': '!', '#': '$', '$': '#', '%': '^', '^': '%',
    '&': '*', '*': '&', '(': ')', ')': '(', '-': '_', '_': '-',
    '=': '+', '+': '=', '{': '}', '}': '{', '[': ']', ']': '[',
    '|': '\\', '\\': '|', ':': ';', ';': ':', '"': "'", "'": '"',
    '<': '>', '>': '<', ',': '.', '.': ',', '?': '/', '/': '?',
    '`': '~', '~': '`', ' ': ' ',  # Space maps to itself
})

DECRYPT_TABLE = str.maketrans({
    'x': 'a', 'y': 'b', 'z': 'c', 'u': 'd', 'v': 'e', 'w': 'f',
    't': 'g', 's': 'h', 'r': 'i', 'q': 'j', 'p': 'k', 'o': 'l',
    'n': 'm', 'm': 'n', 'l': 'o', 'k': 'p', 'j': 'q', 'i': 'r',
    'h': 's', 'g': 't', 'f': 'u', 'e': 'v', 'd': 'w', 'c': 'x',
    'b': 'y', 'a': 'z',
    'X': 'A', 'Y': 'B', 'Z': 'C', 'U': 'D', 'V': 'E', 'W': 'F',
    'T': 'G', 'S': 'H', 'R': 'I', 'Q': 'J', 'P': 'K', 'O': 'L',
    'N': 'M', 'M': 'N', 'L': 'O', 'K': 'P', 'J': 'Q', 'I': 'R',
    'H': 'S', 'G': 'T', 'F': 'U', 'E': 'V', 'D': 'W', 'C': 'X',
    'B': 'Y', 'A': 'Z',
    '9': '0', '8': '1', '7': '2', '6': '3', '5': '4',
    '4': '5', '3': '6', '2': '7', '1': '8', '0': '9',
    '@': '!', '!': '@', '$': '#', '#': '$', '^': '%', '%': '^',
    '*': '&', '&': '*', ')': '(', '(': ')', '_': '-', '-': '_',
    '+': '=', '=': '+', '}': '{', '{': '}', ']': '[', '[': ']',
    '\\': '|', '|': '\\', ';': ':', ':': ';', "'": '"', '"': "'",
    '>': '<', '<': '>', '.': ',', ',': '.', '/': '?', '?': '/',
    '~': '`', '`': '~', ' ': ' ',  # Space maps to itself
})

def simple_encrypt(text):
    """Simple encryption - character replacement + base64 encode"""
    try:
        # Character substitution
        print(f"Encrypting '{text}'")
        substituted = text.translate(ENCRYPT_TABLE)
        # Base64 encode
        encrypted = base64.urlsafe_b64encode(substituted.encode()).decode()
        print(f"Encrypted '{substituted}' to '{encrypted}'")  # Debug statement
        return encrypted
    except Exception as e:
        print(f"Encryption error: {str(e)}")
        raise

def simple_decrypt(token):
    """Simple decryption - base64 decode + character replacement"""
    try:
        # Base64 decode with padding
        padded = token + '=' * (-len(token) % 4)
        decoded = base64.urlsafe_b64decode(padded).decode()
        # Reverse substitution
        original = decoded.translate(DECRYPT_TABLE)
        print(f"Decrypted '{decoded}' to '{original}'")  # Debug statement
        return original
    except Exception as e:
        print(f"Decryption error: {str(e)}")
        raise

def url_encode(token):
    """URL-encode the share token"""
    return quote(token)

def url_decode(token):
    """URL-decode the share token"""
    return unquote(token)

def test_encryption_decryption():
    """Test to verify that encryption and decryption are inverses."""
    original_text = "TestUserHash:TestLessonHash"
    encrypted = simple_encrypt(original_text)
    decrypted = simple_decrypt(encrypted)
    assert original_text == decrypted, f"Mismatch: '{original_text}' != '{decrypted}'"
    print("Encryption and Decryption Test Passed.")