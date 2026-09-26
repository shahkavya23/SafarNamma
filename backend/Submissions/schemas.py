from typing import Optional , List , Annotated
from pydantic import BaseModel , Field , ConfigDict , field_validator , AfterValidator
from datetime import datetime , timezone
from SQLite.models import VALID_CATEGORIES

# The database stores naive UTC timestamps. Responses tag them as UTC so browsers
# convert to the viewer's local time; inputs are normalised back to naive UTC.
def _to_aware_utc(v: datetime) -> datetime:
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v.astimezone(timezone.utc)

def _to_naive_utc(v: datetime) -> datetime:
    return v if v.tzinfo is None else v.astimezone(timezone.utc).replace(tzinfo=None)

UtcDatetime = Annotated[datetime, AfterValidator(_to_aware_utc)]
NaiveUtcDatetime = Annotated[datetime, AfterValidator(_to_naive_utc)]

class DestinationBase(BaseModel) :

    name : str 
    category : str 
    description : Optional[str] = ""
    state : Optional[str] = None
    budget_tier : str 
    image_url : Optional[str] = None 
    best_season : Optional[str] = None
    is_hidden_gem : Optional[bool] = False
    latitude : Optional[float] = None
    longitude : Optional[float] = None
    map_link : Optional[str] = None
    duration : Optional[str] = None
    is_approved : Optional[bool] = False
    submitted_by_email : Optional[str] = None
    submission_status : Optional[str] = "pending"
    opening_hours : Optional[str] = None
    closing_hours : Optional[str] = None
    transport_options : Optional[str] = None
    nearby_facilities : Optional[str] = None
    gallery_images : Optional[List[str]] = []
    menu_images : Optional[List[str]] = []
    is_popular_weekend : Optional[bool] = False

class GoogleLoginPayload(BaseModel):
    credential : Annotated[str, Field(..., min_length=10, max_length=4096)]

class PresencePing(BaseModel):
    session_id : Annotated[str, Field(..., min_length=8, max_length=64)]

class PopularWeekendPayload(BaseModel):
    destination_ids : List[int]

class AdminApprovalPayload(BaseModel):
    category : Optional[str] = None
    duration : Annotated[str, Field(..., min_length=1, description="Estimated duration (e.g., 2-3 Hours)")]
    best_season : Annotated[str, Field(..., min_length=1, description="Best season to visit (e.g., Oct - Mar)")]
    description : Annotated[str, Field(..., min_length=10, description="Mandatory editorial description for the destination")]
    opening_hours : Annotated[str, Field(..., min_length=1, description="Compulsory practical opening hours for admin approval")]
    closing_hours : Annotated[str, Field(..., min_length=1, description="Compulsory practical closing hours for admin approval")]
    transport_options : Annotated[str, Field(..., min_length=1, description="Compulsory transport guidance for admin approval")]
    nearby_facilities : Annotated[str, Field(..., min_length=1, description="Compulsory nearby facilities list for admin approval")]
    image_url : Optional[str] = None
    gallery_images : Optional[List[str]] = None
    menu_images : Optional[List[str]] = None

class DestinationCreate(DestinationBase):
    pass 

class DestinationResponse(DestinationBase):

    id : int 
    rating : Optional[float] = 0.0
    model_config = ConfigDict(from_attributes = True)
    #"Hey, listen to me. I am about to hand you a SQLAlchemy object, NOT a dictionary. Do not panic. Do not use brackets. I want you to read the data directly from the object's attributes using the dot notation."

    @field_validator('gallery_images', 'menu_images', mode='before')
    @classmethod
    def parse_gallery(cls, v):
        if isinstance(v, str):
            try:
                import json
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
                return [v]
            except Exception:
                return [s.strip() for s in v.split(',') if s.strip()]
        return v or []

class ReviewCreate(BaseModel):

    destination_id : int 
    rating : Annotated[float , Field(...,ge = 1.0  , le = 5.0 , description="Rating must be between 1 and 5 stars")]
    comment : str 

class ReviewResponse(ReviewCreate):

    id : int 
    user_id : int 
    created_at : UtcDatetime 
    model_config = ConfigDict(from_attributes = True)

class UserResponse(BaseModel):

    id : int 
    email : str
    name : Optional[str]=None
    avatar : Optional[str] = None 
    role : str 
    bio : Optional[str] = None
    created_at : Optional[UtcDatetime] = None
    model_config = ConfigDict(from_attributes = True)

class UserUpdate(BaseModel):

    email : str 
    name : Optional[str] = None 
    avatar : Optional[str] = None 
    bio : Optional[str] = None 


class FavoriteCreate(BaseModel):
    destination_id: int
    user_email: str




class TravelGroupCreate(BaseModel):

    destination_id : Optional[int] = None
    custom_destination : Optional[str] = None
    # Filled in server-side from the signed-in user
    organizer_name : Optional[str] = None
    organizer_email : Optional[str] = None
    title : str 
    description : str 
    trip_date : NaiveUtcDatetime 
    meeting_area : str 
    max_members : int =  6
    chat_link : Optional[str] = None
    safety_notes : Optional[str] = None 

class TravelGroupResponse(BaseModel):

    id : int 
    destination_id : Optional[int] = None
    custom_destination : Optional[str] = None
    organizer_name : str 
    organizer_email : str 
    title : str 
    description : str 
    trip_date : UtcDatetime 
    meeting_area : str 
    estimated_cost : float = 0.0
    max_members : int
    current_members : int 
    chat_link : Optional[str] = None 
    status : str 
    safety_notes : Optional[str] = None 
    created_at :UtcDatetime 
    user_request_status : Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class GroupRequestCreate(BaseModel):
    group_id: int
    user_name: str
    user_email: str


class GroupRequestResponse(BaseModel):
    id: int
    group_id: int
    user_name: str
    user_email: str
    status: str
    created_at: UtcDatetime
    model_config = ConfigDict(from_attributes=True)


class NotificationResponse(BaseModel):
    id: int
    user_email: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: UtcDatetime
    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    unread_count: int
    notifications: List[NotificationResponse]


