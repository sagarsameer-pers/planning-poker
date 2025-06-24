import React, { useState } from 'react';
import { User } from '../types';

interface RoomSelectorProps {
  user: User;
  onRoomSelected: (roomId: string) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ user, onRoomSelected }) => {
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState('');

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) {
      setError('Room ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      onRoomSelected(roomId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName) {
      setError('Room name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, roomName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setCreatedRoomId(data.room.id);
      setShowRoomCreated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Room Created Success Modal */}
      {showRoomCreated && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Room Created Successfully!</h3>
              <p className="text-sm text-gray-600 mb-4">Share this room code with your team:</p>
              
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-4">
                <div className="text-4xl font-bold text-blue-600 mb-2 font-mono tracking-wider">
                  {createdRoomId}
                </div>
                <p className="text-sm text-blue-600 font-medium">Room Code</p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>📋 Share this code</strong> with your team members so they can join the planning session.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(createdRoomId)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => {
                  setShowRoomCreated(false);
                  onRoomSelected(createdRoomId);
                }}
                className="flex-1 btn-primary"
              >
                Enter Room
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="card max-w-md w-full mx-4 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {user.name}!</h2>
          <p className="text-gray-600">Join an existing room or create a new one</p>
        </div>

        <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'join'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join Room
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Room
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {mode === 'join' ? (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                Room Code
              </label>
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="input-field text-center text-2xl tracking-wider font-mono"
                placeholder="000"
                maxLength={3}
                pattern="[0-9]{3}"
                required
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enter 3-digit room code
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="input-field"
                placeholder="Enter room name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating...' : 'Create Room'}
            </button>
            <p className="text-xs text-gray-500 text-center">
              A 3-digit room code will be generated automatically
            </p>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Logged in as {user.email}
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default RoomSelector; 