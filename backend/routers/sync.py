from fastapi import APIRouter
from services.sync_service import sync_google_sheets_with_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/")
async def sync():
    logger.info("Manual sync endpoint triggered")
    try:
        sync_google_sheets_with_db()
        return {"status": "success", "message": "Synchronization completed successfully"}
    except Exception as e:
        logger.error(f"Error during manual sync: {e}")
        return {"status": "error", "message": str(e)}