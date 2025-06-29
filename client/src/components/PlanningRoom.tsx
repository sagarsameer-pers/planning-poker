import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { User, RoomState, POKER_VALUES } from '../types';
import config from '../config';

interface PlanningRoomProps {
  user: User;
  roomId: string;
  socket: Socket | null;
  onLeaveRoom: () => void;
}

const PlanningRoom: React.FC<PlanningRoomProps> = ({ user, roomId, socket, onLeaveRoom }) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [voteName, setVoteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [backendReady, setBackendReady] = useState(false);

  const loadRoomState = useCallback(async () => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/rooms/${roomId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load room');
      }

      setRoomState(data);
      setBackendReady(true); // Backend is responding
      
      // Update user votes based on current vote responses
      if (data.currentVote && data.voteResponses) {
        const votedUsers = new Set<string>(data.voteResponses.map((r: any) => r.user_id));
        setUserVotes(votedUsers);
      }
    } catch (err: any) {
      setError(err.message);
      setBackendReady(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomState();
  }, [loadRoomState]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', { userId: user.id, roomId });

    socket.on('room-joined', () => {
      loadRoomState();
    });

    socket.on('user-joined', () => {
      loadRoomState();
    });

    socket.on('user-left', () => {
      loadRoomState();
    });

    socket.on('admin-changed', () => {
      loadRoomState();
    });

    socket.on('vote-started', () => {
      setSelectedValue('');
      setUserVotes(new Set());
      loadRoomState();
    });

    socket.on('vote-submitted', ({ userId }: { userId: string }) => {
      setUserVotes(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(userId);
        return newSet;
      });
    });

    socket.on('votes-revealed', () => {
      loadRoomState();
    });

    socket.on('error', (message: string) => {
      setError(message);
    });

    return () => {
      socket.off('room-joined');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('admin-changed');
      socket.off('vote-started');
      socket.off('vote-submitted');
      socket.off('votes-revealed');
      socket.off('error');
    };
  }, [socket, user.id, roomId, loadRoomState]);

  const handleSetAdmin = (newAdminId: string) => {
    if (!socket || !roomState) return;
    socket.emit('set-admin', { roomId, newAdminId, requesterId: user.id });
  };

  const handleStartVote = () => {
    if (!socket || !voteName.trim()) return;
    setLoading(true);
    socket.emit('start-vote', { roomId, voteName: voteName.trim(), adminId: user.id });
    setVoteName('');
    setLoading(false);
  };

  const handleSubmitVote = (value: string) => {
    if (!socket || !roomState?.currentVote) return;
    setSelectedValue(value);
    socket.emit('submit-vote', { voteId: roomState.currentVote.id, userId: user.id, value });
    setUserVotes(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(user.id);
      return newSet;
    });
  };

  const handleRevealVotes = () => {
    if (!socket || !roomState?.currentVote) return;
    socket.emit('reveal-votes', { voteId: roomState.currentVote.id, adminId: user.id, roomId });
  };

  const handleLeaveRoom = () => {
    if (isAdmin && roomState && roomState.participants.length > 1) {
      setShowLeaveConfirm(true);
    } else {
      onLeaveRoom();
    }
  };

  const confirmLeave = () => {
    setShowLeaveConfirm(false);
    onLeaveRoom();
  };

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting to Room</h3>
          <p className="text-gray-600 mb-4">Please wait while we establish connection...</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              <strong>🕐 First time connecting?</strong><br />
              Free hosting may take up to 2 minutes to spin up from sleep mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = roomState.room.admin_id === user.id;
  const hasVoted = userVotes.has(user.id);
  const currentVote = roomState.currentVote;
  const isVoteRevealed = Boolean(currentVote?.revealed_at);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Leave Room Button */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">🃏 Planning Poker</h1>
          <button
            onClick={handleLeaveRoom}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Leave Room
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 mt-4 rounded-md">
          {error}
          <button 
            onClick={() => setError('')} 
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Leave Room Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">End Session for All?</h3>
              <p className="text-sm text-gray-500 mb-6">
                As the admin, leaving will end this session for all attendees. Do you want to continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeave}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  End Session for All?
                </h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                As the admin, leaving this room will end the session for all attendees. Do you want to continue?
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Stay in Room
              </button>
              <button
                onClick={confirmLeave}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        {/* Poker Table Layout */}
        <div className="mb-8">
          <div className="text-center mb-6">
            {/* Smaller Table (50% reduction) */}
            <div className="inline-block bg-gradient-to-br from-green-800 to-green-900 rounded-2xl p-4 shadow-xl">
              <div className="bg-green-700 rounded-xl w-48 h-32 flex items-center justify-center shadow-inner">
                <div className="text-center text-white">
                  <div className="text-lg font-bold mb-1">🃏</div>
                  <div className="text-xs opacity-75">Planning Poker</div>
                  {currentVote && (
                    <div className="mt-1 bg-black bg-opacity-30 rounded px-2 py-0.5 text-xs">
                      {currentVote.name.length > 12 ? currentVote.name.slice(0, 12) + '...' : currentVote.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Participants as Playing Cards positioned outside table */}
          <div className="flex flex-wrap justify-center gap-4">
            {roomState.participants.map((participant, index) => {
              const isCurrentUser = participant.id === user.id;
              const isParticipantAdmin = participant.id === roomState.room.admin_id;
              const hasVoted = userVotes.has(participant.id);
              
              // Get vote result if revealed
              const voteResult = isVoteRevealed 
                ? roomState.voteResponses.find(r => r.user_id === participant.id)?.value 
                : null;
              
              // Get initials (first letter of first and last name)
              const nameParts = participant.name.split(' ');
              const initials = nameParts.length > 1 
                ? nameParts[0].charAt(0).toUpperCase() + nameParts[nameParts.length - 1].charAt(0).toUpperCase()
                : participant.name.charAt(0).toUpperCase();
              
              return (
                <div key={participant.id} className={`relative ${isCurrentUser ? 'scale-110' : ''}`}>
                  {/* Playing Card Design - Shrunk by 80% */}
                  <div className={`w-4 h-6 bg-white rounded border shadow-sm flex flex-col items-center justify-center relative transition-transform hover:scale-105 ${
                    isCurrentUser ? 'border-blue-500 ring-1 ring-blue-300' :
                    isParticipantAdmin ? 'border-purple-500' :
                    'border-gray-300'
                  }`}>
                    {/* Initials */}
                    <div className={`text-xs font-bold ${
                      isCurrentUser ? 'text-blue-600' :
                      isParticipantAdmin ? 'text-purple-600' :
                      'text-gray-700'
                    }`}>
                      {initials}
                    </div>
                    
                    {/* Admin Crown */}
                    {isParticipantAdmin && (
                      <div className="absolute -top-1 -right-1 text-yellow-500 text-xs">
                        👑
                      </div>
                    )}
                    
                    {/* "You" indicator */}
                    {isCurrentUser && (
                      <div className="absolute -top-1 -left-1 text-blue-500 text-xs font-bold">
                        U
                      </div>
                    )}
                    
                    {/* Vote Status Indicator */}
                    {currentVote && (
                      <div className="absolute -top-1 -right-1">
                        {isVoteRevealed ? (
                          // Show actual vote or "not voted"
                          <div className={`w-3 h-4 rounded text-xs flex items-center justify-center font-bold ${
                            voteResult ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>
                            {voteResult || 'X'}
                          </div>
                        ) : (
                          // Show voting status
                          <div className={`w-3 h-3 rounded-full border border-white ${
                            hasVoted ? 'bg-green-500' : 'bg-gray-400'
                          }`}>
                            {hasVoted && (
                              <svg className="w-2 h-2 text-white m-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Name below card */}
                  <div className="text-center mt-1">
                    <div className="text-xs font-medium text-gray-700 truncate max-w-16">
                      {participant.name}
                    </div>
                    {/* Admin indicator below name */}
                    {isParticipantAdmin && (
                      <div className="text-xs text-purple-600 font-semibold">
                        Admin
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Admin Controls */}
                  {isAdmin && participant.id !== user.id && participant.id !== roomState.room.admin_id && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                      <button
                        onClick={() => handleSetAdmin(participant.id)}
                        className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 shadow-sm transition-colors whitespace-nowrap"
                      >
                        👑 Admin
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Details - Moved below poker table */}
        <div className="card p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{roomState.room.name}</h1>
              <p className="text-sm text-gray-600">Room Code: <span className="font-mono font-bold text-lg">{roomId}</span></p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600">Admin: {roomState.room.admin_name}</p>
                {isAdmin && (
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                    👑 You are admin
                  </span>
                )}
              </div>
              {isAdmin && (
                <p className="text-xs text-purple-600 mt-2">
                  💡 Click "👑 Make Admin" below any participant to transfer admin rights
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">
                {roomState.participants.length} participant{roomState.participants.length !== 1 ? 's' : ''}
              </p>
              
              {!backendReady && (
                <div className="text-xs text-amber-600 mb-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border border-amber-600 border-t-transparent"></div>
                    <span className="font-medium">Connecting to server...</span>
                  </div>
                  <p className="mt-1 text-xs">
                    🕐 Free hosting may take up to 2 minutes to spin up. Please wait while we establish connection.
                  </p>
                </div>
              )}
              
              {backendReady && isAdmin && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voteName}
                      onChange={(e) => setVoteName(e.target.value)}
                      placeholder="Vote name (e.g., Story #123)"
                      className="input-field text-sm"
                      disabled={Boolean(currentVote && !isVoteRevealed)}
                    />
                    <button
                      onClick={handleStartVote}
                      disabled={!voteName.trim() || loading || Boolean(currentVote && !isVoteRevealed)}
                      className="btn-primary text-sm whitespace-nowrap"
                    >
                      Start Vote
                    </button>
                  </div>
                  {currentVote && !isVoteRevealed && (
                    <button
                      onClick={handleRevealVotes}
                      className="btn-success text-sm w-full"
                    >
                      Reveal Votes
                    </button>
                  )}
                </div>
              )}
              
              {backendReady && !isAdmin && (
                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  Only the room admin can start votes
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Voting Area */}
        <div className="w-full">
          {currentVote ? (
            <div className="card p-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{currentVote.name}</h2>
                <p className="text-gray-600">
                  {isVoteRevealed ? 'Votes revealed!' : hasVoted ? 'Waiting for others...' : 'Select your estimate'}
                </p>
              </div>

              {!isVoteRevealed && (
                <div className="grid grid-cols-6 gap-3 mb-6">
                  {POKER_VALUES.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleSubmitVote(value)}
                      className={`poker-card ${selectedValue === value ? 'selected' : ''}`}
                      disabled={hasVoted}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}

              {isVoteRevealed && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {roomState.participants.map((participant) => {
                      const voteResponse = roomState.voteResponses.find(r => r.user_id === participant.id);
                      return (
                        <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{participant.name}</span>
                          <div className={`poker-card !w-12 !h-16 !text-base ${
                            voteResponse ? 'bg-white text-gray-900' : 'bg-red-100 text-red-600'
                          }`}>
                            {voteResponse ? voteResponse.value : 'Not Voted'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No active voting session</h3>
              <p className="text-gray-600">
                {isAdmin ? 'Use the form above to start a new vote' : 'Waiting for admin to start a vote'}
              </p>
            </div>
          )}
        </div>

        {/* Hosting Message at Bottom */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Running on free hosting:</strong> If the system seems slow to respond, it may be spinning up from sleep mode. This can take 1-2 minutes initially.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningRoom; 