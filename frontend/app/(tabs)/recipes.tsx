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
import { recipesApi, favoritesApi, conceptsApi } from '../../src/services/api';
import { RecipeCard } from '../../src/types';

const CATEGORIES = [
  { value: 'All', label: 'All', emoji: '🔥' },
  { value: 'chicken', label: 'Chicken', emoji: '🍗' },
  { value: 'mexican', label: 'Mexican', emoji: '🌮' },
  { value: 'pasta', label: 'Pasta', emoji: '🍝' },
  { value: 'salad', label: 'Salad', emoji: '🥗' },
  { value: 'burgers', label: 'Burgers', emoji: '🍔' },
  { value: 'pizza', label: 'Pizza', emoji: '🍕' },
  { value: 'bowls', label: 'Bowls', emoji: '🥘' },
  { value: 'crockpot', label: 'Crockpot', emoji: '🍲' },
  { value: 'sheet-pan', label: 'Sheet Pan', emoji: '🫕' },
  { value: 'dessert', label: 'Dessert', emoji: '🍰' },
  { value: 'breakfast', label: 'Breakfast', emoji: '🥞' },
  { value: 'sides', label: 'Sides', emoji: '🥦' },
  { value: 'trending', label: 'Trending', emoji: '📈' },
];

const CATEGORY_COLORS = [
  '#FDDCC9', '#FEE2CC', '#FFF3CD', '#FFE0DB',
  '#D4EDDA', '#F5E0C3', '#FFD6D6', '#E8DFFF',
  '#FFF0E8', '#D6EAF8', '#F0D6E8', '#FEF3C7',
  '#D1FAE5', '#E5E7EB',
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
  const [myRecipes, setMyRecipes] = useState<RecipeCard[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [proteinType, setProteinType] = useState('');
  const [cuisineStyle, setCuisineStyle] = useState('');
  const [cookingMethod, setCookingMethod] = useState('');
  const [showTagFilters, setShowTagFilters] = useState(false);
  const [newThisWeek, setNewThisWeek] = useState<any[]>([]);
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

  const fetchMyRecipes = useCallback(async () => {
    try {
      const data = await recipesApi.getMyGenerated();
      setMyRecipes(data.recipes || []);
    } catch (err) {
      console.error('Failed to fetch my recipes:', err);
    }
  }, []);

  const fetchNewThisWeek = useCallback(async () => {
    try {
      const data = await conceptsApi.getNewThisWeek();
      setNewThisWeek(data.concepts || []);
    } catch (err) {
      // Silently fail — shelf just won't show
      console.error('Failed to fetch new concepts:', err);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
    fetchMyRecipes();
    fetchNewThisWeek();
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

  // Render a featured hero card (first recipe)
  const renderHeroCard = (item: RecipeCard) => {
    const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);
    const calories = item.nutrition?.calories;

    return (
      <View className="px-5 mb-5">
        {/* Featured section header */}
        <View className="flex-row items-baseline justify-between mb-3.5">
          <Text className="text-xl font-serif-bold text-warm-dark">Featured</Text>
          <Text className="text-[13px] font-sans-semibold text-orange" style={{ letterSpacing: 0.3 }}>See all →</Text>
        </View>

        <TouchableOpacity
          testID="recipe-card"
          className="rounded-3xl overflow-hidden"
          style={{ height: 240, shadowColor: '#2D2520', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8 }}
          onPress={() => router.push(`/recipes/${item.id}`)}
          activeOpacity={0.9}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} className="w-full h-full" contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View className="w-full h-full bg-cream-dark items-center justify-center">
              <Text className="text-6xl">🍽️</Text>
            </View>
          )}
          {/* Favorite button overlay */}
          <View className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,251,245,0.2)' }}>
            <Ionicons name="heart" size={20} color="#E8445A" />
          </View>
          {/* Gradient overlay */}
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-16" style={{ backgroundColor: 'rgba(30,22,18,0.55)' }}>
            <View className="flex-row gap-2 mb-2.5">
              {totalTime > 0 && (
                <View className="flex-row items-center px-2.5 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,251,245,0.18)' }}>
                  <Ionicons name="time-outline" size={13} color="#FFFBF5" />
                  <Text className="text-cream text-[11px] font-sans-semibold ml-1">{totalTime} min</Text>
                </View>
              )}
              {calories && (
                <View className="flex-row items-center px-2.5 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,251,245,0.18)' }}>
                  <Ionicons name="flame-outline" size={13} color="#FFFBF5" />
                  <Text className="text-cream text-[11px] font-sans-semibold ml-1">{calories} cal</Text>
                </View>
              )}
              {item.dietaryTags?.includes('high-protein') && (
                <View className="flex-row items-center px-2.5 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.25)' }}>
                  <Text className="text-cream text-[11px] font-sans-bold">HIGH PROTEIN</Text>
                </View>
              )}
            </View>
            <Text className="text-cream font-serif-bold" style={{ fontSize: 24, lineHeight: 29, letterSpacing: -0.3 }} numberOfLines={2}>{item.title}</Text>
            {item.description && (
              <Text className="text-[13px] mt-1.5 font-sans" style={{ color: 'rgba(255,251,245,0.7)' }} numberOfLines={1}>{item.description}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Render a compact recipe card (for 2-up grid)
  const renderSmallCard = (item: RecipeCard) => {
    const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);
    const calories = item.nutrition?.calories;

    return (
      <TouchableOpacity
        key={item.id}
        testID="recipe-card"
        className="flex-1 bg-white rounded-2xl overflow-hidden"
        style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
        onPress={() => router.push(`/recipes/${item.id}`)}
        activeOpacity={0.8}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full" style={{ aspectRatio: 1 }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View className="w-full bg-cream-dark items-center justify-center" style={{ aspectRatio: 1 }}>
            <Text className="text-4xl">🍽️</Text>
          </View>
        )}
        <View className="p-3">
          <Text className="text-sm font-serif-semibold text-warm-dark" numberOfLines={2}>{item.title}</Text>
          <View className="flex-row items-center mt-2 gap-3">
            {totalTime > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={12} color="#B8A68E" />
                <Text className="text-xs text-brown-light font-sans-medium ml-1">{totalTime}m</Text>
              </View>
            )}
            {calories && (
              <View className="flex-row items-center">
                <Ionicons name="flame-outline" size={12} color="#B8A68E" />
                <Text className="text-xs text-brown-light font-sans-medium ml-1">{calories}</Text>
              </View>
            )}
            {(item.averageRating ?? 0) > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text className="text-xs text-brown-light font-sans-medium ml-1">{(item.averageRating ?? 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a full-width card
  const renderFullCard = (item: RecipeCard) => {
    const totalTime = (item.prepTimeMinutes || 0) + (item.cookTimeMinutes || 0);
    const calories = item.nutrition?.calories;

    return (
      <TouchableOpacity
        testID="recipe-card"
        className="mx-5 mb-4 bg-white rounded-2xl overflow-hidden"
        style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
        onPress={() => router.push(`/recipes/${item.id}`)}
        activeOpacity={0.8}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="w-full h-40" contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View className="w-full h-40 bg-cream-dark items-center justify-center">
            <Text className="text-5xl">🍽️</Text>
          </View>
        )}
        <View className="p-4">
          <Text className="text-lg font-serif-bold text-warm-dark" numberOfLines={2}>{item.title}</Text>
          {!!item.brand && (
            <Text className="text-xs text-orange font-sans-semibold mt-1">{item.brand}</Text>
          )}
          <View className="flex-row items-center mt-2.5 gap-4">
            {totalTime > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color="#B8A68E" />
                <Text className="text-xs text-brown font-sans-medium ml-1.5">{totalTime} min</Text>
              </View>
            )}
            {calories && (
              <View className="flex-row items-center">
                <Ionicons name="flame-outline" size={14} color="#B8A68E" />
                <Text className="text-xs text-brown font-sans-medium ml-1.5">{calories} cal</Text>
              </View>
            )}
            {(item.averageRating ?? 0) > 0 && (
              <View className="flex-row items-center">
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text className="text-xs text-brown font-sans-medium ml-1.5">{(item.averageRating ?? 0).toFixed(1)}</Text>
              </View>
            )}
          </View>
          {item.dietaryTags?.length > 0 && (
            <View className="flex-row mt-2.5 gap-1.5">
              {item.dietaryTags.slice(0, 2).map(tag => (
                <View key={tag} className="bg-orange-light px-2 py-0.5 rounded-md">
                  <Text className="text-orange text-[10px] font-sans-bold uppercase">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Build the mixed-layout list data
  const buildListData = () => {
    if (recipes.length === 0) return [];
    const items: { type: string; data: any }[] = [];

    // First recipe is hero
    items.push({ type: 'hero', data: recipes[0] });

    // Remaining recipes in alternating pattern: 2-up, full, 2-up, full...
    const remaining = recipes.slice(1);
    let i = 0;
    while (i < remaining.length) {
      // 2-up row
      if (i + 1 < remaining.length) {
        items.push({ type: 'double', data: [remaining[i], remaining[i + 1]] });
        i += 2;
      } else {
        items.push({ type: 'full', data: remaining[i] });
        i += 1;
      }
      // Full-width card
      if (i < remaining.length) {
        items.push({ type: 'full', data: remaining[i] });
        i += 1;
      }
    }
    return items;
  };

  const ListHeader = () => (
    <View>
      {/* New This Week — concept shelf */}
      {newThisWeek.length > 0 && (
        <View className="mb-3">
          <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={14} color="#10b981" />
              <Text className="text-base font-serif-bold text-warm-dark ml-1.5">New This Week</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/concept/browse')}>
              <Text className="text-xs font-sans-semibold text-orange">See all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {newThisWeek.map((concept: any) => {
              const nutrition = concept.defaultVariant?.nutrition;
              return (
                <TouchableOpacity
                  key={concept.id}
                  className="mr-3 w-44 bg-white rounded-2xl overflow-hidden"
                  style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
                  onPress={() => router.push(`/concept/${concept.slug}`)}
                  activeOpacity={0.8}
                >
                  {concept.heroImageUrl ? (
                    <Image
                      source={{ uri: concept.heroImageUrl }}
                      className="w-44 h-24"
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View className="w-44 h-24 items-center justify-center" style={{ backgroundColor: '#ecfdf5' }}>
                      <Ionicons name="leaf-outline" size={28} color="#10b981" />
                    </View>
                  )}
                  <View className="p-3">
                    <Text className="text-sm font-serif-semibold text-warm-dark" numberOfLines={2}>
                      {concept.name}
                    </Text>
                    {concept.tagline && (
                      <Text className="text-[11px] text-brown-light font-sans mt-0.5" numberOfLines={1}>
                        {concept.tagline}
                      </Text>
                    )}
                    <View className="flex-row items-center mt-2 gap-2">
                      {nutrition?.calories && (
                        <View className="flex-row items-center">
                          <Ionicons name="flame-outline" size={11} color="#B8A68E" />
                          <Text className="text-[10px] text-brown-light font-sans-medium ml-0.5">{nutrition.calories} cal</Text>
                        </View>
                      )}
                      <View className="bg-orange-light px-1.5 py-0.5 rounded">
                        <Text className="text-[9px] text-orange font-sans-bold">{concept.variantCount} variants</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Your Recipes section (AI-generated) */}
      {myRecipes.length > 0 && (
        <View className="mb-3">
          <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={14} color="#D4652E" />
              <Text className="text-sm font-sans-semibold text-warm-dark ml-1.5">
                Your Recipes ({myRecipes.length})
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {myRecipes.map((recipe: any) => (
              <TouchableOpacity
                key={recipe.id}
                className="mr-3 w-36 bg-white rounded-xl overflow-hidden"
                style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
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
                  <View className="w-36 h-20 bg-orange-light items-center justify-center">
                    <Ionicons name="sparkles" size={20} color="#D4652E" />
                  </View>
                )}
                <View className="p-2">
                  <Text className="text-xs font-sans-medium text-warm-dark" numberOfLines={2}>
                    {recipe.title}
                  </Text>
                  {recipe.nutrition?.calories && (
                    <Text className="text-[10px] text-brown-light font-sans mt-0.5">{recipe.nutrition.calories} cal</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Favorites section */}
      {favorites.length > 0 && (
        <View className="mb-3">
          <View className="flex-row items-center justify-between px-5 pt-2 pb-2">
            <View className="flex-row items-center">
              <Ionicons name="heart" size={14} color="#E8445A" />
              <Text className="text-sm font-sans-semibold text-warm-dark ml-1.5">
                My Favorites ({favorites.length})
              </Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {favorites.map((fav: any) => {
              const recipe = fav.recipe;
              if (!recipe) return null;
              return (
                <TouchableOpacity
                  key={fav.id}
                  className="mr-3 w-36 bg-white rounded-xl overflow-hidden"
                  style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}
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
                    <View className="w-36 h-20 bg-cream-dark items-center justify-center">
                      <Ionicons name="restaurant-outline" size={20} color="#B8A68E" />
                    </View>
                  )}
                  <View className="p-2">
                    <Text className="text-xs font-sans-medium text-warm-dark" numberOfLines={2}>
                      {recipe.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Section title for all recipes */}
      <View className="flex-row items-center justify-between px-5 mb-3 mt-1">
        <Text className="text-xl font-serif-bold text-warm-dark">All Recipes</Text>
        <Text className="text-xs font-sans-semibold text-orange">{recipes.length}+ recipes</Text>
      </View>
    </View>
  );

  const listData = buildListData();

  const renderListItem = ({ item }: { item: { type: string; data: any } }) => {
    if (item.type === 'hero') {
      return renderHeroCard(item.data);
    }
    if (item.type === 'double') {
      return (
        <View className="flex-row px-5 mb-4 gap-3.5">
          {renderSmallCard(item.data[0])}
          {renderSmallCard(item.data[1])}
        </View>
      );
    }
    return renderFullCard(item.data);
  };

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="bg-warm-dark pt-14 pb-5 px-6">
        <View className="flex-row justify-between items-center">
          <Text className="text-cream text-3xl font-serif-bold tracking-tight">Recipes</Text>
          <View className="flex-row gap-2.5">
            <TouchableOpacity
              testID="profile-icon"
              onPress={() => router.push('/(tabs)/profile')}
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: 'rgba(255,251,245,0.1)' }}
            >
              <Ionicons name="person-circle-outline" size={20} color="#FFFBF5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View className="px-5 py-4 bg-cream">
        <View className="flex-row items-center bg-cream-dark rounded-2xl px-4 border-2 border-cream-deeper">
          <Ionicons name="search" size={18} color="#B8A68E" />
          <TextInput
            className="flex-1 py-3 px-3 text-base text-warm-dark font-sans"
            placeholder="Search recipes..."
            placeholderTextColor="#B8A68E"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchRecipes(1); }}>
              <Ionicons name="close-circle" size={18} color="#B8A68E" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowTagFilters(!showTagFilters)}
            className="ml-2 w-9 h-9 rounded-xl items-center justify-center bg-warm-dark"
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={(selectedTags.length > 0 || proteinType || cuisineStyle || cookingMethod) ? '#D4652E' : '#FFFBF5'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category blocks */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}
      >
        {CATEGORIES.map((cat, idx) => (
          <TouchableOpacity
            key={cat.value}
            className="items-center"
            style={{ gap: 6 }}
            onPress={() => setCategory(cat.value)}
            activeOpacity={0.7}
          >
            <View
              className="w-16 h-16 rounded-2xl items-center justify-center"
              style={{
                backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                borderWidth: category === cat.value ? 2.5 : 0,
                borderColor: '#2D2520',
                shadowColor: category === cat.value ? '#2D2520' : 'transparent',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: category === cat.value ? 0.12 : 0,
                shadowRadius: 8,
                elevation: category === cat.value ? 4 : 0,
              }}
            >
              <Text className="text-2xl">{cat.emoji}</Text>
            </View>
            <Text
              className={`text-xs font-sans-semibold ${category === cat.value ? 'text-warm-dark' : 'text-brown'}`}
              style={{ letterSpacing: 0.2 }}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expandable filter panel */}
      {showTagFilters && (
        <View className="px-4 pb-3 bg-cream">
          {/* Dietary Tags */}
          <Text className="text-xs font-sans-bold text-brown mb-2 px-1 uppercase" style={{ letterSpacing: 1 }}>Dietary</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {DIETARY_TAGS.map(tag => {
              const isActive = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  className={`px-3.5 py-1.5 rounded-full ${
                    isActive ? 'bg-warm-dark' : 'bg-white border border-cream-deeper'
                  }`}
                  onPress={() => toggleTag(tag)}
                >
                  <Text className={`text-xs font-sans-semibold ${isActive ? 'text-cream' : 'text-brown'}`}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Protein Type */}
          <Text className="text-xs font-sans-bold text-brown mb-2 px-1 uppercase" style={{ letterSpacing: 1 }}>Protein</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-1.5">
              {PROTEIN_TYPES.map(p => {
                const isActive = proteinType === p.value;
                return (
                  <TouchableOpacity
                    key={p.value}
                    className={`px-3.5 py-1.5 rounded-full ${
                      isActive ? 'bg-warm-dark' : 'bg-white border border-cream-deeper'
                    }`}
                    onPress={() => setProteinType(isActive ? '' : p.value)}
                  >
                    <Text className={`text-xs font-sans-semibold ${isActive ? 'text-cream' : 'text-brown'}`}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Cuisine Style */}
          <Text className="text-xs font-sans-bold text-brown mb-2 px-1 uppercase" style={{ letterSpacing: 1 }}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-1.5">
              {CUISINE_STYLES.map(c => {
                const isActive = cuisineStyle === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    className={`px-3.5 py-1.5 rounded-full ${
                      isActive ? 'bg-warm-dark' : 'bg-white border border-cream-deeper'
                    }`}
                    onPress={() => setCuisineStyle(isActive ? '' : c.value)}
                  >
                    <Text className={`text-xs font-sans-semibold ${isActive ? 'text-cream' : 'text-brown'}`}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Cooking Method */}
          <Text className="text-xs font-sans-bold text-brown mb-2 px-1 uppercase" style={{ letterSpacing: 1 }}>Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-1.5">
              {COOKING_METHODS.map(m => {
                const isActive = cookingMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    className={`px-3.5 py-1.5 rounded-full ${
                      isActive ? 'bg-warm-dark' : 'bg-white border border-cream-deeper'
                    }`}
                    onPress={() => setCookingMethod(isActive ? '' : m.value)}
                  >
                    <Text className={`text-xs font-sans-semibold ${isActive ? 'text-cream' : 'text-brown'}`}>
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
              className="px-3.5 py-1.5 rounded-full bg-orange-light self-start"
              onPress={() => {
                setSelectedTags([]);
                setProteinType('');
                setCuisineStyle('');
                setCookingMethod('');
              }}
            >
              <Text className="text-xs text-orange font-sans-bold">Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recipe list */}
      {loading && recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#D4652E" />
        </View>
      ) : recipes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="search-outline" size={48} color="#B8A68E" />
          <Text className="text-brown-light mt-3 text-center font-sans">No recipes found. Try a different search or category.</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderListItem}
          keyExtractor={(item, index) => `${item.type}-${index}`}
          contentContainerStyle={{ paddingVertical: 8 }}
          ListHeaderComponent={ListHeader}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          ListFooterComponent={
            hasMore ? <ActivityIndicator color="#D4652E" className="py-4" /> : null
          }
        />
      )}
    </View>
  );
}
