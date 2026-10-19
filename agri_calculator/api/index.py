"""
Vercel Serverless Function Entry Point for Annadata Bharat Backend
Exposes Flask WSGI app to Vercel Serverless Runtime.
"""

import sys
from pathlib import Path

# Add root directory to Python path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app

# Handler for Vercel
app = app
