import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";

export default function Index() {
  const { loading, token, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.container} testID="boot-loading">
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  if (!token) return <Redirect href="/login" />;
  if (!user?.verified) return <Redirect href="/verify" />;
  return <Redirect href="/lobby" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
