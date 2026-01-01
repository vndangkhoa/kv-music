import subprocess
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_ytdlp():
    """
    Check for and install the latest version of yt-dlp.
    """
    logger.info("Scheduler: Checking for yt-dlp updates...")
    try:
        # Run pip install --upgrade yt-dlp
        result = subprocess.run(
            ["pip", "install", "--upgrade", "yt-dlp"],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"Scheduler: yt-dlp update completed.\n{result.stdout}")
    except subprocess.CalledProcessError as e:
        logger.error(f"Scheduler: Failed to update yt-dlp.\nError: {e.stderr}")
    except Exception as e:
        logger.error(f"Scheduler: Unexpected error during update: {str(e)}")

def start_scheduler():
    """
    Initialize and start the background scheduler.
    """
    scheduler = BackgroundScheduler()
    
    # Schedule yt-dlp update every 24 hours
    trigger = IntervalTrigger(days=1)
    scheduler.add_job(
        update_ytdlp,
        trigger=trigger,
        id="update_ytdlp_job",
        name="Update yt-dlp daily",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Scheduler: Started background scheduler. yt-dlp will update every 24 hours.")
    
    # Run once on startup to ensure we are up to date immediately
    # update_ytdlp() # Optional: Uncomment if we want strict enforcement on boot

    return scheduler
