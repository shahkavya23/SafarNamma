import { MOCK_PLACES } from '../mock/data';
import { MOCK_GROUPS } from '../mock/groups';
import type { Place, Group, GroupRequest, Submission, Review, AppNotification } from '../types';
import { PLACE_CATEGORIES } from '../types';
export { PLACE_CATEGORIES };


const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/";

export const placesApi = {
  getPlaces: async (filters?: { category?: string; maxPrice?: number }): Promise<Place[]> => {

    // 1. Fetch from your real FastAPI backend!
    const response = await fetch(`${BASE_URL}api/destinations`);
    const data = await response.json();
    // 2. Set result to the data we got from Python
    let result = data;
    // 3. Apply the category filter if the user clicked a category
    if (filters?.category) {
      result = result.filter((p: any) => p.category.toLowerCase() === filters.category!.toLowerCase());
    }

    // (Note: We are ignoring maxPrice filter for now since our backend uses budget_tier instead of numbers)

    return result;
  },

  getPopularWeekend: async (): Promise<Place[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/destinations/popular-weekend`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch popular weekend destinations:", error);
      return [];
    }
  },

  getPlaceById: async (id: string): Promise<Place | undefined> => {
    const response = await fetch(`${BASE_URL}api/destinations/${id}`)

    if (!response.ok) {
      return undefined
    }

    return await response.json()
  },

  deletePlace: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/destinations/${id}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to delete place", error);
      return false;
    }
  },

  editPlace: async (id: number, data: any): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/destinations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to edit place", error);
      return false;
    }
  },

  createPlace: async (data: any): Promise<Place | null> => {
    try {
      const response = await fetch(`${BASE_URL}api/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        console.error("Backend rejected custom place:", err);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to create custom place", error);
      return null;
    }
  }

};

export const groupsApi = {
  // 1. Fetch all travel groups
  getGroups: async (): Promise<Group[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch groups", error);
      return [];
    }
  },

  // 2. Fetch single group (passes logged-in user email to check if chat_link should be revealed)
  getGroupById: async (id: string | number, userEmail?: string): Promise<Group | undefined> => {
    try {
      const url = userEmail
        ? `${BASE_URL}api/groups/${id}?user_email=${encodeURIComponent(userEmail)}`
        : `${BASE_URL}api/groups/${id}`;
      const response = await fetch(url);
      if (!response.ok) return undefined;
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch group details", error);
      return undefined;
    }
  },

  // 3. Create a new group
  createGroup: async (data: Omit<Group, 'id' | 'current_members' | 'status' | 'created_at'>): Promise<Group | null> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to create group');
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to create group", error);
      throw error;
    }
  },

  // 4. Request to join a group
  requestToJoin: async (groupId: number, userName: string, userEmail: string): Promise<GroupRequest | null> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups/${groupId}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, user_name: userName, user_email: userEmail })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to send join request');
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to send join request", error);
      throw error;
    }
  },

  // 5. Organizer gets pending requests
  getRequests: async (groupId: number, organizerEmail: string): Promise<GroupRequest[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups/${groupId}/requests?organizer_email=${encodeURIComponent(organizerEmail)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch requests", error);
      return [];
    }
  },

  // 6. Organizer approves (✅) or rejects (❌) a request
  updateRequestStatus: async (requestId: number, newStatus: 'approved' | 'rejected', organizerEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups/requests/${requestId}/status?new_status=${newStatus}&organizer_email=${encodeURIComponent(organizerEmail)}`, {
        method: 'PUT'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to update request status", error);
      return false;
    }
  },

  // 7. Organizer deletes the group (enforcing 2-hour cooldown and ownership)
  deleteGroup: async (groupId: number, organizerEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/groups/${groupId}?organizer_email=${encodeURIComponent(organizerEmail)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete group');
      }
      return true;
    } catch (error) {
      console.error("Failed to delete group", error);
      throw error;
    }
  }
};

export const submissionsApi = {
  submitPlace: async (data: any): Promise<boolean> => {
    try {

      const response = await fetch(`${BASE_URL}api/destinations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        return true;
      } else {
        const err = await response.json();
        const msg = err.detail || 'Backend rejected the submission';
        console.error("Backend rejected the submission:", msg);
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Failed to connect to backend", error);
      throw error;
    }
  },
  getPendingSubmissions: async (): Promise<Place[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/admin/submissions`);
      if (!response.ok) {
        console.error("Failed to fetch pending submissions:", response.statusText);
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error("Network error fetching submissions:", error);
      return [];
    }
  },

  approveSubmission: async (
    id: number | string,
    data: {
      category?: string;
      duration: string;
      best_season: string;
      description: string;
      opening_hours: string;
      closing_hours: string;
      transport_options: string;
      nearby_facilities: string;
      image_url?: string;
      gallery_images?: string[];
    }
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/admin/submissions/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to approve submission:", error);
      return false;
    }
  },

  rejectSubmission: async (id: number | string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/admin/submissions/${id}/reject`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to reject submission:", error);
      return false;
    }
  },

  getUserSubmissions: async (userEmail: string): Promise<Place[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/users/submissions?user_email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user submissions:", error);
      return [];
    }
  },

  setPopularWeekend: async (destinationIds: number[]): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/admin/popular-weekend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_ids: destinationIds })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to update popular weekend destinations');
      }
      return true;
    } catch (error) {
      console.error("Failed to update popular weekend destinations:", error);
      throw error;
    }
  }
};



export const reviewApi = {

  //Fetch all reviews for a destination

  getReviews: async (destination_id: number): Promise<Review[]> => {

    try {
      const response = await fetch(`${BASE_URL}api/destinations/${destination_id}/reviews`);

      if (!response.ok) {
        console.error("Failed to fetch reviews:", response.statusText);
        return [];
      }

      return await response.json();
    }
    catch (error) {
      console.error("Network error fetching reviews:", error);
      return []
    }

  },






  createReview: async (data: { destination_id: number; rating: number; comment: string }): Promise<Review> => {
    try {
      const response = await fetch(`${BASE_URL}api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to submit review")
      }

      return await response.json();
    }
    catch (error) {
      console.error("Error creating review:", error);
      throw error;
    }
  }

};

export const notificationsApi = {
  getNotifications: async (userEmail: string, isAdmin: boolean = false): Promise<{ unread_count: number; notifications: AppNotification[] }> => {
    try {
      const response = await fetch(`${BASE_URL}api/notifications?user_email=${encodeURIComponent(userEmail)}&is_admin=${isAdmin}`);
      if (!response.ok) return { unread_count: 0, notifications: [] };
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return { unread_count: 0, notifications: [] };
    }
  },

  markAsRead: async (notificationId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  },

  markAllAsRead: async (userEmail: string, isAdmin: boolean = false): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/notifications/read-all?user_email=${encodeURIComponent(userEmail)}&is_admin=${isAdmin}`, {
        method: 'PUT'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return false;
    }
  },

  clearAll: async (userEmail: string, isAdmin: boolean = false): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/notifications/clear-all?user_email=${encodeURIComponent(userEmail)}&is_admin=${isAdmin}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      return false;
    }
  },

  deleteNotification: async (notificationId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to delete notification:", error);
      return false;
    }
  }
};

export const userApi = {
  getProfile: async (email: string): Promise<{ id: number; email: string; name?: string; avatar?: string; bio?: string; role: string; created_at?: string } | null> => {
    try {
      const response = await fetch(`${BASE_URL}api/users/profile?email=${encodeURIComponent(email)}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      return null;
    }
  },

  updateProfile: async (data: { email: string; name?: string; avatar?: string; bio?: string }): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to update user profile:", error);
      return false;
    }
  }
};

export const favoritesApi = {
  getFavorites: async (userEmail: string): Promise<Place[]> => {
    try {
      const response = await fetch(`${BASE_URL}api/favorites?user_email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
      return [];
    }
  },

  addFavorite: async (destinationId: number, userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_id: destinationId,
          user_email: userEmail
        })
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      return false;
    }
  },

  removeFavorite: async (destinationId: number, userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}api/favorites/${destinationId}?user_email=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      return false;
    }
  }
};


export const presenceApi = {
  // Heartbeat: tells the backend this tab is open; returns the live count
  ping: async (sessionId: string): Promise<number | null> => {
    try {
      const response = await fetch(`${BASE_URL}api/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.display;
    } catch {
      return null;
    }
  },
};
