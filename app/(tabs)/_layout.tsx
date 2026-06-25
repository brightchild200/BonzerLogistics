import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import {
  BellRing,
  CalendarClock,
  ClipboardCheck,

  LayoutDashboard,
  Menu,
  Plus,
  Rocket,
  Settings,
  UserCircle,
  Users,
  X,
} from 'lucide-react-native';
// ChevronLeft, ChevronRight,

import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { COLORS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { resolveSalespersonSession } from '@/lib/salesperson-session';
import { hasRole } from '@/lib/permissions';

// Sidebar dimensions
const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const MOBILE_BREAKPOINT = 768;

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
  roles: string[];
};

function titleCaseRole(role: string) {
  return role
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function WebTabItem({ icon: Icon, label, color, focused, muted, onPress, collapsed }: TabItemProps & { collapsed?: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.webTabItem,
        collapsed && styles.webTabItemCollapsed,
        focused && styles.webTabItemActive,
        muted && styles.webTabItemMuted,
        pressed && styles.webTabItemPressed,
      ]}
    >
      <View style={[styles.webTabIconWrap, focused && styles.webTabIconWrapActive]}>
        <Icon size={20} color={color} />
      </View>
      {!collapsed && (
        <Text
          style={[
            styles.webTabLabel,
            hovered && styles.webTabLabelHover,
            focused && styles.webTabLabelActive,
          ]}
        >
          {label}
        </Text>
      )}
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

// onToggle,
//  onToggle: () => void;
function WebSidebar({
  state,
  descriptors,
  navigation,
  viewerRoles,
  viewer,
  viewerRoleLabel,
  isMobile,

  collapsed,

  isMobileOpen,
  onMobileClose,
}: {
  state: any;
  descriptors: any;
  navigation: any;
  viewerRoles: string[];
  collapsed: boolean;

  isMobile: boolean;
  viewer: ViewerState;
  viewerRoleLabel: string;

  isMobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const visibleRoutes = state.routes.filter((route: any) => {
    if (route.name === 'leads') {
      return hasRole(viewerRoles, 'admin') || hasRole(viewerRoles, 'sales_manager');
    }
    return true;
  });

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobileOpen && (
        <Pressable style={styles.mobileOverlay} onPress={onMobileClose} />
      )}

      {/* Sidebar container */}
      <View
        style={[
          styles.webSidebar,
          { width: sidebarWidth },
          // isMobileOpen && styles.webSidebarMobileOpen,
          // isMobileOpen && {
          //   transform: [{ translateX: 0 }],
          // },

          isMobile &&
          (isMobileOpen
            ? styles.webSidebarMobileOpen
            : styles.webSidebarMobileClosed),
        ]}
      >
        <ScrollView
          style={styles.webSidebarScroll}
          contentContainerStyle={styles.webSidebarScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
            {/* Brand */}
            <View style={[styles.webBrand, collapsed && styles.webBrandCollapsed]}>
              <View style={styles.webBrandMark}>
                <LayoutDashboard size={collapsed ? 18 : 20} color={COLORS.primary} />
              </View>
              {!collapsed && (
                <View>
                  <Text style={styles.webBrandTitle}>Bonzer Logistics</Text>
                  <Text style={styles.webBrandSub}>Sales Dashboard</Text>
                </View>
              )}
            </View>

            {/* Toggle button for desktop */}
            {/* {!isMobileOpen && (
              <Pressable
                style={[styles.toggleButton, collapsed && styles.toggleButtonCollapsed]}
                onPress={onToggle}
              >
                {collapsed ? (
                  <ChevronRight size={16} color={COLORS.textMuted} />
                ) : (
                  <ChevronLeft size={16} color={COLORS.textMuted} />
                )}
              </Pressable>
            )} */}

            {/* Mobile close button */}
            {isMobileOpen && (
              <Pressable style={styles.mobileCloseButton} onPress={onMobileClose}>
                <X size={20} color={COLORS.textMuted} />
              </Pressable>
            )}

            <View style={[styles.webSectionLabelWrap, collapsed && styles.hidden]}>
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
                    collapsed={collapsed}
                    onPress={() => {
                      const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                      });

                      if (!focused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                      }
                      // Close mobile drawer on navigation
                      if (isMobileOpen) {
                        onMobileClose();
                      }
                    }}
                  />
                );
              })}
            </View>

            <View style={[styles.webSectionLabelWrap, collapsed && styles.hidden]}>
              <Text style={styles.webSectionLabel}>Extensions</Text>
            </View>

            <View style={styles.webNavList}>
              <WebTabItem
                icon={({ size, color }) => <Rocket size={size} color={color} />}
                label="Future Modules"
                color={COLORS.textLight}
                focused={false}
                muted
                collapsed={collapsed}
                onPress={() => { }}
              />
              <WebTabItem
                icon={({ size, color }) => <Settings size={size} color={color} />}
                label="Settings"
                color={COLORS.textMuted}
                focused={false}
                collapsed={collapsed}
                onPress={() => { }}
              />
            </View>
          </View>

          <View
            style={[
              styles.sidebarFooter,
              collapsed && styles.sidebarFooterCollapsed,
            ]}
          >
            <Pressable
              onPress={() => navigation.navigate('profile')}
              style={styles.webFooter}
            >
              <View style={styles.webAvatar}>
                <UserCircle size={18} color={COLORS.primary} />
              </View>

              {!collapsed && (
                <View style={styles.webFooterCopy}>
                  <Text style={styles.webFooterName}>
                    {viewerRoleLabel}
                  </Text>

                  <Text style={styles.webFooterSub}>
                    {viewer.fullName}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

        </ScrollView>
      </View>
    </>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [viewer, setViewer] = useState<ViewerState>({ fullName: 'Signed in user', roles: ['sales_person'] });
  // const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Responsive state
  const isMobile = windowWidth < MOBILE_BREAKPOINT;
  const isCompactSidebar = windowWidth < 1264;

  // Reset collapsed state when switching to mobile view
  // useEffect(() => {
  //   if (isMobile) {
  //     setSidebarCollapsed(false);
  //   }
  // }, [isMobile]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileDrawerOpen(false);
    }
  }, [isMobile]);

  // Persist collapsed state to localStorage (desktop only)
  // useEffect(() => {
  //   if (Platform.OS === 'web' && !isMobile) {
  //     const stored = localStorage.getItem('sidebar_collapsed');
  //     if (stored !== null) {
  //       setSidebarCollapsed(stored === 'true');
  //     }
  //   }
  // }, [isMobile]);

  // const handleToggleSidebar = useCallback(() => {
  //   const newState = !sidebarCollapsed;
  //   setSidebarCollapsed(newState);
  //   if (Platform.OS === 'web') {
  //     localStorage.setItem('sidebar_collapsed', String(newState));
  //   }
  // }, [sidebarCollapsed]);

  const handleOpenMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(true);
  }, []);

  const handleCloseMobileDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadViewer() {
      try {
        const { data } = await supabase.auth.getUser();
        const session = await resolveSalespersonSession(data.user?.email ?? null);
        if (cancelled) return;

        setViewer({
          fullName: session.appUser?.full_name || session.salesperson?.name || data.user?.email || 'Signed in user',
          roles: session.roles,
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

  const viewerRoleLabel = viewer.roles.map(titleCaseRole).join(', ');
  const showLeads = hasRole(viewer.roles, 'admin') || hasRole(viewer.roles, 'sales_manager');
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

  // Calculate sidebar width for content padding
  const sidebarWidth = isMobile
    ? 0
    : isCompactSidebar
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_EXPANDED_WIDTH;

      const rootStyle = [
        styles.webRoot,
        Platform.OS === 'web' &&    !isMobile &&{
          paddingLeft: sidebarWidth,
        },
      ];

  return (
    // <View style={Platform.OS === 'web' ? styles.webRoot : styles.nativeRoot}>
    
      <View
        style={
          Platform.OS === 'web'
            ? rootStyle
            : styles.nativeRoot
        }> 
      {/* Mobile menu button */}
      {Platform.OS === 'web' && isMobile && (
        <Pressable style={styles.mobileMenuButton} onPress={handleOpenMobileDrawer}>
          <Menu size={24} color={COLORS.text} />
        </Pressable>
      )}


      {/* viewerRoles={viewer.roles}
                  collapsed={sidebarCollapsed}
                  onToggle={handleToggleSidebar}
                  isMobileOpen={mobileDrawerOpen}
                  onMobileClose={handleCloseMobileDrawer} */}

      <Tabs
        tabBar={
          Platform.OS === 'web'
            ? (props) => (
              <WebSidebar
                {...props}
                viewerRoles={viewer.roles}
                viewer={viewer}
                isMobile={isMobile}
                viewerRoleLabel={viewerRoleLabel}
                collapsed={isCompactSidebar}
                isMobileOpen={mobileDrawerOpen}
                onMobileClose={handleCloseMobileDrawer}
              />
            )
            : undefined
        }
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

      {/* Content area padding for sidebar */}
      {/* {Platform.OS === 'web' && !isMobile && (
        <View style={[styles.contentPadding, { width: sidebarWidth }]} />
      )} */}

      {/* <FloatingEnquiryButton onPress={handleEnquiryPress} /> */}

      {/* {Platform.OS === 'web' ? (
        <Pressable
          style={[
            styles.webFooterDock,
            { left: sidebarWidth + 16 },
            isMobile && styles.webFooterDockMobile,
          ]}
          onPress={() => router.push('/profile')}
        >
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
      ) : null} */}
    </View>
  );
}

const styles = StyleSheet.create({
  
  webRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
    width: '100%',
  },

  // const rootStyle = [
  //   styles.webRoot,
  //   Platform.OS === 'web' && {
  //     paddingLeft: isMobile
  //       ? 0
  //       : isCompactSidebar
  //       ? SIDEBAR_COLLAPSED_WIDTH
  //       : SIDEBAR_EXPANDED_WIDTH,
  //   },
  // ];

  nativeRoot: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // contentPadding: {
  //   position: 'fixed',
  //   left: 0,
  //   top: 0,
  //   bottom: 0,
  //   transition: 'width 300ms ease-in-out',
  // },

  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  sidebarFooterCollapsed: {
    alignItems: 'center',
  },

  mobileMenuButton: {
    position: 'fixed',
    left: 16,
    top: 16,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  mobileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 50,
  },
  webSidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 16,
    transition: 'width 300ms ease-in-out',
    zIndex: 999,
  },

  webSidebarMobileClosed: {
    transform: [{ translateX: -300 }],
  },
  

  webSidebarMobileOpen: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    transform: [{ translateX: 0 }],
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
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
  webBrandCollapsed: {
    justifyContent: 'center',
    marginBottom: 20,
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
  toggleButton: {
    position: 'absolute',
    right: -12,
    top: 60,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  toggleButtonCollapsed: {
    right: -12,
    top: 50,
  },
  mobileCloseButton: {
    position: 'absolute',
    right: 16,
    top: 24,
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
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
    transition: 'all 200ms ease-in-out',
  },
  webTabItemCollapsed: {
    paddingHorizontal: 14,
    justifyContent: 'center',
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
    transition: 'opacity 200ms ease-in-out',
  },
  webTabLabelHover: {
    color: COLORS.primary,
  },
  webTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  hidden: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
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
    bottom: 18,
    width: 228,
    zIndex: 20,
    transition: 'left 300ms ease-in-out',
  },
  webFooterDockMobile: {
    left: 16,
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
