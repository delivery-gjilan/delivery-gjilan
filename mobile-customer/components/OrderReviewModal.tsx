import React, { useMemo, useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    onSkipOrder: () => void;
    onHideBusiness: () => void;
    onHideAll: () => void;
    submitting?: boolean;
}

const QUICK_OPTIONS = [
    'The food was perfect',
    'Fast delivery',
    'Fresh and tasty',
    'Very well packed',
    'Great value',
];

export default function OrderReviewModal({
    visible,
    businessName,
    onSubmit,
    onSkipOrder,
    onHideBusiness,
    onHideAll,
    submitting = false,
}: OrderReviewModalProps) {
    const theme = useTheme();
    const { t } = useTranslations();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [selectedQuick, setSelectedQuick] = useState<string[]>([]);

    const title = useMemo(() => {
        if (businessName) {
            return t.orders.review_modal.title_with_business.replace('{{business}}', businessName);
        }
        return t.orders.review_modal.title;
    }, [businessName, t.orders.review_modal.title_with_business, t.orders.review_modal.title]);

    const toggleQuick = (value: string) => {
        setSelectedQuick((prev) =>
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
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
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkipOrder}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: theme.colors.card }]}> 
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onSkipOrder} disabled={submitting}>
                            <Ionicons name="close" size={22} color={theme.colors.subtext} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: theme.colors.subtext }]}>{t.orders.review_modal.subtitle_private}</Text>

                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= rating;
                            return (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                    disabled={submitting}
                                    style={styles.starTouch}
                                >
                                    <Ionicons
                                        name={active ? 'star' : 'star-outline'}
                                        size={30}
                                        color={active ? '#FBBF24' : theme.colors.border}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.quickOptionsRow}
                    >
                        {QUICK_OPTIONS.map((option) => {
                            const selected = selectedQuick.includes(option);
                            return (
                                <TouchableOpacity
                                    key={option}
                                    onPress={() => toggleQuick(option)}
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
                                        {option}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TextInput
                        placeholder={t.orders.review_modal.comment_placeholder}
                        placeholderTextColor={theme.colors.subtext}
                        value={comment}
                        onChangeText={setComment}
                        editable={!submitting}
                        multiline
                        numberOfLines={4}
                        maxLength={1000}
                        style={[
                            styles.commentInput,
                            {
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                backgroundColor: theme.colors.background,
                            },
                        ]}
                    />

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
                        <Text style={styles.submitText}>
                            {submitting ? t.orders.review_modal.submitting : t.orders.review_modal.submit}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footerActions}>
                        <TouchableOpacity onPress={onSkipOrder} disabled={submitting}>
                            <Text style={[styles.footerActionText, { color: theme.colors.subtext }]}>{t.orders.review_modal.not_now}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onHideBusiness} disabled={submitting}>
                            <Text style={[styles.footerActionText, { color: theme.colors.subtext }]}>{t.orders.review_modal.hide_for_business}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onHideAll} disabled={submitting}>
                            <Text style={[styles.footerActionText, { color: theme.colors.subtext }]}>{t.orders.review_modal.hide_all}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 28,
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
        marginTop: 6,
        marginBottom: 12,
    },
    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 12,
    },
    starTouch: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    quickOptionsRow: {
        gap: 8,
        paddingBottom: 10,
    },
    quickOption: {
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },
    commentInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 88,
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
        color: '#000',
        fontSize: 15,
        fontWeight: '700',
    },
    footerActions: {
        marginTop: 14,
        gap: 10,
        alignItems: 'center',
    },
    footerActionText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
