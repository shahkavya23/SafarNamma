from typing import List, Optional
from datetime import datetime, timedelta
import re
import json
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from server.database import engine, Base, get_db
from SQLite import models
from Submissions import schemas 
from server.cloudinary_utils import delete_destination_cloudinary_assets



app = FastAPI()



origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins = origins,
    allow_origin_regex =r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$",
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"]
)

Base.metadata.create_all(bind = engine)

@app.get('/')
async def root():
    return {"message" : "RoamLoacal API is running"}




@app.get("/api/destinations" , response_model = List[schemas.DestinationResponse])
def get_destinations(category : Optional[str] = None , state : Optional[str] = None , search : Optional[str] = None , db : Session = Depends(get_db)):

    # Only show approved destinations to regular users on the Explore page!
    query = db.query(models.Destination).filter(models.Destination.is_approved == True)

    if category:
        query =  query.filter(models.Destination.category == category)
    if state :
        query = query.filter(models.Destination.state == state)
    if search : 
        query = query.filter(models.Destination.name.ilike(f"%{search}%"))

    return query.all()

@app.get("/api/destinations/popular-weekend", response_model=List[schemas.DestinationResponse])
def get_popular_weekend_destinations(db: Session = Depends(get_db)):
    """Fetches the 3 to 5 destinations curated for 'Popular this weekend'. Falls back to top-rated if none selected."""
    featured = db.query(models.Destination).filter(
        models.Destination.is_approved == True,
        models.Destination.is_popular_weekend == True
    ).limit(5).all()

    # Fallback: if admin hasn't curated yet, return top 3 approved destinations
    if len(featured) < 3:
        featured = db.query(models.Destination).filter(
            models.Destination.is_approved == True
        ).order_by(models.Destination.rating.desc(), models.Destination.id.desc()).limit(3).all()

    return featured

@app.get("/api/destinations/{id}" , response_model = schemas.DestinationResponse)
def get_destination(id : int , db : Session = Depends(get_db)):

    dest = db.query(models.Destination).filter(models.Destination.id == id).first()

    if not dest:
        raise HTTPException(status_code = 404 , detail = "Destination not found")

    return dest 




@app.post("/api/destinations" , response_model = schemas.DestinationResponse , status_code = status.HTTP_201_CREATED)
def create_destination(destination : schemas.DestinationCreate , db : Session = Depends(get_db)):

    clean_name = destination.name.strip()

    # 1. Reject if an approved destination with this exact name already exists in the public catalog
    existing_approved = db.query(models.Destination).filter(
        func.lower(models.Destination.name) == clean_name.lower(),
        models.Destination.is_approved == True
    ).first()
    if existing_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{clean_name}' is already an approved, published destination in the catalog! Duplicate submissions for existing places are not allowed."
        )

    # 2. Check total submissions for this place name (maximum 2 submissions allowed)
    existing_count = db.query(models.Destination).filter(
        func.lower(models.Destination.name) == clean_name.lower()
    ).count()
    if existing_count >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate limit reached: There are already {existing_count} submissions for '{clean_name}'. To prevent spam and duplicates, a maximum of 2 submissions are permitted for the same place name."
        )

    new_dest = models.Destination(
        name = clean_name , 
        category = destination.category,
        description = destination.description or "",
        state = destination.state,
        budget_tier = destination.budget_tier,
        image_url = destination.image_url,
        map_link = destination.map_link,
        best_season = destination.best_season,
        is_hidden_gem = destination.is_hidden_gem or False,
        latitude = destination.latitude,
        longitude = destination.longitude,
        duration = destination.duration,
        opening_hours = destination.opening_hours,
        closing_hours = destination.closing_hours,
        transport_options = destination.transport_options,
        nearby_facilities = destination.nearby_facilities,
        gallery_images = json.dumps(destination.gallery_images) if destination.gallery_images else None,
        is_approved = bool(destination.is_approved) if destination.is_approved is not None else False,
        submitted_by_email = destination.submitted_by_email,
        submission_status = destination.submission_status if destination.submission_status else ("approved" if destination.is_approved else "pending")
    )

    db.add(new_dest)
    db.commit()
    db.refresh(new_dest)

    # Automatically notify submitter and alert admin for community submissions
    if new_dest.submitted_by_email and not new_dest.is_approved:
        notif_user = models.Notification(
            user_email=new_dest.submitted_by_email,
            type="place_pending",
            title="Place Submission Received ⏳",
            message=f"Your submission for '{new_dest.name}' was received and is currently awaiting admin editorial review.",
            link="/profile"
        )
        notif_admin = models.Notification(
            user_email="admin",
            type="admin_submission_alert",
            title="New Place Pending Review 🛡️",
            message=f"'{new_dest.name}' ({new_dest.category}) was submitted by a traveler and needs moderation.",
            link="/admin"
        )
        db.add(notif_user)
        db.add(notif_admin)
        db.commit()

    return new_dest



@app.get("/api/destinations/{destination_id}/reviews" , response_model = List[schemas.ReviewResponse])
def review_get(destination_id : int , db : Session = Depends(get_db)):

    reviews = (db.query(models.Review).filter(models.Review.destination_id == destination_id).all()) #As we need each and every person review on it so we used all with that id 

    return reviews 



@app.post("/api/reviews" , response_model = schemas.ReviewResponse , status_code = status.HTTP_201_CREATED)
def create_review(review : schemas.ReviewCreate , user_id : int = 1 , db : Session = Depends(get_db)):

    dest = (
        db.query(models.Destination).filter(models.Destination.id == review.destination_id).first()
    )

    if not dest :
        raise HTTPException(status_code =  404 , detail = "Destination not found")

    new_review = models.Review(
        destination_id =  review.destination_id,
        user_id =  user_id ,
        rating = review.rating , 
        comment =  review.comment , 
    )

    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    all_reviews = (
        db.query(models.Review).filter(models.Review.destination_id == review.destination_id).all()
    )

    if all_reviews:
        total_score = sum(r.rating for r in all_reviews)
        dest.rating = round(total_score / len(all_reviews) , 1)
        db.commit()

    return new_review



@app.delete("/api/destinations/{destination_id}" , status_code = status.HTTP_204_NO_CONTENT)
def delete_destination(destination_id : int , db : Session = Depends(get_db)):

    dest = (
        db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    )

    if not dest:
        raise HTTPException(status_code = 404 , detail = "Destination not found")

    # Clean up Cloudinary images (cover image + gallery images)
    delete_destination_cloudinary_assets(dest)

    db.delete(dest)

    db.commit()


@app.put("/api/destinations/{destination_id}" , response_model = schemas.DestinationResponse)
def edit_destination(destination_id : int , destination_update: schemas.DestinationCreate , db : Session = Depends(get_db)):

    dest = (db.query(models.Destination).filter(models.Destination.id == destination_id).first())

    if not dest :
        raise HTTPException(status_code = 404 , detail = "Destination Not Found")

    dest.name = destination_update.name
    dest.category = destination_update.category
    dest.description = destination_update.description
    dest.state = destination_update.state
    dest.budget_tier = destination_update.budget_tier
    if destination_update.image_url is not None:
        dest.image_url = destination_update.image_url
    if destination_update.best_season is not None:
        dest.best_season = destination_update.best_season
    if destination_update.is_hidden_gem is not None:
        dest.is_hidden_gem = destination_update.is_hidden_gem
    if destination_update.latitude is not None:
        dest.latitude = destination_update.latitude
    if destination_update.longitude is not None:
        dest.longitude = destination_update.longitude
    if destination_update.map_link is not None :
        dest.map_link = destination_update.map_link 
    if destination_update.duration is not None:
        dest.duration = destination_update.duration
    if destination_update.opening_hours is not None:
        dest.opening_hours = destination_update.opening_hours
    if destination_update.closing_hours is not None:
        dest.closing_hours = destination_update.closing_hours
    if destination_update.transport_options is not None:
        dest.transport_options = destination_update.transport_options
    if destination_update.nearby_facilities is not None:
        dest.nearby_facilities = destination_update.nearby_facilities 
    if destination_update.gallery_images is not None:
        dest.gallery_images = json.dumps(destination_update.gallery_images) if destination_update.gallery_images else None 

    db.commit()
    db.refresh(dest)

    return dest






@app.post("/api/groups", response_model=schemas.TravelGroupResponse, status_code=status.HTTP_201_CREATED)
def create_travel_group(group: schemas.TravelGroupCreate, db: Session = Depends(get_db)):
    # Verify the destination actually exists if an official destination_id was chosen
    if group.destination_id:
        dest = db.query(models.Destination).filter(models.Destination.id == group.destination_id).first()
        if not dest:
            raise HTTPException(status_code=404, detail="Destination not found")
    elif not group.custom_destination:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either an existing destination or a custom multi-stop route must be provided."
        )

    # Strict WhatsApp / Telegram invite link security check
    if group.chat_link and group.chat_link.strip():
        valid_chat_regex = r"^https?://(chat\.whatsapp\.com/[A-Za-z0-9_-]+|wa\.me/[0-9]+|t\.me/[A-Za-z0-9_+-]+|telegram\.me/[A-Za-z0-9_+-]+)"
        if not re.match(valid_chat_regex, group.chat_link.strip(), re.IGNORECASE):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security validation failed: Chat link must be a legitimate WhatsApp (chat.whatsapp.com) or Telegram (t.me) invite link."
            )

    # Rate limit: An organizer can create a maximum of 2 groups per day
    start_of_today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    groups_today = db.query(models.TravelGroup).filter(
        models.TravelGroup.organizer_email.ilike(group.organizer_email),
        models.TravelGroup.created_at >= start_of_today
    ).count()

    if groups_today >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily limit reached: You can only create up to 2 travel groups per day."
        )

    new_group = models.TravelGroup(
        destination_id=group.destination_id,
        custom_destination=group.custom_destination,
        organizer_name=group.organizer_name,
        organizer_email=group.organizer_email,
        title=group.title,
        description=group.description,
        trip_date=group.trip_date,
        meeting_area=group.meeting_area,
        estimated_cost=group.estimated_cost,
        max_members=group.max_members,
        current_members=1,  # Organizer is the 1st member
        chat_link=group.chat_link,
        safety_notes=group.safety_notes,
        status="open"
    )

    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    return new_group




@app.get("/api/groups", response_model=List[schemas.TravelGroupResponse])
def get_travel_groups(db: Session = Depends(get_db)):
    # Auto-expiration: groups disappear once their visiting date and time has passed
    now = datetime.now()
    return db.query(models.TravelGroup).filter(
        models.TravelGroup.trip_date > now
    ).order_by(models.TravelGroup.created_at.desc()).all()


@app.delete("/api/groups/{group_id}", status_code=status.HTTP_200_OK)
def delete_travel_group(group_id: int, organizer_email: str, db: Session = Depends(get_db)):
    group = db.query(models.TravelGroup).filter(models.TravelGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Travel group not found")

    # Only the organizer who created the group is authorized to delete it
    if group.organizer_email.lower() != organizer_email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only the group organizer can delete this group."
        )

    # Cooldown verification: Can only be deleted after 2 hours of creation
    time_elapsed = datetime.now() - group.created_at
    min_cooldown = timedelta(hours=2)
    if time_elapsed < min_cooldown:
        remaining_seconds = (min_cooldown - time_elapsed).total_seconds()
        remaining_minutes = int(remaining_seconds // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This group was created recently. Organizers can only delete a group 2 hours after creation ({remaining_minutes} minute(s) remaining)."
        )

    # Clean up associated join requests first (cascade)
    db.query(models.GroupRequest).filter(models.GroupRequest.group_id == group_id).delete()

    db.delete(group)
    db.commit()

    return {"message": "Travel group deleted successfully"}


@app.get("/api/groups/{group_id}", response_model=schemas.TravelGroupResponse)
def get_travel_group(group_id: int, user_email: Optional[str] = None, db: Session = Depends(get_db)):
    group = db.query(models.TravelGroup).filter(models.TravelGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Travel group not found")



    # Check permission to see chat_link and determine user's request status
    is_organizer = bool(user_email and user_email.lower() == group.organizer_email.lower())
    
    is_approved = False
    user_request_status = None
    if user_email and not is_organizer:
        req = db.query(models.GroupRequest).filter(
            models.GroupRequest.group_id == group_id,
            models.GroupRequest.user_email.ilike(user_email)
        ).first()
        if req:
            user_request_status = req.status  # 'pending', 'approved', or 'rejected'
            is_approved = (req.status == "approved")

    # 🔒 Privacy Shield: If not organizer and not approved, wipe the link from the response!
    response_data = schemas.TravelGroupResponse.model_validate(group)
    response_data.user_request_status = user_request_status
    if not (is_organizer or is_approved):
        response_data.chat_link = None
    return response_data



@app.post("/api/groups/{group_id}/requests", response_model=schemas.GroupRequestResponse, status_code=status.HTTP_201_CREATED)
def request_to_join(group_id: int, request_data: schemas.GroupRequestCreate, db: Session = Depends(get_db)):

    group = db.query(models.TravelGroup).filter(models.TravelGroup.id == group_id).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.current_members >= group.max_members:
        raise HTTPException(status_code=400, detail="This group is already full!")

    if request_data.user_email.lower() == group.organizer_email.lower():
        raise HTTPException(status_code=400, detail="You are the organizer of this group!")

    # Check if already requested
    existing = db.query(models.GroupRequest).filter(
        models.GroupRequest.group_id == group_id,
        models.GroupRequest.user_email == request_data.user_email
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"You already have a {existing.status} request for this group.")
    new_req = models.GroupRequest(
        group_id=group_id,
        user_name=request_data.user_name,
        user_email=request_data.user_email,
        status="pending"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    # 1. Notify the organizer of new applicant
    notif_org = models.Notification(
        user_email=group.organizer_email,
        type="group_request_received",
        title="New Group Join Request 👤",
        message=f"{request_data.user_name} requested to join your trip '{group.title}'.",
        link=f"/groups/{group.id}"
    )
    # 2. Notify applicant that request was successfully dispatched
    notif_user = models.Notification(
        user_email=request_data.user_email,
        type="group_pending",
        title="Trip Request Sent ⏳",
        message=f"Your request to join '{group.title}' was sent to {group.organizer_name} and is awaiting approval.",
        link=f"/groups/{group.id}"
    )
    db.add(notif_org)
    db.add(notif_user)
    db.commit()

    return new_req


@app.get("/api/groups/{group_id}/requests", response_model=List[schemas.GroupRequestResponse])
def get_group_requests(group_id: int, organizer_email: str, db: Session = Depends(get_db)):

    group = db.query(models.TravelGroup).filter(models.TravelGroup.id == group_id).first()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.organizer_email.lower() != organizer_email.lower():
        raise HTTPException(status_code=403, detail="Only the organizer can view join requests.")

    return db.query(models.GroupRequest).filter(models.GroupRequest.group_id == group_id).all()



@app.put("/api/groups/requests/{request_id}/status", response_model = schemas.GroupRequestResponse)
def update_request_status(request_id: int, new_status: str, organizer_email: str, db: Session = Depends(get_db)):

    if new_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    req = db.query(models.GroupRequest).filter(models.GroupRequest.id == request_id).first()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    group = db.query(models.TravelGroup).filter(models.TravelGroup.id == req.group_id).first()

    if group.organizer_email.lower() != organizer_email.lower():
        raise HTTPException(status_code=403, detail="Only the organizer can approve or reject requests.")

    # If approving, increment current_members!
    if new_status == "approved" and req.status != "approved":

        if group.current_members >= group.max_members:
            raise HTTPException(status_code=400, detail="Group is already full!")

        group.current_members += 1

        if group.current_members >= group.max_members:
            group.status = "full"

    req.status = new_status
    db.commit()
    db.refresh(req)

    # Notify applicant of approval or rejection
    if new_status == "approved":
        notif = models.Notification(
            user_email=req.user_email,
            type="group_approved",
            title="Trip Request Approved! 🎉",
            message=f"You've been approved for '{group.title}'! The private group chat link is now unlocked.",
            link=f"/groups/{group.id}"
        )
        db.add(notif)
        db.commit()
    elif new_status == "rejected":
        notif = models.Notification(
            user_email=req.user_email,
            type="group_rejected",
            title="Trip Request Declined ❌",
            message=f"Your request to join '{group.title}' was declined by the organizer.",
            link=f"/groups/{group.id}"
        )
        db.add(notif)
        db.commit()

    return req

@app.get("/api/users/profile", response_model=schemas.UserResponse)
def get_user_profile(email: str, db: Session = Depends(get_db)):
    """Fetches user profile by email or auto-creates a record if new."""
    user = db.query(models.User).filter(models.User.email.ilike(email)).first()
    if not user:
        user = models.User(
            email=email,
            name=email.split('@')[0],
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@app.put("/api/users/profile" , response_model = schemas.UserResponse)
def update_user_profile(user_data : schemas.UserUpdate , db : Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.email == user_data.email).first()

    if not user :

        user = models.User(
            email = user_data.email,
            name = user_data.name or 'Traveler',
            avatar = user_data.avatar,
            bio = user_data.bio,
            role = "user"
        )

        db.add(user)
    else:

        if user_data.name is not None :
            user.name = user_data.name
        if user_data.avatar is not None :
            user.avatar = user_data.avatar
        if user_data.bio is not None :
            user.bio = user_data.bio 

    db.commit()
    db.refresh(user)
    return user


@app.get("/api/users/submissions", response_model=List[schemas.DestinationResponse])
def get_user_submissions(user_email: str, db: Session = Depends(get_db)):
    """Fetches all places submitted by a specific traveler."""
    return db.query(models.Destination).filter(
        models.Destination.submitted_by_email.ilike(user_email)
    ).order_by(models.Destination.id.desc()).all()


# ==========================================
# FAVORITES ENDPOINTS (SSOT IN SQLITE)
# ==========================================

@app.get("/api/favorites", response_model=List[schemas.DestinationResponse])
def get_favorites(user_email: str, db: Session = Depends(get_db)):
    """Fetches all destinations saved as favorites by a user from the database."""
    user = db.query(models.User).filter(models.User.email.ilike(user_email)).first()
    if not user:
        return []

    return db.query(models.Destination).join(
        models.Favorite, models.Favorite.destination_id == models.Destination.id
    ).filter(
        models.Favorite.user_id == user.id
    ).all()


@app.post("/api/favorites", status_code=status.HTTP_201_CREATED)
def add_favorite(payload: schemas.FavoriteCreate, db: Session = Depends(get_db)):
    """Saves a destination into the user's favorites in SQLite."""
    user = db.query(models.User).filter(models.User.email.ilike(payload.user_email)).first()
    if not user:
        user = models.User(
            email=payload.user_email,
            name=payload.user_email.split('@')[0],
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.destination_id == payload.destination_id
    ).first()

    if not existing:
        fav = models.Favorite(
            user_id=user.id,
            destination_id=payload.destination_id
        )
        db.add(fav)
        db.commit()

    return {"status": "success", "destination_id": payload.destination_id}


@app.delete("/api/favorites/{destination_id}")
def remove_favorite(destination_id: int, user_email: str, db: Session = Depends(get_db)):
    """Removes a destination from the user's favorites in SQLite."""
    user = db.query(models.User).filter(models.User.email.ilike(user_email)).first()
    if not user:
        return {"status": "success"}

    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.destination_id == destination_id
    ).first()

    if fav:
        db.delete(fav)
        db.commit()

    return {"status": "success", "destination_id": destination_id}



# ==========================================
# ADMIN MODERATION ENDPOINTS
# ==========================================

@app.get("/api/admin/submissions", response_model=List[schemas.DestinationResponse])
def get_pending_submissions(db: Session = Depends(get_db)):
    """Fetches all community destinations that are pending admin review."""
    return db.query(models.Destination).filter(models.Destination.submission_status == "pending").all()


@app.put("/api/admin/submissions/{destination_id}/approve")
def approve_submission(destination_id: int, payload: schemas.AdminApprovalPayload, db: Session = Depends(get_db)):
    """Approves a community submission and enriches it with mandatory curated metadata."""
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Mandatory image check before approval:
    # If the user did not upload an image, it is mandatory for admin to insert an image!
    effective_image_url = (payload.image_url.strip() if payload.image_url else None) or (dest.image_url.strip() if dest.image_url else None)
    if not effective_image_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A cover image is mandatory before approving this place. If the user did not provide one, the admin must insert an image."
        )
    dest.image_url = effective_image_url

    if payload.gallery_images is not None:
        dest.gallery_images = json.dumps(payload.gallery_images) if payload.gallery_images else None

    # Save the mandatory metadata and editorial description provided by the admin
    dest.duration = payload.duration
    dest.best_season = payload.best_season
    dest.description = payload.description
    dest.opening_hours = payload.opening_hours
    dest.closing_hours = payload.closing_hours
    dest.transport_options = payload.transport_options
    dest.nearby_facilities = payload.nearby_facilities
    dest.is_approved = True
    dest.submission_status = "approved"

    # Notify submitter of approval
    if dest.submitted_by_email:
        notif = models.Notification(
            user_email=dest.submitted_by_email,
            type="place_approved",
            title="Place Approved & Published! 🎉",
            message=f"Great news! Your place '{dest.name}' was approved and is now featured on the Explore page.",
            link=f"/places/{dest.id}"
        )
        db.add(notif)

    db.commit()
    db.refresh(dest)
    return {"message": "Destination enriched, approved and published!", "id": destination_id}


@app.delete("/api/admin/submissions/{destination_id}/reject")
def reject_submission(destination_id: int, db: Session = Depends(get_db)):
    """Rejects a pending submission, notifies the submitter, and removes the destination."""
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # 1. Notify submitter before deleting
    if dest.submitted_by_email:
        notif = models.Notification(
            user_email=dest.submitted_by_email,
            type="place_rejected",
            title="Place Submission Not Approved ❌",
            message=f"Your submission for '{dest.name}' was reviewed by our admin team and could not be approved for the Explore catalog.",
            link="/explore"
        )
        db.add(notif)

    # 2. Delete destination images from Cloudinary
    delete_destination_cloudinary_assets(dest)

    # 3. Delete destination from table
    db.delete(dest)
    db.commit()
    return {"message": "Submission rejected and removed.", "id": destination_id}


@app.put("/api/admin/popular-weekend")
def set_popular_weekend_destinations(payload: schemas.PopularWeekendPayload, db: Session = Depends(get_db)):
    """Admin curates 3 to 5 destinations to feature on the homepage under 'Popular this weekend'."""
    ids = list(dict.fromkeys(payload.destination_ids))  # preserve order & deduplicate
    if len(ids) < 3 or len(ids) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must select between 3 and 5 destinations for the 'Popular this weekend' showcase."
        )

    # Verify all exist and are approved
    valid_count = db.query(models.Destination).filter(
        models.Destination.id.in_(ids),
        models.Destination.is_approved == True
    ).count()

    if valid_count != len(ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more selected destinations are invalid or not yet approved."
        )

    # Reset existing featured destinations
    db.query(models.Destination).filter(
        models.Destination.is_popular_weekend == True
    ).update({models.Destination.is_popular_weekend: False}, synchronize_session=False)

    # Mark new selections
    db.query(models.Destination).filter(
        models.Destination.id.in_(ids)
    ).update({models.Destination.is_popular_weekend: True}, synchronize_session=False)

    db.commit()
    return {"message": "Popular weekend destinations successfully updated!", "featured_ids": ids}


# ==========================================
# NOTIFICATIONS ENDPOINTS
# ==========================================

@app.get("/api/notifications", response_model=schemas.NotificationListResponse)
def get_notifications(user_email: str, is_admin: bool = False, db: Session = Depends(get_db)):
    """Fetches user notifications and admin moderation alerts."""
    if is_admin:
        query = db.query(models.Notification).filter(
            (models.Notification.user_email.ilike(user_email)) | (models.Notification.user_email == "admin")
        )
    else:
        query = db.query(models.Notification).filter(models.Notification.user_email.ilike(user_email))
    
    notifications = query.order_by(models.Notification.created_at.desc()).limit(40).all()
    unread_count = sum(1 for n in notifications if not n.is_read)
    
    return schemas.NotificationListResponse(
        unread_count=unread_count,
        notifications=notifications
    )


@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    """Marks a single notification as read."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}


@app.put("/api/notifications/read-all")
def mark_all_notifications_read(user_email: str, is_admin: bool = False, db: Session = Depends(get_db)):
    """Marks all notifications as read for a user or admin."""
    if is_admin:
        query = db.query(models.Notification).filter(
            (models.Notification.user_email.ilike(user_email)) | (models.Notification.user_email == "admin")
        )
    else:
        query = db.query(models.Notification).filter(models.Notification.user_email.ilike(user_email))
    
    query.update({models.Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"status": "success"}


@app.delete("/api/notifications/clear-all")
def clear_all_notifications(user_email: str, is_admin: bool = False, db: Session = Depends(get_db)):
    """Deletes/clears all notifications for a user or admin from the database."""
    if is_admin:
        query = db.query(models.Notification).filter(
            (models.Notification.user_email.ilike(user_email)) | (models.Notification.user_email == "admin")
        )
    else:
        query = db.query(models.Notification).filter(models.Notification.user_email.ilike(user_email))
    
    query.delete(synchronize_session=False)
    db.commit()
    return {"status": "success", "message": "All notifications cleared from database"}


@app.delete("/api/notifications/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    """Deletes a single notification from the database."""
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"status": "success"}

