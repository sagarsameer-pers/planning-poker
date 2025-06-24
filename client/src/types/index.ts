export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Room {
  id: string;
  name: string;
  creator_id: string;
  admin_id: string;
  admin_name?: string;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  name: string;
  started_by: string;
  started_at: string;
  revealed_at?: string;
  is_active: boolean;
  started_by_name?: string;
}

export interface VoteResponse {
  vote_id: string;
  user_id: string;
  value: string;
  submitted_at: string;
  user_name: string;
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  joined_at: string;
}

export interface RoomState {
  room: Room;
  participants: Participant[];
  currentVote: Vote | null;
  voteResponses: VoteResponse[];
}

export const POKER_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '∞', '?']; 