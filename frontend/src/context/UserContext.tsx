import React, { createContext, useContext, useState } from 'react';
import type { DemoUser, NavTab } from '../types';

import { DEMO_USERS } from '../constants/users';
export { DEMO_USERS };

interface UserContextType {
  currentUser: DemoUser | null;
  selectProfile: (userId: 'analyst' | 'manager') => void;
  logout: () => void;
  allUsers: DemoUser[];
  hasPermission: (tab: NavTab) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Persist selected demo profile in localStorage across page refreshes
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => {
    const saved = localStorage.getItem('settleiq_demo_user');
    if (saved && DEMO_USERS[saved]) {
      return DEMO_USERS[saved];
    }
    return null;
  });

  const selectProfile = (userId: 'analyst' | 'manager') => {
    if (DEMO_USERS[userId]) {
      setCurrentUser(DEMO_USERS[userId]);
      localStorage.setItem('settleiq_demo_user', userId);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('settleiq_demo_user');
  };

  const hasPermission = (tab: NavTab): boolean => {
    if (!currentUser) return false;
    return currentUser.allowedTabs.includes(tab);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        selectProfile,
        logout,
        allUsers: Object.values(DEMO_USERS),
        hasPermission
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
