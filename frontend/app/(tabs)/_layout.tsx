import { Tabs, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function ProfileHeaderButton() {
  return (
    <TouchableOpacity
      testID="profile-icon"
      onPress={() => router.push('/(tabs)/profile')}
      style={{ marginRight: 12 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="person-circle-outline" size={26} color="#FFFBF5" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4652E',
        tabBarInactiveTintColor: '#B8A68E',
        tabBarStyle: {
          backgroundColor: '#FFFBF5',
          borderTopColor: 'rgba(139,115,85,0.1)',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'DMSans_600SemiBold',
          letterSpacing: 0.3,
        },
        headerStyle: {
          backgroundColor: '#2D2520',
        },
        headerTintColor: '#FFFBF5',
        headerTitleStyle: {
          fontFamily: 'PlayfairDisplay_700Bold',
          fontSize: 20,
        },
        headerRight: () => <ProfileHeaderButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chat AI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="meal-prep"
        options={{
          href: null,
          headerTitle: 'Smart Meal Prep',
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'My Food',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
