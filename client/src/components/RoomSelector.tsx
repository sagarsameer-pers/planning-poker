import React, { useState } from 'react';
import { User } from '../types';
import config from '../config';

interface RoomSelectorProps {
  onUserAndRoomReady: (user: User, roomId: string) => void;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ onUserAndRoomReady }) => {
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState('');

  const generateUserId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Name is required');
      return;
    }
    if (!roomId) {
      setError('Room ID is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user: User = {
        id: generateUserId(),
        name: userName.trim(),
        email: `${userName.trim().toLowerCase().replace(/\s+/g, '')}@temp.com`
      };

      console.log('Attempting to join room:', roomId);
      console.log('API URL:', `${config.API_BASE_URL}/api/rooms/${roomId}/join`);

      const response = await fetch(`${config.API_BASE_URL}/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          userName: user.name, 
          userEmail: user.email 
        }),
      });

      console.log('Join room response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Join room error response:', errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('Join room success:', data);

      onUserAndRoomReady(user, roomId);
    } catch (err: any) {
      console.error('Join room error:', err);
      setError(`Failed to join room: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      setError('Name is required');
      return;
    }
    if (!roomName) {
      setError('Room name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user: User = {
        id: generateUserId(),
        name: userName.trim(),
        email: `${userName.trim().toLowerCase().replace(/\s+/g, '')}@temp.com`
      };

      console.log('Attempting to create room:', roomName);
      console.log('API URL:', `${config.API_BASE_URL}/api/rooms`);
      console.log('Request payload:', { userId: user.id, roomName, userName: user.name, userEmail: user.email });

      const response = await fetch(`${config.API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id, 
          roomName, 
          userName: user.name, 
          userEmail: user.email 
        }),
      });

      console.log('Create room response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Create room error response:', errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('Create room success:', data);

      setCreatedRoomId(data.room.id);
      setShowRoomCreated(true);
    } catch (err: any) {
      console.error('Create room error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError(`Cannot connect to server. Please check if the backend is running at ${config.API_BASE_URL}`);
      } else {
        setError(`Failed to create room: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnterCreatedRoom = () => {
    const user: User = {
      id: generateUserId(),
      name: userName.trim(),
      email: `${userName.trim().toLowerCase().replace(/\s+/g, '')}@temp.com`
    };
    
    setShowRoomCreated(false);
    onUserAndRoomReady(user, createdRoomId);
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
                onClick={handleEnterCreatedRoom}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Planning Poker</h1>
            <p className="text-gray-600">Enter your name and choose your action</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* User Details Section */}
          <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="input-field"
                placeholder="Enter your name"
                required
              />
            </div>
          </div>

          {/* Room Action Selection */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
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
              type="button"
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

          {/* Room Action Forms */}
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
                disabled={loading || !userName.trim()}
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
                disabled={loading || !userName.trim()}
                className="btn-primary w-full"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                A 3-digit room code will be generated automatically
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default RoomSelector; 