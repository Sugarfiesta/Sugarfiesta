import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts } from "@/src/theme";

export default function TabsLayout() {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();

  if (!token) return <Redirect href="/login" />;
  if (!user?.verified) return <Redirect href="/verify" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.onSurfaceTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.textMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Entdecken", tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="video"
        options={{ title: "Video", tabBarIcon: ({ color, size }) => <Feather name="video" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: "Matches", tabBarIcon: ({ color, size }) => <Feather name="heart" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
