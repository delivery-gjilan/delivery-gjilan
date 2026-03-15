import { useState } from 'react';
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

interface Product {
    id: string;
    name: string;
    description?: string | null;
    imageUrl?: string | null;
    price: number;
    isOnSale: boolean;
    salePrice?: number | null;
    isAvailable: boolean;
    categoryId: string;
}

interface Category {
    id: string;
    name: string;
    isActive: boolean;
}

export default function ProductsScreen() {
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const { data, loading, refetch } = useQuery(GET_BUSINESS_PRODUCTS, {
        variables: { businessId: user?.businessId || '' },
        skip: !user?.businessId,
    });

    const [createProduct] = useMutation(CREATE_PRODUCT, {
        refetchQueries: ['GetBusinessProducts'],
    });

    const [updateProduct] = useMutation(UPDATE_PRODUCT, {
        refetchQueries: ['GetBusinessProducts'],
    });

    const [deleteProduct] = useMutation(DELETE_PRODUCT, {
        refetchQueries: ['GetBusinessProducts'],
    });

    const products: Product[] = data?.products || [];
    const categories: Category[] = data?.productCategories || [];

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleToggleAvailability = async (product: Product) => {
        try {
            await updateProduct({
                variables: {
                    id: product.id,
                    input: {
                        isAvailable: !product.isAvailable,
                    },
                },
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleDeleteProduct = (productId: string, productName: string) => {
        Alert.alert('Delete Product', `Are you sure you want to delete "${productName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteProduct({ variables: { id: productId } });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (error: any) {
                        Alert.alert('Error', error.message);
                    }
                },
            },
        ]);
    };

    const renderProductCard = ({ item: product }: { item: Product }) => {
        const displayPrice = product.isOnSale && product.salePrice ? product.salePrice : product.price;

        return (
            <View
                className="rounded-2xl p-4 mx-4 mb-4"
                style={{
                    backgroundColor: product.isAvailable ? '#1f2937' : '#111827',
                    borderWidth: 1,
                    borderColor: product.isAvailable ? 'rgba(55, 65, 81, 0.8)' : 'rgba(239, 68, 68, 0.4)',
                }}
            >
                <View className="flex-row">
                    {/* Product Image */}
                    <View className="w-20 h-20 rounded-xl bg-background overflow-hidden mr-3">
                        {product.imageUrl ? (
                            <Image
                                source={{ uri: product.imageUrl }}
                                style={{ width: '100%', height: '100%' }}
                                contentFit="cover"
                            />
                        ) : (
                            <View className="flex-1 items-center justify-center">
                                <Ionicons name="image-outline" size={32} color="#6b7280" />
                            </View>
                        )}
                    </View>

                    {/* Product Info */}
                    <View className="flex-1">
                        <View className="flex-row items-start justify-between mb-1">
                            <Text className="text-text font-semibold text-base flex-1" numberOfLines={2}>
                                {product.name}
                            </Text>
                            <TouchableOpacity
                                className="ml-2"
                                onPress={() => handleToggleAvailability(product)}
                            >
                                <View
                                    className={`w-12 h-6 rounded-full justify-center ${
                                        product.isAvailable ? 'bg-success' : 'bg-gray-600'
                                    }`}
                                >
                                    <View
                                        className={`w-5 h-5 bg-white rounded-full ${
                                            product.isAvailable ? 'ml-6' : 'ml-0.5'
                                        }`}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {product.description && (
                            <Text className="text-subtext text-xs mb-1" numberOfLines={2}>
                                {product.description}
                            </Text>
                        )}

                        <View className="flex-row items-center justify-between mt-1">
                            <View className="flex-row items-center">
                                <Text className="text-success font-bold text-lg">${displayPrice.toFixed(2)}</Text>
                                {product.isOnSale && (
                                    <Text className="text-subtext line-through ml-2 text-sm">
                                        ${product.price.toFixed(2)}
                                    </Text>
                                )}
                            </View>
                            <Text
                                className="text-xs font-semibold"
                                style={{ color: product.isAvailable ? '#10b981' : '#ef4444' }}
                            >
                                {product.isAvailable ? 'Available' : 'Unavailable'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-gray-700">
                    <TouchableOpacity
                        className="flex-1 bg-primary/20 py-2 rounded-lg flex-row items-center justify-center"
                        onPress={() => {
                            setEditingProduct(product);
                            setShowAddModal(true);
                        }}
                    >
                        <Ionicons name="pencil" size={16} color="#0b89a9" />
                        <Text className="text-primary font-semibold ml-1 text-sm">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-danger/20 py-2 rounded-lg flex-row items-center justify-center"
                        onPress={() => handleDeleteProduct(product.id, product.name)}
                    >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text className="text-danger font-semibold ml-1 text-sm">Delete</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Badges */}
                <View className="flex-row gap-2 mt-2">
                    {!product.isAvailable && (
                        <View className="bg-danger/20 px-2 py-1 rounded">
                            <Text className="text-danger text-xs font-semibold">Unavailable</Text>
                        </View>
                    )}
                    {product.isOnSale && (
                        <View className="bg-warning/20 px-2 py-1 rounded">
                            <Text className="text-warning text-xs font-semibold">On Sale</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Header */}
            <View className="px-4 py-3 border-b border-gray-800">
                <View className="flex-row items-center justify-between mb-3">
                    <View>
                        <Text className="text-text text-2xl font-bold">Products</Text>
                        <Text className="text-subtext">{filteredProducts.length} items</Text>
                    </View>
                    <TouchableOpacity
                        className="bg-primary w-12 h-12 rounded-full items-center justify-center"
                        onPress={() => {
                            setEditingProduct(null);
                            setShowAddModal(true);
                        }}
                    >
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View className="bg-card rounded-xl flex-row items-center px-4 py-3">
                    <Ionicons name="search" size={20} color="#9ca3af" />
                    <TextInput
                        className="flex-1 ml-2 text-text"
                        placeholder="Search products..."
                        placeholderTextColor="#6b7280"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#6b7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Category Filters */}
            {categories.length > 0 && (
                <View className="px-4 py-3">
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={[{ id: null, name: 'All' }, ...categories]}
                        keyExtractor={(item) => item.id || 'all'}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                className={`px-4 py-2 rounded-full mr-2 ${
                                    selectedCategory === item.id ? 'bg-primary' : 'bg-card'
                                }`}
                                onPress={() => setSelectedCategory(item.id)}
                            >
                                <Text
                                    className={`font-semibold text-sm ${
                                        selectedCategory === item.id ? 'text-white' : 'text-subtext'
                                    }`}
                                >
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

            {/* Products List */}
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0b89a9" />
                </View>
            ) : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProductCard}
                    refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#0b89a9" />}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-12">
                            <Ionicons name="fast-food-outline" size={64} color="#6b7280" />
                            <Text className="text-subtext text-center mt-4">No products found</Text>
                            <TouchableOpacity
                                className="bg-primary px-6 py-3 rounded-xl mt-4"
                                onPress={() => {
                                    setEditingProduct(null);
                                    setShowAddModal(true);
                                }}
                            >
                                <Text className="text-white font-semibold">Add Your First Product</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
                />
            )}

            {/* Add/Edit Modal - Placeholder */}
            <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
                <View className="flex-1 bg-background">
                    <SafeAreaView className="flex-1">
                        <View className="px-4 py-3 border-b border-gray-800 flex-row items-center justify-between">
                            <Text className="text-text text-xl font-bold">
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={28} color="#f9fafb" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="flex-1 px-4 py-4">
                            <Text className="text-subtext text-center py-8">
                                Full product form would go here with name, description, price, image upload, category
                                selection, availability toggle, etc.
                            </Text>
                        </ScrollView>
                    </SafeAreaView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
