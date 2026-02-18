import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { recipesApi, favoritesApi } from '../../src/services/api';
import { RecipeCard } from '../../src/types';

const CATEGORIES = [
  'All', 'breakfast', 'chicken', 'mexican', 'burgers', 'pasta',
  'salad', 'bowls', 'crockpot', 'sheet-pan', 'pizza', 'sides',
  'dessert', 'trending',
];

const DIETARY_TAGS = [
  'high-protein', 'low-carb', 'vegetarian', 'vegan', 'gluten-free',
  'keto', 'dairy-free', 'quick', 'meal-prep', 'budget-friendly',
];

const PROTEIN_TYPES = [
  { value: '', label: 'Any Protein' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'beef', label: 'Beef' },
  { value: 'pork', label: 'Pork' },
  { value: 'fish', label: 'Fish' },
  { value: 'shrimp', label: 'Shrimp' },
  { value: 'turkey', label: 'Turkey' },
  { value: 'tofu', label: 'Tofu' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'none', label: 'No Meat' },
];

const CUISINE_STYLES = [
  { value: '', label: 'Any Cuisine' },
  { value: 'american', label: 'American' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'italian', label: 'Italian' },
  { value: 'asian', label: 'Asian' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'indian', label: 'Indian' },
];

const COOKING_METHODS = [
  { value: '', label: 'Any Method' },
  { value: 'stovetop', label: 'Stovetop' },
  { value: 'oven', label: 'Oven' },
  { value: 'grill', label: 'Grill' },
  { value: 'crockpot', label: 'Crockpot' },
  { value: 'air-fryer', label: 'Air Fryer' },
  { value: 'sheet-pan', label: 'Sheet Pan' },
  { value: 'no-cook', label: 'No Cook' },
];

export default function RecipesScreen() {
  const [recipes, setRecipes] = useState<RecipeCard[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [proteinType, setProteinType] = useState('');
  const [cuisineStyle, setCuisineStyle] = useState('');
  const [cookingMethod, setCookingMethod] = useState('');
  const [showTagFilters, setShowTagFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchRecipes = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params: any = { page: pageNum, limit: 12 };
      if (category !== 'All') params.category = category;
      if (search.trim()) params.search = search.trim();
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');
      if (proteinType) params.proteinType = proteinType;
      if (cuisineStyle) params.cuisineStyle = cuisineStyle;
      if (cookingMethod) params.cookingMethod = cookingMethod;

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
  }, [category, search, selectedTags, proteinType, cuisineStyle, cookingMethod]);

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await favoritesApi.getFavorites();
      setFavorites(data.savedRecipes || []);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    fetchRecipes(1);
  }, [category, selectedTags, proteinType, cuisineStyle, cookingMethod]);

  const handleSearch = () => {
    fetchRecipes(1);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchRecipes(page + 1, true);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
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
          {!!item.brand && (
            <Text className="text-xs text-primary-600 mt-0.5">{item.brand}</Text>
          )}
          <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
            {item.description || ''}
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
            {(item.averageRating ?? 0) > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text className="text-xs text-gray-500 ml-1">{(item.averageRating ?? 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Favorites section */}
      {favorites.length > 0 && (
        <View className="mb-2">
          <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
            <View className="flex-row items-center">
              <Ionicons name="heart" size={16} color="#ef4444" />
              <Text className="text-sm font-semibold text-gray-700 ml-1.5">
                My Favorites ({favorites.length})
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12 }}
          >
            {favorites.map((fav: any) => {
              const recipe = fav.recipe;
              if (!recipe) return null;
              return (
                <TouchableOpacity
                  key={fav.id}
                  className="mr-3 w-36 bg-white rounded-xl overflow-hidden shadow-sm"
                  onPress={() => router.push(`/recipes/${recipe.id}`)}
                  activeOpacity={0.7}
                >
                  {recipe.imageUrl ? (
                    <Image
                      source={{ uri: recipe.imageUrl }}
                      className="w-36 h-20"
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View className="w-36 h-20 bg-gray-200 items-center justify-center">
                      <Ionicons name="restaurant-outline" size={20} color="#d1d5db" />
                    </View>
                  )}
                  <View className="p-2">
                    <Text className="text-xs font-medium text-gray-800" numberOfLines={2}>
                      {recipe.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );

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
          <TouchableOpacity
            onPress={() => setShowTagFilters(!showTagFilters)}
            className="ml-2"
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={(selectedTags.length > 0 || proteinType || cuisineStyle || cookingMethod) ? '#10b981' : '#9ca3af'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category filters */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className={`px-4 py-1.5 rounded-full mr-2 ${
              category === item ? 'bg-primary-500' : 'bg-white border border-gray-200'
            }`}
            onPress={() => setCategory(item)}
          >
            <Text className={`text-sm ${category === item ? 'text-white font-medium' : 'text-gray-600'}`}>
              {item === 'All' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1).replace('-', ' ')}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Expandable filter panel */}
      {showTagFilters && (
        <View className="px-3 pb-2 bg-gray-50">
          {/* Dietary Tags */}
          <Text className="text-xs font-medium text-gray-500 mb-1.5 px-1">Dietary</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {DIETARY_TAGS.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  className={`px-3 py-1 rounded-full ${
                    isActive ? 'bg-primary-500' : 'bg-white border border-gray-200'
                  }`}
                  onPress={() => toggleTag(tag)}
                >
                  <Text className={`text-xs ${isActive ? 'text-white font-medium' : 'text-gray-600'}`}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Protein Type */}
          <Text className="text-xs font-medium text-gray-500 mb-1.5 px-1">Protein</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-1.5">
              {PROTEIN_TYPES.map(p => {
                const isActive = proteinType === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    className={`px-3 py-1 rounded-full ${
                      isActive ? 'bg-blue-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setProteinType(isActive ? '' : p.value)}
                  >
                    <Text className={`text-xs ${isActive ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Cuisine Style */}
          <Text className="text-xs font-medium text-gray-500 mb-1.5 px-1">Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-1.5">
              {CUISINE_STYLES.map(c => {
                const isActive = cuisineStyle === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    className={`px-3 py-1 rounded-full ${
                      isActive ? 'bg-orange-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setCuisineStyle(isActive ? '' : c.value)}
                  >
                    <Text className={`text-xs ${isActive ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Cooking Method */}
          <Text className="text-xs font-medium text-gray-500 mb-1.5 px-1">Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-1.5">
              {COOKING_METHODS.map(m => {
                const isActive = cookingMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    className={`px-3 py-1 rounded-full ${
                      isActive ? 'bg-purple-500' : 'bg-white border border-gray-200'
                    }`}
                    onPress={() => setCookingMethod(isActive ? '' : m.value)}
                  >
                    <Text className={`text-xs ${isActive ? 'text-white font-medium' : 'text-gray-600'}`}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Clear all filters */}
          {(selectedTags.length > 0 || proteinType || cuisineStyle || cookingMethod) && (
            <TouchableOpacity
              className="px-3 py-1.5 rounded-full bg-gray-100 self-start"
              onPress={() => {
                setSelectedTags([]);
                setProteinType('');
                setCuisineStyle('');
                setCookingMethod('');
              }}
            >
              <Text className="text-xs text-red-500 font-medium">Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
          ListHeaderComponent={ListHeader}
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
