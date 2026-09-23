from typing import Required
from sqlalchemy import Column , Integer , String , Float , Boolean , Text , DateTime , ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime 
from server.database import Base 

class User(Base):

    __tablename__ = "users"

    id = Column(Integer , primary_key = True , index =  True)
    email = Column(String , unique = True , index = True , nullable = False)
    name = Column(String)
    avatar = Column(String , nullable = True)
    role = Column(String , default = "user")
    created_at = Column(DateTime , default = datetime.utcnow)
    bio = Column(Text , nullable = True)



# Allowed destination categories
VALID_CATEGORIES = [
    "Park",
    "Game Zone",
    "Monuments",
    "Museums",
    "Adventure",
    "Cafe",
    "Mall",
    "Entertainment",
    "Shopping",
    "Famous Streets",
    "Religious Places",
    "Lakes",
    "Treks"
]

class Destination(Base):

    __tablename__ = "destinations"

    id = Column(Integer , primary_key = True , index = True)
    name  = Column(String , index = True , nullable = False)
    state = Column(String, nullable=True)
    category  = Column(String , nullable = False)
    description = Column(Text , nullable = False )
    image_url = Column(String)
    gallery_images = Column(Text , nullable=True)
    map_link = Column(String)
    best_season = Column(String)
    budget_tier = Column(String , nullable = False)
    duration = Column(String, nullable=True)
    rating = Column(Float , default = 0.0)
    is_hidden_gem = Column(Boolean , default = False)
    latitude = Column(Float , nullable = True)
    longitude = Column(Float , nullable = True)
    is_approved = Column(Boolean , default = False)
    submitted_by_email = Column(String, nullable=True)
    submission_status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    opening_hours = Column(String, nullable=True)
    closing_hours = Column(String, nullable=True)
    transport_options = Column(String, nullable=True)
    nearby_facilities = Column(String, nullable=True)
    is_popular_weekend = Column(Boolean, default=False)




class Review(Base):

    __tablename__ = "reviews"

    id = Column(Integer , primary_key = True , index = True)

    destination_id = Column(Integer , ForeignKey("destinations.id"))

    user_id = Column(Integer , ForeignKey("users.id"))

    rating = Column(Float)

    comment =  Column(Text)

    created_at = Column(DateTime , default = datetime.utcnow)

class Favorite(Base):

    __tablename__ = "favorites"

    id = Column(Integer , primary_key = True , index = True)

    user_id = Column(Integer , ForeignKey("users.id"))

    destination_id = Column(Integer , ForeignKey("destinations.id"))




class TravelGroup(Base):

    __tablename__ = "travel_groups"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id"), nullable=True)
    custom_destination = Column(String, nullable=True)
    organizer_name = Column(String, nullable=False)
    organizer_email = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    trip_date = Column(DateTime, nullable=False)
    meeting_area = Column(String, nullable=False)
    estimated_cost = Column(Float, default=0.0)
    max_members = Column(Integer, default=5)
    current_members = Column(Integer, default=1)

    #  Secret chat link (only shown to approved members & organizer!)
    chat_link = Column(String, nullable=True)
    
    status = Column(String, default="open")  # 'open', 'full', 'cancelled'
    safety_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)


class GroupRequest(Base):

    __tablename__ = "group_requests"

    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("travel_groups.id"), nullable=False)
    user_email = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    created_at = Column(DateTime, default=datetime.now)


class Notification(Base):

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, index=True, nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
