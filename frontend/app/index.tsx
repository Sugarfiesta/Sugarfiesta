import { Redirect } from "expo-router";
import { View, StyleSheet } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { colors } from "@/src/theme";
import { CandyBackground } from "@/src/components/CandyBackground";
import { LollipopLoader } from "@/src/components/LollipopLoader";

export default function Index() {
  const { loading, token, user } = useAuth();

  if (loading) {
    return (
      <View style={styles.container} testID="boot-loading">
        <CandyBackground />
        <LollipopLoader size={64} />
      </View>
    );
  }

  if (!token) return <Redirect href="/login" />;
  if (!user?.verified) return <Redirect href="/verify" />;
  return <Redirect href="/(tabs)/discover" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
