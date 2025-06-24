import React, { useState } from 'react';
import { User } from './types';
import { useSocket } from './hooks/useSocket';
import AuthModal from './components/AuthModal';
import RoomSelector from './components/RoomSelector';
import PlanningRoom from './components/PlanningRoom';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const socket = useSocket();

  const handleAuthenticated = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleRoomSelected = (roomId: string) => {
    setCurrentRoom(roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  if (!user) {
    return <AuthModal onAuthenticated={handleAuthenticated} />;
  }

  if (!currentRoom) {
    return <RoomSelector user={user} onRoomSelected={handleRoomSelected} />;
  }

  return (
    <div className="relative">
      <PlanningRoom 
        user={user} 
        roomId={currentRoom} 
        socket={socket}
      />
      
      {/* Leave Room Button */}
      <button
        onClick={handleLeaveRoom}
        className="fixed top-4 right-4 btn-secondary text-sm z-10"
      >
        Leave Room
      </button>
    </div>
  );
};

export default App; 