import { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { recipesApi } from '../../src/services/api';

const CATEGORIES = ['All', 'burger', 'chicken', 'pizza', 'mexican', 'breakfast', 'salad', 'sides', 'dessert'];

interface RecipeCard {
  id: string;
  title: string;
  slug: string;
  description: string;
  brand?: string;
  category: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  servings: number;
  averageRating: number;
  nutrition: any;
  dietaryTags: string[];
}

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecipes = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params: any = { page: pageNum, limit: 12 };
      if (category !== 'All') params.category = category;
      if (search.trim()) params.search = search.trim();

      const data = await recipesApi.getRecipes(params);
      const newRecipes = data.recipes || [];

      if (append) {
        setRecipes(prev => [...prev, ...newRecipes]);
      } else {
        setRecipes(newRecipes);
      }
      setHasMore(newRecipes.length === 12);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchRecipes(1);
  }, [category]);

  const handleSearch = () => {
    fetchRecipes(1);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchRecipes(page + 1, true);
    }
  };

  const renderRecipe = ({ item }: { item: RecipeCard }) => {
    const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);
    const calories = item.nutrition?.calories;

    return (
      <TouchableOpacity
        className="bg-white rounded-xl shadow-sm mb-3 mx-4 overflow-hidden"
        onPress={() => router.push(`/recipes/${item.id}`)}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-40" contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View className="w-full h-40 bg-gray-200 items-center justify-center">
            <Ionicons name="restaurant-outline" size={40} color="#d1d5db" />
          </View>
        )}
        <View className="p-3">
          <Text className="text-base font-semibold text-gray-800" numberOfLines={1}>
            {item.title}
          </Text>
          {item.brand && (
            <Text className="text-xs text-primary-600 mt-0.5">{item.brand}</Text>
          )}
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
            {item.description}
          </Text>
          <View className="flex-row items-center mt-2 gap-3">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1">{totalTime} min</Text>
            </View>
            {calories && (
              <View className="flex-row items-center">
                <Ionicons name="flame-outline" size={14} color="#6b7280" />
                <Text className="text-xs text-gray-500 ml-1">{calories} cal</Text>
              </View>
            )}
            <View className="flex-row items-center">
              <Ionicons name="speedometer-outline" size={14} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1 capitalize">{item.difficulty}</Text>
            </View>
            {item.averageRating > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text className="text-xs text-gray-500 ml-1">{item.averageRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search bar */}
      <View className="px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            className="flex-1 py-2.5 px-2 text-sm text-gray-800"
            placeholder="Search recipes..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchRecipes(1); }}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category filters */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full mr-2 ${
              category === item ? 'bg-primary-500' : 'bg-white border border-gray-200'
            }`}
            onPress={() => setCategory(item)}
          >
            <Text className={`text-sm ${category === item ? 'text-white font-medium' : 'text-gray-600'}`}>
              {item === 'All' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Recipe list */}
      {loading && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="search-outline" size={48} color="#d1d5db" />
          <Text className="text-gray-400 mt-3 text-center">No recipes found. Try a different search or category.</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipe}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            hasMore ? <ActivityIndicator color="#10b981" className="py-4" /> : null
          }
        />
      )}
    </View>
  );
}
