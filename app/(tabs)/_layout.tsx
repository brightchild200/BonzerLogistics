import { Tabs } from 'expo-router';
import { LayoutDashboard, ClipboardCheck, Users, CalendarClock, BellRing, UserCircle } from 'lucide-react-native';
import { COLORS } from '@/lib/types';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textMuted, tabBarStyle: { backgroundColor: COLORS.white, borderTopColor: COLORS.border, borderTopWidth: 1, height: Platform.OS === 'web' ? 60 : 80, paddingBottom: Platform.OS === 'web' ? 8 : 20, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ size, color }) => <LayoutDashboard size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ size, color }) => <ClipboardCheck size={size} color={color} /> }} />
      <Tabs.Screen name="leads" options={{ title: 'Team', tabBarIcon: ({ size, color }) => <Users size={size} color={color} /> }} />
      <Tabs.Screen name="followups" options={{ title: 'Follow-ups', tabBarIcon: ({ size, color }) => <CalendarClock size={size} color={color} /> }} />
      <Tabs.Screen name="visits" options={{ title: 'Alerts', tabBarIcon: ({ size, color }) => <BellRing size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ size, color }) => <UserCircle size={size} color={color} /> }} />
    </Tabs>
  );
}
