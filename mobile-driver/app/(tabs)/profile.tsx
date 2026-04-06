import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import { useMutation } from "@apollo/client/react";
import { SET_MY_PREFERRED_LANGUAGE_MUTATION, DELETE_MY_ACCOUNT_MUTATION } from "@/graphql/operations/auth";
import { ProfileRow } from "@/components/ProfileRow";

const AVATAR_COLORS = ["#7C3AED", "#2563EB", "#DB2777", "#EA580C", "#16A34A", "#0891B2"];

function getAvatarColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Profile() {
    const theme = useTheme();
    const router = useRouter();
    const { logout } = useAuth();
    const { t, languageChoice, setLanguageChoice } = useTranslations();
    const user = useAuthStore((s) => s.user);

    const [setMyPreferredLanguage] = useMutation(SET_MY_PREFERRED_LANGUAGE_MUTATION);
    const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT_MUTATION);

    const firstName = user?.firstName ?? "";
    const lastName = user?.lastName ?? "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const displayName = fullName || user?.email?.split("@")[0] || "Driver";
    const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
        : (user?.email?.substring(0, 2) ?? "DR").toUpperCase();
    const avatarColor = getAvatarColor(user?.id ?? user?.email ?? "driver");

    const handleLogout = () => {
        Alert.alert(t.profile.logout_title, t.profile.logout_confirm, [
            { text: t.common.cancel, style: "cancel" },
            {
                text: t.profile.logout,
                style: "destructive",
                onPress: async () => {
                    try {
                        await logout();
                        router.replace("/login");
                    } catch {
                        Alert.alert(t.common.error, t.profile.logout_error);
                    }
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This will permanently erase your account and all data. This cannot be undone.",
            [
                { text: t.common.cancel, style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteMyAccount();
                            await logout();
                            router.replace("/login");
                        } catch {
                            Alert.alert(t.common.error, "Failed to delete account.");
                        }
                    },
                },
            ],
        );
    };

    const handleLanguageChoice = async (choice: "en" | "al") => {
        setLanguageChoice(choice);
        try {
            await setMyPreferredLanguage({
                variables: { language: choice === "al" ? "AL" : "EN" },
            });
        } catch {
            setLanguageChoice(languageChoice);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={["top"]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

                {/* ── Avatar + Name Header ── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, alignItems: "center" }}>
                    <View style={{
                        width: 84,
                        height: 84,
                        borderRadius: 42,
                        backgroundColor: avatarColor,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                        shadowColor: avatarColor,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 10,
                        elevation: 8,
                    }}>
                        <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>
                            {initials}
                        </Text>
                    </View>
                    <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" }}>
                        {displayName}
                    </Text>
                    {user?.email ? (
                        <Text style={{ color: theme.colors.subtext, fontSize: 13, marginTop: 3, textAlign: "center" }}>
                            {user.email}
                        </Text>
                    ) : null}
                    <View style={{ marginTop: 10, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: theme.colors.primary + "20" }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: theme.colors.primary }}>
                            {t.profile.driver_badge}
                        </Text>
                    </View>
                </View>

                {/* ── Account Section ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }}>
                    <ProfileRow title="Contact Support" icon="chatbubble-outline" onPress={() => Linking.openURL("mailto:support@zippdelivery.com")} />
                    <ProfileRow title="Privacy Policy" icon="shield-checkmark-outline" onPress={() => Linking.openURL("https://zippdelivery.com/privacy")} />
                    <ProfileRow title="Terms of Service" icon="document-text-outline" onPress={() => Linking.openURL("https://zippdelivery.com/terms")} showDivider={false} />
                </View>

                {/* ── Language ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
                    <Text style={{ color: theme.colors.subtext, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginLeft: 4 }}>
                        Language / Gjuha
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {(["en", "al"] as const).map((lang) => {
                            const active = languageChoice === lang;
                            return (
                                <TouchableOpacity
                                    key={lang}
                                    onPress={() => handleLanguageChoice(lang)}
                                    activeOpacity={0.75}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        borderRadius: 14,
                                        borderWidth: 1.5,
                                        borderColor: active ? theme.colors.primary : theme.colors.border,
                                        backgroundColor: theme.colors.card,
                                        alignItems: "center",
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        gap: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 18 }}>{lang === "en" ? "🇬🇧" : "🇦🇱"}</Text>
                                    <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "500" }}>
                                        {lang === "en" ? "English" : "Shqip"}
                                    </Text>
                                    {active && <Ionicons name="checkmark" size={16} color="#16A34A" />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Danger Zone ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#EF444430", backgroundColor: theme.colors.card }}>
                    <ProfileRow
                        title="Delete Account"
                        icon="trash-outline"
                        onPress={handleDeleteAccount}
                        showDivider={false}
                    />
                </View>

                {/* ── Logout ── */}
                <View style={{ marginHorizontal: 16, marginBottom: 36 }}>
                    <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.8}
                        style={{
                            paddingVertical: 15,
                            borderRadius: 14,
                            alignItems: "center",
                            backgroundColor: "#EF444415",
                            borderWidth: 1.5,
                            borderColor: "#EF444440",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 8,
                        }}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                        <Text style={{ color: "#EF4444", fontSize: 15, fontWeight: "700" }}>
                            {t.profile.logout}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
