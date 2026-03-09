import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Share, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation } from '@apollo/client/react';

import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';
import { GET_MY_REFERRAL_STATS, GENERATE_REFERRAL_CODE } from '@/graphql/operations/referrals';
import { toast } from '@/store/toastStore';

export default function InviteFriendsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { t } = useTranslations();
    const [copiedCode, setCopiedCode] = useState(false);

    const { data, loading, refetch } = useQuery(GET_MY_REFERRAL_STATS, {
        fetchPolicy: 'cache-and-network',
    });

    const [generateCode, { loading: generating }] = useMutation(GENERATE_REFERRAL_CODE, {
        onCompleted: () => {
            refetch();
        },
        onError: (error) => {
            toast.error(t.common.error, error.message);
        },
    });

    const stats = data?.myReferralStats;
    const referralCode = stats?.referralCode || '';
    const referralLink = `https://delivery-gjilan.com/signup?ref=${referralCode}`;

    const handleCopyCode = async () => {
        if (!referralCode) return;
        await Clipboard.setStringAsync(referralCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(referralLink);
        toast.success(t.invite.copied, t.invite.link_copied);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: t.invite.share_message.replace('{{code}}', referralCode).replace('{{link}}', referralLink),
                title: t.invite.share_title,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: theme.colors.border }}>
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text className="text-xl font-bold" style={{ color: theme.colors.text }}>
                    {t.invite.title}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
                {/* Reward Info Banner */}
                <View
                    className="p-6 rounded-3xl mb-6"
                    style={{
                        backgroundColor: theme.colors.primary + '15',
                        borderWidth: 1,
                        borderColor: theme.colors.primary + '30',
                    }}
                >
                    <Ionicons name="gift" size={48} color={theme.colors.primary} style={{ alignSelf: 'center', marginBottom: 12 }} />
                    <Text className="text-lg font-bold text-center mb-2" style={{ color: theme.colors.text }}>
                        {t.invite.earn_title}
                    </Text>
                    <Text className="text-sm text-center" style={{ color: theme.colors.subtext }}>
                        {t.invite.earn_description}
                    </Text>
                </View>

                {/* Referral Code Card */}
                <View className="p-6 rounded-3xl mb-6" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text className="text-sm font-semibold mb-3" style={{ color: theme.colors.subtext }}>
                        {t.invite.your_code}
                    </Text>
                    <View className="flex-row items-center justify-between p-4 rounded-2xl mb-4" style={{ backgroundColor: theme.colors.background }}>
                        <Text className="text-2xl font-bold tracking-wider" style={{ color: theme.colors.text }}>
                            {referralCode || '----'}
                        </Text>
                        <TouchableOpacity onPress={handleCopyCode} className="p-2">
                            <Ionicons name={copiedCode ? 'checkmark-circle' : 'copy-outline'} size={24} color={copiedCode ? theme.colors.income : theme.colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-3">
                        <TouchableOpacity
                            onPress={handleShare}
                            className="flex-row items-center justify-center p-4 rounded-2xl"
                            style={{ backgroundColor: theme.colors.primary }}
                        >
                            <Ionicons name="share-social" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text className="text-base font-semibold text-white">{t.invite.share_link}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCopyLink}
                            className="flex-row items-center justify-center p-4 rounded-2xl"
                            style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                        >
                            <Ionicons name="link" size={20} color={theme.colors.text} style={{ marginRight: 8 }} />
                            <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                                {t.invite.copy_link}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Grid */}
                <View className="flex-row gap-3 mb-6">
                    <View className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                        <Ionicons name="people" size={24} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                        <Text className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
                            {stats?.totalReferrals || 0}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                            {t.invite.total_invites}
                        </Text>
                    </View>

                    <View className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.income} style={{ marginBottom: 8 }} />
                        <Text className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
                            {stats?.completedReferrals || 0}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                            {t.invite.completed}
                        </Text>
                    </View>

                    <View className="flex-1 p-4 rounded-2xl" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                        <Ionicons name="wallet" size={24} color={theme.colors.income} style={{ marginBottom: 8 }} />
                        <Text className="text-2xl font-bold mb-1" style={{ color: theme.colors.text }}>
                            €{stats?.totalRewardsEarned?.toFixed(2) || '0.00'}
                        </Text>
                        <Text className="text-xs" style={{ color: theme.colors.subtext }}>
                            {t.invite.earned}
                        </Text>
                    </View>
                </View>

                {/* Referrals List */}
                {stats?.referrals && stats.referrals.length > 0 && (
                    <View>
                        <Text className="text-lg font-bold mb-3" style={{ color: theme.colors.text }}>
                            {t.invite.your_referrals}
                        </Text>
                        {stats.referrals.map((referral: any) => (
                            <View
                                key={referral.id}
                                className="flex-row items-center justify-between p-4 rounded-2xl mb-3"
                                style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}
                            >
                                <View className="flex-1">
                                    <Text className="text-base font-semibold mb-1" style={{ color: theme.colors.text }}>
                                        {referral.referredUser ? `${referral.referredUser.firstName} ${referral.referredUser.lastName}` : t.invite.pending_signup}
                                    </Text>
                                    <Text className="text-sm" style={{ color: theme.colors.subtext }}>
                                        {new Date(referral.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <View
                                        className="px-3 py-1 rounded-full mb-1"
                                        style={{
                                            backgroundColor:
                                                referral.status === 'COMPLETED'
                                                    ? theme.colors.income + '20'
                                                    : referral.status === 'PENDING'
                                                    ? theme.colors.primary + '20'
                                                    : theme.colors.border,
                                        }}
                                    >
                                        <Text
                                            className="text-xs font-semibold"
                                            style={{
                                                color:
                                                    referral.status === 'COMPLETED'
                                                        ? theme.colors.income
                                                        : referral.status === 'PENDING'
                                                        ? theme.colors.primary
                                                        : theme.colors.subtext,
                                            }}
                                        >
                                            {referral.status}
                                        </Text>
                                    </View>
                                    {referral.rewardGiven && referral.rewardAmount && (
                                        <Text className="text-sm font-bold" style={{ color: theme.colors.income }}>
                                            +€{Number(referral.rewardAmount).toFixed(2)}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* How It Works */}
                <View className="mt-6 p-6 rounded-3xl" style={{ backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text className="text-lg font-bold mb-4" style={{ color: theme.colors.text }}>
                        {t.invite.how_it_works}
                    </Text>
                    <View className="gap-4">
                        <View className="flex-row">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                style={{ backgroundColor: theme.colors.primary + '20' }}
                            >
                                <Text className="font-bold" style={{ color: theme.colors.primary }}>
                                    1
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-base" style={{ color: theme.colors.text }}>
                                    {t.invite.step_1}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                style={{ backgroundColor: theme.colors.primary + '20' }}
                            >
                                <Text className="font-bold" style={{ color: theme.colors.primary }}>
                                    2
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-base" style={{ color: theme.colors.text }}>
                                    {t.invite.step_2}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row">
                            <View
                                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                                style={{ backgroundColor: theme.colors.primary + '20' }}
                            >
                                <Text className="font-bold" style={{ color: theme.colors.primary }}>
                                    3
                                </Text>
                            </View>
                            <View className="flex-1">
                                <Text className="text-base" style={{ color: theme.colors.text }}>
                                    {t.invite.step_3}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
