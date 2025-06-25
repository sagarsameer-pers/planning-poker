import React, { useState } from 'react';
import { User } from './types';
import { useSocket } from './hooks/useSocket';
import RoomSelector from './components/RoomSelector';
import PlanningRoom from './components/PlanningRoom';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const socket = useSocket();

  const handleUserAndRoomReady = (authenticatedUser: User, roomId: string) => {
    setUser(authenticatedUser);
    setCurrentRoom(roomId);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setUser(null); // Reset user as well to go back to the main screen
  };

  if (!user || !currentRoom) {
    return <RoomSelector onUserAndRoomReady={handleUserAndRoomReady} />;
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