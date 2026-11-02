import type { Group } from '../types';

export const MOCK_GROUPS: Group[] = [
  {
    id: 'g1',
    place_id: 'p9', // Skandagiri
    title: 'Skandagiri Sunrise Trek - Weekend Getaway',
    description: 'Planning to do the night trek this Saturday. Looking for a few more folks to join so we can split the travel cost. We will start from Indiranagar around 11 PM.',
    trip_date: '2023-11-18T23:00:00Z',
    meeting_area: 'Indiranagar Metro Station',
    estimated_cost: 600,
    max_members: 6,
    current_members: 3,
    organizer_name: 'Rahul K.',
    status: 'open',
    safety_notes: 'Must carry your own head torch and good grip shoes. Not suitable if you have knee problems.',
    created_at: '2023-11-10T10:00:00Z'
  },
  {
    id: 'g2',
    place_id: 'p8', // Rasta Cafe
    title: 'Late Night Drive to Rasta',
    description: 'Just a chill late-night drive to Rasta Cafe for some food and good conversations. I have a car, can fit 3 more.',
    trip_date: '2023-11-17T22:30:00Z',
    meeting_area: 'Koramangala Sony World Signal',
    estimated_cost: 500,
    max_members: 4,
    current_members: 4,
    organizer_name: 'Sneha M.',
    status: 'full',
    safety_notes: 'Highway driving at night. Please coordinate pick up points beforehand.',
    created_at: '2023-11-12T14:00:00Z'
  },
  {
    id: 'g3',
    place_id: 'p3', // Hesaraghatta
    title: 'Sunday Morning Cycling & Photography',
    description: 'Cycling from Malleshwaram to Hesaraghatta Lake. We will take some photos and head back before it gets too hot.',
    trip_date: '2023-11-19T05:30:00Z',
    meeting_area: 'Malleshwaram 18th Cross',
    estimated_cost: 200,
    max_members: 10,
    current_members: 5,
    organizer_name: 'Karthik S.',
    status: 'open',
    safety_notes: 'Helmet is mandatory. Bring your own cycle repair kit and water.',
    created_at: '2023-11-11T09:00:00Z'
  }
];
