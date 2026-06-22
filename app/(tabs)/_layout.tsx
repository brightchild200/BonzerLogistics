import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  BellRing,
  CalendarClock,
  ClipboardCheck,
  LayoutDashboard,
  Plus,
  Rocket,
  Settings,
  UserCircle,
  Users,
} from 'lucide-react-native';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { resolveSalespersonSession } from '@/lib/salesperson-session';

type TabIconProps = {
  size: number;
  color: string;
};

type TabItemProps = {
  icon: React.ComponentType<TabIconProps>;
  label: string;
  color: string;
  focused: boolean;
  muted?: boolean;
  onPress: () => void;
};

type ViewerState = {
  fullName: string;
  role: string;
};

function titleCaseRole(role: string) {
  return role
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function WebTabItem({ icon: Icon, label, color, focused, muted, onPress }: TabItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.webTabItem,
        focused && styles.webTabItemActive,
        muted && styles.webTabItemMuted,
        pressed && styles.webTabItemPressed,
      ]}
    >
      <View style={[styles.webTabIconWrap, focused && styles.webTabIconWrapActive]}>
        <Icon size={20} color={color} />
      </View>
      <Text
        style={[
          styles.webTabLabel,
          hovered && styles.webTabLabelHover,
          focused && styles.webTabLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FloatingEnquiryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={onPress}>
      <Plus size={22} color={COLORS.white} />
      {Platform.OS === 'web' ? <Text style={styles.fabLabel}>Enquiry</Text> : null}
    </Pressable>
  );
}

function WebSidebar({ state, descriptors, navigation, viewerRole }: any) {
  const visibleRoutes = state.routes.filter((route: any) => !(route.name === 'leads' && viewerRole !== 'admin'));

  return (
    <View style={styles.webSidebar}>
      <ScrollView
        style={styles.webSidebarScroll}
        contentContainerStyle={styles.webSidebarScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <View style={styles.webBrand}>
            <View style={styles.webBrandMark}>
              <LayoutDashboard size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.webBrandTitle}>Logistics Pro</Text>
              <Text style={styles.webBrandSub}>Attendance Workspace</Text>
            </View>
          </View>

          <View style={styles.webSectionLabelWrap}>
            <Text style={styles.webSectionLabel}>Workspace</Text>
          </View>

          <View style={styles.webNavList}>
            {visibleRoutes.map((route: any) => {
              const routeIndex = state.routes.findIndex((item: any) => item.key === route.key);
              const { options } = descriptors[route.key];
              const focused = state.index === routeIndex;
              const color = focused ? COLORS.primary : COLORS.textMuted;
              const icon = options.tabBarIcon;
              const label = options.title ?? route.name;

              return (
                <WebTabItem
                  key={route.key}
                  icon={({ size, color: iconColor }) => icon?.({ size, color: iconColor }) ?? null}
                  label={label}
                  color={color}
                  focused={focused}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });

                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(route.name);
                    }
                  }}
                />
              );
            })}
          </View>

          <View style={styles.webSectionLabelWrap}>
            <Text style={styles.webSectionLabel}>Extensions</Text>
          </View>

          <View style={styles.webNavList}>
            <WebTabItem
              icon={({ size, color }) => <Rocket size={size} color={color} />}
              label="Future Modules"
              color={COLORS.textLight}
              focused={false}
              muted
              onPress={() => {}}
            />
            <WebTabItem
              icon={({ size, color }) => <Settings size={size} color={color} />}
              label="Settings"
              color={COLORS.textMuted}
              focused={false}
              onPress={() => {}}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const [viewer, setViewer] = useState<ViewerState>({ fullName: 'Signed in user', role: 'sales_person' });

  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      try {
        const { data } = await supabase.auth.getUser();
        const session = await resolveSalespersonSession(data.user?.email ?? null);
        if (cancelled) return;

        setViewer({
          fullName: session.appUser?.full_name || session.salesperson?.name || data.user?.email || 'Signed in user',
          role: session.appUser?.role || 'sales_person',
        });
      } catch (error) {
        if (cancelled) return;
        console.warn('[tabs] failed to resolve viewer session:', error);
      }
    }

    loadViewer();
    return () => {
      cancelled = true;
    };
  }, []);

  const viewerRoleLabel = titleCaseRole(viewer.role);
  const showLeads = viewer.role === 'admin';
  const handleEnquiryPress = () => {
    // Always redirect to the enquiry page when user taps the enquiry action
    router.push({ pathname: '/(tabs)/enquiry' } as any);
  };
  const tabBarStyle =
    Platform.OS === 'web'
      ? { display: 'none' as const }
      : {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        };

  return (
    <View style={Platform.OS === 'web' ? styles.webRoot : styles.nativeRoot}>
      <Tabs
        tabBar={Platform.OS === 'web' ? (props) => <WebSidebar {...props} viewerRole={viewer.role} /> : undefined}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarStyle,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Dashboard', tabBarIcon: ({ size, color }) => <LayoutDashboard size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="attendance"
          options={{ title: 'Attendance', tabBarIcon: ({ size, color }) => <ClipboardCheck size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="leads"
          options={{
            href: showLeads ? undefined : null,
            title: 'Team',
            tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="followups"
          options={{ title: 'Follow-ups', tabBarIcon: ({ size, color }) => <CalendarClock size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="visits"
          options={{ title: 'Visit', tabBarIcon: ({ size, color }) => <BellRing size={size} color={color} /> }}
        />
        <Tabs.Screen
          name="enquiries"
          options={{ title: 'Enquiries', tabBarIcon: ({ size, color }) => <Rocket size={size} color={color} /> }}
        />

      </Tabs>

      {/* <FloatingEnquiryButton onPress={handleEnquiryPress} /> */}

      {Platform.OS === 'web' ? (
        <Pressable style={styles.webFooterDock} onPress={() => router.push('/profile')}>
          <View style={styles.webFooter}>
            <View style={styles.webAvatar}>
              <UserCircle size={18} color={COLORS.primary} />
            </View>
            <View style={styles.webFooterCopy}>
              <Text style={styles.webFooterName}>{viewerRoleLabel}</Text>
              <Text style={styles.webFooterSub}>{viewer.fullName}</Text>
            </View>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: '100%',
    paddingLeft: 260,
  },
  nativeRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  webSidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    width: 260,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  webSidebarScroll: {
    flex: 1,
  },
  webSidebarScrollContent: {
    paddingBottom: 24,
  },
  webBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },
  webBrandMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webBrandTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  webBrandSub: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  webSectionLabelWrap: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  webSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  webNavList: {
    gap: 4,
  },
  webTabItem: {
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webTabItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  webTabItemMuted: {
    opacity: 0.72,
  },
  webTabItemPressed: {
    opacity: 0.92,
  },
  webTabIconWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webTabIconWrapActive: {
    opacity: 1,
  },
  webTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  webTabLabelHover: {
    color: COLORS.primary,
  },
  webTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: Platform.OS === 'web' ? 28 : 94,
    height: 56,
    minWidth: 56,
    paddingHorizontal: Platform.OS === 'web' ? 18 : 0,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    zIndex: 30,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  fabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  webFooterDock: {
    position: 'fixed',
    left: 16,
    bottom: 18,
    width: 228,
    zIndex: 20,
  },
  webFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  webAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFooterCopy: {
    flex: 1,
    minWidth: 0,
  },
  webFooterName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  webFooterSub: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
