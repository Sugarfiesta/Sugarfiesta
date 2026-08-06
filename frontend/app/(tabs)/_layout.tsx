import { Tabs, Redirect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { colors, fonts, radius } from "@/src/theme";

type IconName = "compass" | "video" | "heart" | "user";

function CandyTabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.frame, focused && styles.frameActive]}>
      <Feather name={name} size={19} color={focused ? colors.brandPrimary : colors.onSurfaceTertiary} />
    </View>
  );
}

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
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.textMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{ title: "Entdecken", tabBarIcon: ({ focused }) => <CandyTabIcon name="compass" focused={focused} /> }}
      />
      <Tabs.Screen
        name="video"
        options={{ title: "Video", tabBarIcon: ({ focused }) => <CandyTabIcon name="video" focused={focused} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: "Matches", tabBarIcon: ({ focused }) => <CandyTabIcon name="heart" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profil", tabBarIcon: ({ focused }) => <CandyTabIcon name="user" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  frameActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brandPrimary,
  },
});
