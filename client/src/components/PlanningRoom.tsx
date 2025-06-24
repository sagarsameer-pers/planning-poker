import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { User, RoomState, POKER_VALUES } from '../types';

interface PlanningRoomProps {
  user: User;
  roomId: string;
  socket: Socket | null;
}

const PlanningRoom: React.FC<PlanningRoomProps> = ({ user, roomId, socket }) => {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [voteName, setVoteName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [pendingOtps, setPendingOtps] = useState<Array<{email: string, otp: string, created_at: string}>>([]);
  const [showOtps, setShowOtps] = useState(false);

  const loadRoomState = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load room');
      }

      setRoomState(data);
      
      // Update user votes based on current vote responses
      if (data.currentVote && data.voteResponses) {
        const votedUsers = new Set<string>(data.voteResponses.map((r: any) => r.user_id));
        setUserVotes(votedUsers);
      }
    } catch (err: any) {
      setError(err.message);
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

  const loadPendingOtps = async () => {
    if (!roomState?.room || roomState.room.admin_id !== user.id) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/pending-otps?adminId=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setPendingOtps(data.otps || []);
      }
    } catch (err) {
      console.error('Failed to load pending OTPs:', err);
    }
  };

  const toggleOtpsDisplay = () => {
    if (!showOtps && pendingOtps.length === 0) {
      loadPendingOtps();
    }
    setShowOtps(!showOtps);
  };

  if (!roomState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
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

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="card p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{roomState.room.name}</h1>
              <p className="text-sm text-gray-600">Room Code: <span className="font-mono font-bold text-lg">{roomId}</span></p>
              <p className="text-sm text-gray-600">Admin: {roomState.room.admin_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">
                {roomState.participants.length} participant{roomState.participants.length !== 1 ? 's' : ''}
              </p>
              {isAdmin && (
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
            </div>
          </div>
        </div>

        {/* Poker Table Layout */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-green-800 to-green-900 rounded-3xl p-8 shadow-2xl">
            {/* Table Surface */}
            <div className="relative bg-green-700 rounded-2xl p-6 shadow-inner">
              <div className="absolute inset-4 border-4 border-green-600 rounded-xl opacity-30"></div>
              
              {/* Center Info */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-2xl font-bold mb-2">🃏</div>
                  <div className="text-sm opacity-75">Planning Poker</div>
                  {currentVote && (
                    <div className="mt-2 bg-black bg-opacity-30 rounded-lg px-3 py-1">
                      <div className="text-xs opacity-75">Current Vote</div>
                      <div className="font-medium">{currentVote.name}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Participants around the table */}
              <div className="relative h-80">
                {roomState.participants.map((participant, index) => {
                  const totalParticipants = roomState.participants.length;
                  const angle = (index * 360) / totalParticipants - 90; // Start from top
                  const radius = 140;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;
                  
                  const hasVoted = userVotes.has(participant.id);
                  const isCurrentUser = participant.id === user.id;
                  const isAdmin = participant.id === roomState.room.admin_id;
                  
                  // Get vote result if revealed
                  const voteResult = isVoteRevealed 
                    ? roomState.voteResponses.find(r => r.user_id === participant.id)?.value 
                    : null;
                  
                  return (
                    <div
                      key={participant.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                      }}
                    >
                      {/* Player Card */}
                      <div className={`relative ${isCurrentUser ? 'scale-110' : ''}`}>
                        {/* Avatar */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                          isCurrentUser ? 'bg-blue-600 ring-4 ring-blue-300' :
                          isAdmin ? 'bg-purple-600' :
                          'bg-gray-600'
                        }`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        
                        {/* Name and Status */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-center">
                          <div className="bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                            <div className="font-medium">{participant.name}</div>
                            {isAdmin && <div className="text-yellow-300">👑 Admin</div>}
                            {isCurrentUser && <div className="text-blue-300">You</div>}
                          </div>
                        </div>
                        
                        {/* Vote Status Indicator */}
                        {currentVote && (
                          <div className="absolute -top-2 -right-2">
                            {isVoteRevealed ? (
                              // Show actual vote or "not voted"
                              <div className={`poker-card !w-8 !h-10 !text-xs ${
                                voteResult ? 'bg-white text-gray-900' : 'bg-red-100 text-red-600'
                              }`}>
                                {voteResult || 'X'}
                              </div>
                            ) : (
                              // Show voting status
                              <div className={`w-6 h-6 rounded-full border-2 border-white ${
                                hasVoted ? 'bg-green-500' : 'bg-gray-400'
                              }`}>
                                {hasVoted && (
                                  <svg className="w-3 h-3 text-white m-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Admin Controls */}
                        {isAdmin && participant.id !== user.id && participant.id !== roomState.room.admin_id && (
                          <button
                            onClick={() => handleSetAdmin(participant.id)}
                            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                          >
                            Make Admin
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin Controls & OTP Helper */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Controls</h2>
            
            {/* Admin OTP Helper */}
            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={toggleOtpsDisplay}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Help Users Join (Show OTPs)
                  </span>
                  <svg className={`w-4 h-4 transform transition-transform ${showOtps ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showOtps && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-3">
                      Recent OTP codes for users trying to join. Share these with users who haven't received their email.
                    </p>
                    
                    {pendingOtps.length > 0 ? (
                      <div className="space-y-2">
                        {pendingOtps.map((otp, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                            <span className="font-medium text-gray-700">{otp.email}</span>
                            <span className="font-mono text-lg font-bold text-blue-600">{otp.otp}</span>
                          </div>
                        ))}
                        <button
                          onClick={loadPendingOtps}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                        >
                          🔄 Refresh
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No pending OTPs found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voting Area */}
          <div className="lg:col-span-2">
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
                  {isAdmin ? 'Start a new vote to begin estimation' : 'Waiting for admin to start a vote'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningRoom; 