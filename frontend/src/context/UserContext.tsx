/**
 * User & Role Context
 *
 * Manages the active user profile (Maker vs Checker) and role-based tab permissions
 * across SettleIQ. Provides simulated authentication state, profile switching,
 * and permission checking for institutional Maker-Checker workflows.
 */

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

/**
 * Provider component wrapping the application to supply active user identity,
 * role permissions, and profile-switching capabilities.
 */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial route always loads the SettleIQ Landing / Profile Selection page
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);

  /**
   * Switch the active demo user profile and persist the choice in localStorage.
   */
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

  /**
   * Determine if the currently logged-in user has permission to access a specific navigation tab.
   */
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

/**
 * Custom hook to consume the active user profile and authorization helpers.
 */
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

