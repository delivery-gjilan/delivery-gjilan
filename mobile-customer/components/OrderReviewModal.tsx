import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useTranslations } from '@/hooks/useTranslations';

interface SubmitReviewPayload {
    rating: number;
    comment: string;
    quickFeedback: string[];
}

interface OrderReviewModalProps {
    visible: boolean;
    businessName?: string;
    onSubmit: (payload: SubmitReviewPayload) => void;
    onDismiss: () => void;
    submitting?: boolean;
}

interface QuickOption {
    id: string;
    label: string;
}

export default function OrderReviewModal({
    visible,
    businessName,
    onSubmit,
    onDismiss,
    submitting = false,
}: OrderReviewModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedQuick, setSelectedQuick] = useState<string[]>([]);
    const [showComment, setShowComment] = useState(false);
    const starScales = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

    const title = useMemo(() => {
        if (businessName) {
            return t.orders.review_modal.title_with_business.replace('{{business}}', businessName);
        }
        return t.orders.review_modal.title;
    }, [businessName, t.orders.review_modal.title_with_business, t.orders.review_modal.title]);

    const ratingLabel = useMemo(() => {
        const rm = t.orders.review_modal;
        switch (rating) {
            case 1: return rm.rating_1;
            case 2: return rm.rating_2;
            case 3: return rm.rating_3;
            case 4: return rm.rating_4;
            case 5: return rm.rating_5;
            default: return '';
        }
    }, [rating, t]);

    const quickOptions: QuickOption[] = useMemo(() => {
        const rm = t.orders.review_modal;
        if (rating === 0) return [];
        if (rating >= 4) {
            return [
                { id: 'great_food', label: rm.quick_great_food },
                { id: 'fast_delivery', label: rm.quick_fast_delivery },
                { id: 'fresh_tasty', label: rm.quick_fresh_tasty },
                { id: 'well_packed', label: rm.quick_well_packed },
                { id: 'great_value', label: rm.quick_great_value },
            ];
        }
        return [
            { id: 'cold_food', label: rm.quick_cold_food },
            { id: 'late_delivery', label: rm.quick_late_delivery },
            { id: 'missing_items', label: rm.quick_missing_items },
            { id: 'poor_packaging', label: rm.quick_poor_packaging },
            { id: 'not_as_expected', label: rm.quick_not_as_expected },
        ];
    }, [rating, t]);

    const handleStarPress = useCallback((star: number) => {
        const wasPositive = rating >= 4;
        const willBePositive = star >= 4;
        if (rating > 0 && wasPositive !== willBePositive) {
            setSelectedQuick([]);
        }
        setRating(star);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const scale = starScales[star - 1];
        Animated.sequence([
            Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }),
        ]).start();
    }, [rating, starScales]);

    const toggleQuick = (id: string) => {
        setSelectedQuick((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const submit = () => {
        if (!rating || submitting) return;
        onSubmit({
            rating,
            comment,
            quickFeedback: selectedQuick,
        });
    };

    const canSubmit = rating > 0 && !submitting;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
                    <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.handle} />

                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.sheetContent}
                        >

                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onDismiss} disabled={submitting} hitSlop={8}>
                            <Ionicons name="close" size={22} color={theme.colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: theme.colors.subtext }]}>
                        {t.orders.review_modal.subtitle_private}
                    </Text>

                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= rating;
                            return (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => handleStarPress(star)}
                                    disabled={submitting}
                                    style={styles.starTouch}
                                >
                                    <Animated.View style={{ transform: [{ scale: starScales[star - 1] }] }}>
                                        <Ionicons
                                            name={active ? 'star' : 'star-outline'}
                                            size={40}
                                            color={active ? '#FBBF24' : theme.colors.border}
                                        />
                                    </Animated.View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {rating > 0 && (
                        <Text style={[styles.ratingLabel, { color: rating >= 4 ? theme.colors.primary : '#F59E0B' }]}>
                            {ratingLabel}
                        </Text>
                    )}

                    {quickOptions.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickOptionsRow}
                        >
                            {quickOptions.map((option) => {
                                const selected = selectedQuick.includes(option.id);
                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        onPress={() => toggleQuick(option.id)}
                                        disabled={submitting}
                                        style={[
                                            styles.quickOption,
                                            {
                                                borderColor: selected ? theme.colors.primary : theme.colors.border,
                                                backgroundColor: selected ? `${theme.colors.primary}22` : 'transparent',
                                            },
                                        ]}
                                    >
                                        <Text style={{ color: selected ? theme.colors.primary : theme.colors.text, fontWeight: '600' }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {showComment ? (
                        <TextInput
                            placeholder={t.orders.review_modal.comment_placeholder}
                            placeholderTextColor={theme.colors.subtext}
                            value={comment}
                            onChangeText={setComment}
                            editable={!submitting}
                            multiline
                            numberOfLines={3}
                            maxLength={1000}
                            autoFocus
                            style={[
                                styles.commentInput,
                                {
                                    color: theme.colors.text,
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.background,
                                },
                            ]}
                        />
                    ) : (
                        <TouchableOpacity
                            onPress={() => setShowComment(true)}
                            disabled={submitting}
                            style={styles.addCommentButton}
                        >
                            <Ionicons name="chatbubble-outline" size={16} color={theme.colors.subtext} />
                            <Text style={[styles.addCommentText, { color: theme.colors.subtext }]}>
                                {t.orders.review_modal.add_comment}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={submit}
                        disabled={!canSubmit}
                        style={[
                            styles.submitButton,
                            {
                                backgroundColor: canSubmit ? theme.colors.primary : theme.colors.border,
                            },
                        ]}
                    >
                        <Text style={[styles.submitText, { color: canSubmit ? '#fff' : theme.colors.subtext }]}>
                            {submitting ? t.orders.review_modal.submitting : t.orders.review_modal.submit}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onDismiss} disabled={submitting} style={styles.notNowButton}>
                        <Text style={[styles.notNowText, { color: theme.colors.subtext }]}>
                            {t.orders.review_modal.not_now}
                        </Text>
                    </TouchableOpacity>

                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    keyboardAvoid: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 32,
        maxHeight: '85%',
    },
    sheetContent: {
        flexGrow: 1,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
        alignSelf: 'center',
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 4,
        marginBottom: 16,
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 4,
    },
    starTouch: {
        padding: 6,
    },
    ratingLabel: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 14,
    },
    quickOptionsRow: {
        gap: 8,
        paddingBottom: 14,
    },
    quickOption: {
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    addCommentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    addCommentText: {
        fontSize: 13,
        fontWeight: '500',
    },
    commentInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 72,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    submitButton: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        fontSize: 15,
        fontWeight: '700',
    },
    notNowButton: {
        marginTop: 12,
        alignItems: 'center',
        paddingVertical: 4,
    },
    notNowText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
