import os
import re
import json
import logging
from urllib.parse import urlparse, unquote
from typing import Optional, List, Union, Any

import cloudinary
import cloudinary.uploader
import cloudinary.api
from dotenv import load_dotenv

# Ensure environment variables are loaded
load_dotenv()

logger = logging.getLogger("cloudinary_utils")

# Load credentials with fallback to alternative env variable naming
CLOUD_NAME = (
    os.getenv("CLOUDINARY_CLOUD_NAME")
    or os.getenv("CLOUD_NAME")
    or os.getenv("VITE_CLOUD_NAME")
    or "my3tjiae"
).strip()

API_KEY = (
    os.getenv("CLOUDINARY_API_KEY")
    or os.getenv("CLOUD_API_KEY")
    or "194939361476248"
).strip()

API_SECRET = (
    os.getenv("CLOUDINARY_API_SECRET")
    or os.getenv("CLOUD_API_SECRET")
    or "mCYmIiw8vDyCHiw1pniqBs1Jq6c"
).strip()

if CLOUD_NAME and API_KEY and API_SECRET:
    cloudinary.config(
        cloud_name=CLOUD_NAME,
        api_key=API_KEY,
        api_secret=API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary SDK configured successfully for cloud: %s", CLOUD_NAME)
else:
    logger.warning("Cloudinary credentials incomplete. Asset deletions will be skipped.")


def extract_cloudinary_public_id(url: str) -> Optional[str]:
    """
    Extracts the public_id of an asset from a Cloudinary delivery URL.
    Handles transformations, versions (v1234567), folders, extensions, and URL encoding.
    Returns None if the URL is not a valid Cloudinary URL.
    """
    if not url or not isinstance(url, str):
        return None

    parsed = urlparse(url.strip())
    if "res.cloudinary.com" not in parsed.netloc:
        return None

    path = parsed.path
    if "/upload/" not in path:
        return None

    # Split everything after '/upload/'
    after_upload = path.split("/upload/", 1)[1]
    segments = [s for s in after_upload.split("/") if s]

    if not segments:
        return None

    # 1. Locate version segment (starts with 'v' followed exclusively by digits, e.g. v1789644354)
    version_idx = -1
    for idx, seg in enumerate(segments):
        if re.match(r"^v\d+$", seg):
            version_idx = idx
            break

    if version_idx != -1:
        # Everything after the version is the asset path (including folders)
        target_path = "/".join(segments[version_idx + 1 :])
    else:
        # If no version segment, skip any transformation segments (e.g. c_fill,w_300, etc.)
        content_idx = 0
        for idx, seg in enumerate(segments):
            if any(
                seg.startswith(p)
                for p in ["c_", "w_", "h_", "q_", "f_", "b_", "g_", "co_", "e_", "r_"]
            ) or "," in seg:
                content_idx = idx + 1
            else:
                break
        target_path = "/".join(segments[content_idx:])

    if not target_path:
        return None

    # Strip query parameters or hash if any remained
    target_path = target_path.split("?")[0].split("#")[0]

    # Decode percent-encoded characters (e.g. %20 -> space)
    decoded_path = unquote(target_path)

    # Strip format extension (.jpg, .png, .webp, .jpeg, etc.)
    public_id = re.sub(r"\.[a-zA-Z0-9]+$", "", decoded_path)

    return public_id if public_id else None


def delete_cloudinary_image(url_or_public_id: str) -> dict:
    """
    Deletes a single image asset from Cloudinary.
    Accepts either a full Cloudinary URL or a public_id.
    Returns Cloudinary response dict or error indicator.
    """
    if not url_or_public_id or not isinstance(url_or_public_id, str):
        return {"result": "skipped", "reason": "empty or invalid identifier"}

    # Extract public_id if a URL was supplied
    if url_or_public_id.startswith("http://") or url_or_public_id.startswith("https://"):
        public_id = extract_cloudinary_public_id(url_or_public_id)
        if not public_id:
            return {"result": "skipped", "reason": "not a recognized Cloudinary URL"}
    else:
        public_id = url_or_public_id.strip()

    try:
        logger.info("Attempting to delete Cloudinary asset: %s", public_id)
        res = cloudinary.uploader.destroy(public_id, invalidate=True)
        result_status = res.get("result")
        logger.info("Cloudinary destroy response for %s: %s", public_id, result_status)

        # Fallback: In rare cases where public_id was uploaded including extension
        if result_status == "not found" and (url_or_public_id.startswith("http")):
            parsed_path = urlparse(url_or_public_id).path
            raw_filename = unquote(parsed_path.split("/")[-1])
            if raw_filename and raw_filename != public_id:
                fallback_res = cloudinary.uploader.destroy(raw_filename, invalidate=True)
                if fallback_res.get("result") == "ok":
                    return fallback_res

        return res
    except Exception as e:
        logger.error("Failed to delete asset '%s' from Cloudinary: %s", public_id, str(e))
        return {"result": "error", "error": str(e), "public_id": public_id}


def delete_cloudinary_images(urls_or_public_ids: List[str]) -> List[dict]:
    """
    Deletes multiple image assets from Cloudinary.
    """
    results = []
    seen = set()
    for item in urls_or_public_ids:
        if not item or item in seen:
            continue
        seen.add(item)
        res = delete_cloudinary_image(item)
        results.append(res)
    return results


def delete_destination_cloudinary_assets(destination: Any) -> List[dict]:
    """
    Extracts cover photo and all gallery photos from a Destination model instance
    and deletes them permanently from Cloudinary.
    """
    urls_to_delete: List[str] = []

    # 1. Main cover photo
    if getattr(destination, "image_url", None):
        urls_to_delete.append(destination.image_url)

    # 2. Gallery photos
    gallery_val = getattr(destination, "gallery_images", None)
    if gallery_val:
        if isinstance(gallery_val, list):
            for img in gallery_val:
                if isinstance(img, str):
                    urls_to_delete.append(img)
        elif isinstance(gallery_val, str):
            try:
                parsed = json.loads(gallery_val)
                if isinstance(parsed, list):
                    for img in parsed:
                        if isinstance(img, str):
                            urls_to_delete.append(img)
                elif isinstance(parsed, str):
                    urls_to_delete.append(parsed)
            except Exception:
                # Handle comma-separated or plain text strings
                for item in gallery_val.split(","):
                    cleaned = item.strip().strip("\"'[]")
                    if cleaned.startswith("http"):
                        urls_to_delete.append(cleaned)

    if not urls_to_delete:
        logger.info("No images found for destination ID %s", getattr(destination, "id", "unknown"))
        return []

    logger.info(
        "Deleting %d image(s) from Cloudinary for destination ID %s: %s",
        len(urls_to_delete),
        getattr(destination, "id", "unknown"),
        urls_to_delete,
    )
    return delete_cloudinary_images(urls_to_delete)
