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

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleRoomSelected = (roomId: string) => {
    setCurrentRoom(roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  if (!user) {
    return <AuthModal onAuth={handleAuth} />;
  }

  if (!currentRoom) {
    return <RoomSelector user={user} onRoomSelected={handleRoomSelected} />;
  }

  return (
    <div className="relative min-h-screen">
      <PlanningRoom 
        user={user} 
        roomId={currentRoom} 
        socket={socket}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
};

export default App; 