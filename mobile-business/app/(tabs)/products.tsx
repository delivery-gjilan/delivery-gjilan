import { useMemo, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
    ScrollView,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation } from '@apollo/client/react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
    GET_BUSINESS_PRODUCTS,
    CREATE_PRODUCT,
    UPDATE_PRODUCT,
    DELETE_PRODUCT,
} from '@/graphql/products';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import { hasBusinessPermission } from '@/lib/rbac';
import { UserPermission } from '@/gql/graphql';
import { useTranslation } from '@/hooks/useTranslation';

interface Product {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    isOnSale: boolean;
    saleDiscountPercentage?: number | null;
    isAvailable: boolean;
    categoryId: string;
}

interface Category {
    id: string;
    name: string;
    isActive: boolean;
}

export default function ProductsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();
    const canManageProducts = hasBusinessPermission(user, UserPermission.ManageProducts);

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formIsAvailable, setFormIsAvailable] = useState(true);
    const [formIsOnSale, setFormIsOnSale] = useState(false);
    const [formSalePrice, setFormSalePrice] = useState('');
    const [formCategoryId, setFormCategoryId] = useState<string | null>(null);

    const { data, loading, refetch } = useQuery(GET_BUSINESS_PRODUCTS, {
        variables: { businessId: user?.businessId || '' },
        skip: !user?.businessId,
    });

    const [createProduct] = useMutation(CREATE_PRODUCT, { refetchQueries: ['GetBusinessProducts'] });
    const [updateProduct] = useMutation(UPDATE_PRODUCT, { refetchQueries: ['GetBusinessProducts'] });
    const [deleteProduct] = useMutation(DELETE_PRODUCT, { refetchQueries: ['GetBusinessProducts'] });

    if (!canManageProducts) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
                <Ionicons name="lock-closed" size={42} color="#ef4444" />
                <Text className="text-text text-xl font-bold mt-4">{t('products.access_restricted', 'Access Restricted')}</Text>
                <Text className="text-subtext text-center mt-2">
                    {t('products.no_permission', 'You do not have permission to manage products.')}
                </Text>
                <TouchableOpacity className="bg-primary px-4 py-3 rounded-xl mt-5" onPress={() => router.replace('/(tabs)')}>
                    <Text className="text-white font-semibold">{t('products.back_to_orders', 'Back to Orders')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const products: Product[] = (data?.products || [])
        .map((card: any) => {
            const product = card?.product;
            return {
                id: product?.id ?? card?.id,
                name: product?.name ?? card?.name,
                description: product?.description ?? null,
                imageUrl: product?.imageUrl ?? card?.imageUrl ?? null,
                price: Number(product?.price ?? card?.basePrice ?? 0),
                isOnSale: product?.isOnSale ?? false,
                saleDiscountPercentage: product?.saleDiscountPercentage ?? null,
                isAvailable: product?.isAvailable ?? true,
                categoryId: product?.categoryId ?? (card?.variants?.[0]?.categoryId ?? ''),
            };
        })
        .filter((product: Product) => Boolean(product.categoryId));

    const categories: Category[] = data?.productCategories || [];

    const filteredProducts = useMemo(
        () => products.filter((product) => !selectedCategory || product.categoryId === selectedCategory),
        [products, selectedCategory],
    );

    const resetForm = () => {
        setFormName('');
        setFormDescription('');
        setFormImageUrl('');
        setFormPrice('');
        setFormIsAvailable(true);
        setFormIsOnSale(false);
        setFormSalePrice('');
        setFormCategoryId(categories[0]?.id ?? null);
    };

    const openAddForm = () => {
        setEditingProduct(null);
        resetForm();
        setShowFormModal(true);
    };

    const openEditForm = (product: Product) => {
        setEditingProduct(product);
        setFormName(product.name);
        setFormDescription(product.description ?? '');
        setFormImageUrl(product.imageUrl ?? '');
        setFormPrice(String(product.price));
        setFormIsAvailable(product.isAvailable);
        setFormIsOnSale(product.isOnSale);
        setFormSalePrice(product.saleDiscountPercentage != null ? String(product.saleDiscountPercentage) : '');
        setFormCategoryId(product.categoryId);
        setShowFormModal(true);
    };

    const handleToggleAvailability = async (product: Product) => {
        try {
            await updateProduct({ variables: { id: product.id, input: { isAvailable: !product.isAvailable } } });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
        }
    };

    const handleDeleteProduct = (productId: string, productName: string) => {
        Alert.alert(t('common.delete', 'Delete'), `Are you sure you want to delete "${productName}"?`, [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('common.delete', 'Delete'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteProduct({ variables: { id: productId } });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (error: unknown) {
                        Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed');
                    }
                },
            },
        ]);
    };

    const handleSubmitProduct = async () => {
        if (!user?.businessId) {
            Alert.alert(t('common.error', 'Error'), 'Missing business context.');
            return;
        }
        if (!formName.trim()) {
            Alert.alert(t('common.error', 'Error'), 'Product name is required.');
            return;
        }
        if (!formCategoryId) {
            Alert.alert(t('common.error', 'Error'), 'Please select a category.');
            return;
        }

        const price = Number(formPrice);
        if (!Number.isFinite(price) || price <= 0) {
            Alert.alert(t('common.error', 'Error'), 'Price must be greater than 0.');
            return;
        }

        const saleDiscount = formIsOnSale ? Number(formSalePrice) : undefined;
        if (formIsOnSale && (!Number.isFinite(saleDiscount) || saleDiscount! <= 0 || saleDiscount! > 100)) {
            Alert.alert(t('common.error', 'Error'), 'Sale discount must be between 1 and 100%.');
            return;
        }

        setSubmitting(true);
        try {
            if (editingProduct) {
                await updateProduct({
                    variables: {
                        id: editingProduct.id,
                        input: {
                            name: formName.trim(),
                            description: formDescription.trim() || undefined,
                            imageUrl: formImageUrl.trim() || undefined,
                            price,
                            categoryId: formCategoryId,
                            isAvailable: formIsAvailable,
                            isOnSale: formIsOnSale,
                            saleDiscountPercentage: formIsOnSale ? saleDiscount : null,
                        },
                    },
                });
            } else {
                await createProduct({
                    variables: {
                        input: {
                            businessId: user.businessId,
                            categoryId: formCategoryId,
                            name: formName.trim(),
                            description: formDescription.trim() || undefined,
                            imageUrl: formImageUrl.trim() || undefined,
                            price,
                            isAvailable: formIsAvailable,
                            isOnSale: formIsOnSale,
                            saleDiscountPercentage: formIsOnSale ? saleDiscount : undefined,
                        },
                    },
                });
            }

            await refetch();
            setShowFormModal(false);
            setEditingProduct(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: unknown) {
            Alert.alert(t('common.error', 'Error'), error instanceof Error ? error.message : 'Failed to save product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    };

    const renderProductCard = ({ item: product }: { item: Product }) => {
        const displayPrice = product.isOnSale && product.saleDiscountPercentage
            ? product.price * (1 - product.saleDiscountPercentage / 100)
            : product.price;
        const categoryName = categories.find((category) => category.id === product.categoryId)?.name;

        return (
            <View className="rounded-2xl p-4 mb-3 bg-card border border-border">
                <View className="flex-row items-start">
                    <View className="w-20 h-20 rounded-xl bg-background overflow-hidden mr-3 border border-border">
                        {product.imageUrl ? (
                            <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <Ionicons name="image-outline" size={30} color="#94A3B8" />
                            </View>
                        )}
                    </View>

                    <View className="flex-1">
                        <View className="flex-row items-start justify-between mb-1.5">
                            <Text className="text-text font-semibold text-base flex-1 pr-2" numberOfLines={2}>
                                {product.name}
                            </Text>
                            <Switch
                                value={product.isAvailable}
                                onValueChange={() => handleToggleAvailability(product)}
                                trackColor={{ false: '#64748B', true: '#7C3AED' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View className="flex-row items-center gap-2 mb-2">
                            {categoryName ? (
                                <View className="px-2.5 py-1 rounded-full bg-primary/15">
                                    <Text className="text-primary text-xs font-semibold">{categoryName}</Text>
                                </View>
                            ) : null}
                            {product.isOnSale ? (
                                <View className="px-2.5 py-1 rounded-full bg-success/15">
                                    <Text className="text-success text-xs font-semibold">{t('products.on_sale', 'On sale')}</Text>
                                </View>
                            ) : null}
                            <View className={`px-2.5 py-1 rounded-full ${product.isAvailable ? 'bg-success/15' : 'bg-danger/15'}`}>
                                <Text className={`text-xs font-semibold ${product.isAvailable ? 'text-success' : 'text-danger'}`}>
                                    {product.isAvailable ? t('products.available', 'Available') : t('products.unavailable', 'Unavailable')}
                                </Text>
                            </View>
                        </View>

                        {product.description && (
                            <Text className="text-subtext text-xs mb-2" numberOfLines={2}>
                                {product.description}
                            </Text>
                        )}

                        <View className="flex-row items-end justify-between">
                            <View className="flex-row items-center">
                                <Text className="text-success font-bold text-lg">€{displayPrice.toFixed(2)}</Text>
                                {product.isOnSale && (
                                    <Text className="text-subtext line-through ml-2 text-sm">€{product.price.toFixed(2)}</Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                <View className="flex-row gap-2 mt-3 pt-3 border-t border-border">
                    <TouchableOpacity className="flex-1 bg-primary/15 py-2.5 rounded-xl flex-row items-center justify-center" onPress={() => openEditForm(product)}>
                        <Ionicons name="pencil" size={16} color="#7C3AED" />
                        <Text className="text-primary font-semibold ml-1 text-sm">{t('products.edit', 'Edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 bg-danger/15 py-2.5 rounded-xl flex-row items-center justify-center" onPress={() => handleDeleteProduct(product.id, product.name)}>
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text className="text-danger font-semibold ml-1 text-sm">{t('products.delete', 'Delete')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="px-4 py-3">
                <View className="flex-row items-center gap-3">
                    <View className="flex-1">
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={[{ id: null, name: t('products.all', 'All') }, ...categories]}
                            keyExtractor={(item) => item.id || 'all'}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    className={`px-4 py-2 rounded-full mr-2 border ${selectedCategory === item.id ? 'bg-primary border-primary' : 'bg-card border-border'}`}
                                    onPress={() => setSelectedCategory(item.id)}
                                >
                                    <Text className={`font-semibold text-sm ${selectedCategory === item.id ? 'text-white' : 'text-subtext'}`}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>

                    <TouchableOpacity
                        className="bg-primary w-10 h-10 rounded-xl items-center justify-center"
                        onPress={openAddForm}
                        accessibilityLabel={t('products.add', 'Add')}
                    >
                        <Ionicons name="add" size={22} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductCard}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7C3AED" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-16 px-6">
                            <Ionicons name="fast-food-outline" size={64} color="#6b7280" />
                            <Text className="text-text text-lg font-semibold text-center mt-4">{t('products.no_products', 'No products found')}</Text>
                            <Text className="text-subtext text-center mt-1">{t('products.no_products_hint', 'Try adding a new product or changing filters.')}</Text>
                            <TouchableOpacity className="bg-primary px-6 py-3 rounded-xl mt-5" onPress={openAddForm}>
                                <Text className="text-white font-semibold">{t('products.add_first', 'Add Your First Product')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 20, paddingHorizontal: 16 }}
                />
            )}

            <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFormModal(false)}>
                <View className="flex-1 bg-background">
                    <SafeAreaView className="flex-1">
                        <View className="px-4 py-3 border-b border-gray-800 flex-row items-center justify-between">
                            <Text className="text-text text-xl font-bold">
                                {editingProduct ? t('products.edit', 'Edit') : t('products.add', 'Add')} {t('products.title', 'Products').slice(0, -1)}
                            </Text>
                            <TouchableOpacity onPress={() => setShowFormModal(false)}>
                                <Ionicons name="close" size={28} color="#f9fafb" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
                            <Text className="text-subtext mb-1">Name</Text>
                            <TextInput value={formName} onChangeText={setFormName} placeholder="Product name" placeholderTextColor="#6b7280" className="bg-card text-text rounded-xl px-4 py-3 mb-3" />

                            <Text className="text-subtext mb-1">Description</Text>
                            <TextInput value={formDescription} onChangeText={setFormDescription} placeholder="Description (optional)" placeholderTextColor="#6b7280" className="bg-card text-text rounded-xl px-4 py-3 mb-3" multiline />

                            <Text className="text-subtext mb-1">Image URL</Text>
                            <TextInput value={formImageUrl} onChangeText={setFormImageUrl} placeholder="https://..." placeholderTextColor="#6b7280" className="bg-card text-text rounded-xl px-4 py-3 mb-3" autoCapitalize="none" />

                            <Text className="text-subtext mb-1">Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        className={`px-4 py-2 rounded-full ${formCategoryId === cat.id ? 'bg-primary' : 'bg-card'}`}
                                        onPress={() => setFormCategoryId(cat.id)}
                                    >
                                        <Text className={`${formCategoryId === cat.id ? 'text-white' : 'text-subtext'} font-semibold`}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text className="text-subtext mt-2 mb-1">Price (€)</Text>
                            <TextInput value={formPrice} onChangeText={setFormPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#6b7280" className="bg-card text-text rounded-xl px-4 py-3 mb-3" />

                            <View className="flex-row items-center justify-between bg-card rounded-xl px-4 py-3 mb-3">
                                <Text className="text-text font-medium">Available</Text>
                                <Switch value={formIsAvailable} onValueChange={setFormIsAvailable} trackColor={{ false: '#6b7280', true: '#7C3AED' }} thumbColor="#fff" />
                            </View>

                            <View className="flex-row items-center justify-between bg-card rounded-xl px-4 py-3 mb-3">
                                <Text className="text-text font-medium">On Sale</Text>
                                <Switch value={formIsOnSale} onValueChange={setFormIsOnSale} trackColor={{ false: '#6b7280', true: '#7C3AED' }} thumbColor="#fff" />
                            </View>

                            {formIsOnSale && (
                                <>
                                    <Text className="text-subtext mb-1">Sale Discount (%)</Text>
                                    <TextInput value={formSalePrice} onChangeText={setFormSalePrice} keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#6b7280" className="bg-card text-text rounded-xl px-4 py-3 mb-3" />
                                </>
                            )}

                            <View className="flex-row gap-3 mt-3">
                                <TouchableOpacity className="flex-1 bg-gray-700 rounded-xl py-3 items-center" onPress={() => setShowFormModal(false)}>
                                    <Text className="text-subtext font-semibold">{t('common.cancel', 'Cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className="flex-1 bg-primary rounded-xl py-3 items-center" onPress={handleSubmitProduct} disabled={submitting}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">{t('common.save', 'Save')}</Text>}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
