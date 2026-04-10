import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

let currentUser: User | null = null;

const auth = getAuth();

// Initialize auth listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

export const authService = {
  /**
   * Get current authenticated user
   */
  getCurrentUser: (): User | null => {
    return currentUser;
  },

  /**
   * Get current user ID
   */
  getCurrentUserId: (): string => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    return currentUser.uid;
  },

  /**
   * Get current user email
   */
  getCurrentUserEmail: (): string => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }
    return currentUser.email || 'unknown@example.com';
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return currentUser !== null;
  },

  /**
   * Wait for auth to be initialized
   */
  waitForAuth: (): Promise<User | null> => {
    return new Promise((resolve) => {
      if (currentUser) {
        resolve(currentUser);
      } else {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      }
    });
  }
};
