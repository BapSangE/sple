import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import SplashScreen from './src/screens/SplashScreen';
import MainMapScreen from './src/screens/MainMapScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope: Manrope_700Bold,
    Inter: Inter_400Regular,
    InterSemiBold: Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return null; // Or a simple loading view
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainMap" component={MainMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
