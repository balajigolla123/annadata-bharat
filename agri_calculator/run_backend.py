"""
Run script for Annadata Bharat PyMongo & Machine Learning Backend.
Starts the Flask server on http://127.0.0.1:5000 connected to MongoDB.
"""

import sys
from pathlib import Path

# Fix Windows console encoding if needed
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure project root is in Python path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app, SERVER_HOST, SERVER_PORT, db_manager, ml_engine

if __name__ == "__main__":
    print("=" * 65)
    print("🌾 Annadata Bharat - PyMongo & Machine Learning Server")
    print("=" * 65)
    print(f"📡 API Base URL: http://{SERVER_HOST}:{SERVER_PORT}/api")
    print("🍃 MongoDB Status:", "Connected ✅" if db_manager.is_connected else "Disconnected ❌")
    print(f"🤖 Loaded ML Models: {len(ml_engine.models)} algorithms ready")
    for key, conf in ml_engine.model_metadata.items():
        print(f"   • {conf.get('display_name')} (v{conf.get('version')}) [R² = {conf.get('r2_score', 'N/A')}]")
    print("=" * 65)
    print("Press CTRL+C to stop the server.\n")

    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=False)
