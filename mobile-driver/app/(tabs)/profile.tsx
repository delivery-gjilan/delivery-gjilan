import { View, Text, ScrollView, Pressable, Alert, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useTranslations } from "@/hooks/useTranslations";
import { useAuthStore } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "expo-router";
import { useMutation } from "@apollo/client/react";
import { SET_MY_PREFERRED_LANGUAGE_MUTATION, DELETE_MY_ACCOUNT_MUTATION } from "@/graphql/operations/auth";

const AVATAR_COLORS = ["#7C3AED", "#2563EB", "#DB2777", "#EA580C", "#16A34A", "#0891B2"];

function getAvatarColor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function SettingsRow({
    icon,
    iconBg,
    iconColor,
    label,
    sublabel,
    onPress,
    chevron = true,
    danger = false,
    right,
}: {
    icon: string;
    iconBg: string;
    iconColor: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    chevron?: boolean;
    danger?: boolean;
    right?: React.ReactNode;
}) {
    const theme = useTheme();
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                s.settingsRow,
                { backgroundColor: pressed ? theme.colors.border : "transparent" },
            ]}
        >
            <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon as any} size={18} color={iconColor} />
            </View>
            <View style={s.rowContent}>
                <Text style={[s.rowLabel, { color: danger ? "#ef4444" : theme.colors.text }]}>{label}</Text>
                {sublabel ? <Text style={[s.rowSub, { color: theme.colors.subtext }]}>{sublabel}</Text> : null}
            </View>
            {right ?? (chevron && !danger ? (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.subtext} />
            ) : null)}
        </Pressable>
    );
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

    const currentLangLabel = languageChoice === "en" ? "English" : "Shqip";

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

    const toggleLanguage = async () => {
        const newLang = languageChoice === "en" ? "al" : "en";
        setLanguageChoice(newLang);
        try {
            await setMyPreferredLanguage({
                variables: { language: newLang === "al" ? "AL" : "EN" },
            });
        } catch {
            setLanguageChoice(languageChoice);
        }
    };

    const isDark = theme.colors.background === "#111827" || theme.colors.card === "#1f2937";

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: theme.colors.background }]} edges={["top"]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 48 }}
            >
                {/* ── Avatar + name hero ── */}
                <View style={[s.hero, { backgroundColor: theme.colors.card }]}>
                    <View style={[s.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <Text style={[s.heroName, { color: theme.colors.text }]}>{displayName}</Text>
                    <Text style={[s.heroEmail, { color: theme.colors.subtext }]}>{user?.email ?? "—"}</Text>
                    <View style={[s.driverBadge, { backgroundColor: theme.colors.primary + "20" }]}>
                        <Text style={[s.driverBadgeText, { color: theme.colors.primary }]}>
                            {t.profile.driver_badge}
                        </Text>
                    </View>
                </View>

                {/* ── Settings sections ── */}
                <View style={s.sections}>

                    {/* Preferences */}
                    <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[s.sectionTitle, { color: theme.colors.subtext }]}>
                            {t.profile.language_section}
                        </Text>
                        <SettingsRow
                            icon="language-outline"
                            iconBg={isDark ? "#1e3a5f" : "#eff6ff"}
                            iconColor="#3b82f6"
                            label={t.profile.language_toggle}
                            sublabel={currentLangLabel}
                            onPress={toggleLanguage}
                        />
                    </View>

                    {/* Legal */}
                    <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[s.sectionTitle, { color: theme.colors.subtext }]}>Legal</Text>
                        <SettingsRow
                            icon="shield-checkmark-outline"
                            iconBg={isDark ? "#1a2e1a" : "#f0fdf4"}
                            iconColor="#22c55e"
                            label="Privacy Policy"
                            onPress={() => Linking.openURL("https://zippdelivery.com/privacy")}
                        />
                        <View style={[s.rowDivider, { backgroundColor: theme.colors.border }]} />
                        <SettingsRow
                            icon="document-text-outline"
                            iconBg={isDark ? "#1a2338" : "#eff6ff"}
                            iconColor="#3b82f6"
                            label="Terms of Service"
                            onPress={() => Linking.openURL("https://zippdelivery.com/terms")}
                        />
                    </View>

                    {/* Account actions */}
                    <View style={[s.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <Text style={[s.sectionTitle, { color: theme.colors.subtext }]}>Account</Text>
                        <SettingsRow
                            icon="log-out-outline"
                            iconBg="rgba(239,68,68,0.12)"
                            iconColor="#ef4444"
                            label={t.profile.logout}
                            onPress={handleLogout}
                            danger
                            chevron={false}
                        />
                        <View style={[s.rowDivider, { backgroundColor: theme.colors.border }]} />
                        <SettingsRow
                            icon="trash-outline"
                            iconBg="rgba(239,68,68,0.08)"
                            iconColor="#ef4444"
                            label="Delete Account"
                            onPress={handleDeleteAccount}
                            danger
                            chevron={false}
                        />
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },

    /* Hero */
    hero: {
        alignItems: "center",
        paddingTop: 36,
        paddingBottom: 28,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
    heroName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, marginBottom: 4 },
    heroEmail: { fontSize: 13, marginBottom: 12 },
    driverBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
    driverBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },

    /* Sections */
    sections: { paddingHorizontal: 16, gap: 12 },
    section: {
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 6,
    },

    /* Row */
    settingsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    rowIcon: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    rowContent: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "600" },
    rowSub: { fontSize: 12, marginTop: 1 },
    rowDivider: { height: 1, marginHorizontal: 16 },
});
