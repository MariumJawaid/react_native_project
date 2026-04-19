import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface Notification {
  id: string;
  type: 'fall' | 'zone' | 'health' | 'info' | 'consult_accepted';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

const NOTIFICATIONS_KEY = 'app_notifications';

export const notificationService = {
  // Get all notifications
  async getAllNotifications(): Promise<Notification[]> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  },

  // Add a new notification
  async addNotification(
    type: 'fall' | 'zone' | 'health' | 'info' | 'consult_accepted',
    title: string,
    message: string,
    dataPayload?: any
  ): Promise<Notification> {
    try {
      const notifications = await this.getAllNotifications();
      
      const newNotification: Notification = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        timestamp: Date.now(),
        read: false,
        data: dataPayload,
      };

      notifications.unshift(newNotification); // Add to beginning
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      
      // Show alert for important notifications
      if (type === 'fall') {
        Alert.alert(
          '🚨 FALL DETECTED',
          message,
          [{ text: 'OK', onPress: () => {} }],
          { cancelable: false }
        );
      }
      
      return newNotification;
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getAllNotifications();
      const updatedNotifications = notifications.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifications = await this.getAllNotifications();
      const filteredNotifications = notifications.filter(notif => notif.id !== notificationId);
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filteredNotifications));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
    } catch (error) {
      console.error('Error clearing notifications:', error);
      throw error;
    }
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getAllNotifications();
      return notifications.filter(notif => !notif.read).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },
};
