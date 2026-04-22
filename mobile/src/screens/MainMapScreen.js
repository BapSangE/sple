import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { withSpring, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// 현재 WebView와 API 호출에 사용할 백엔드 주소 (환경변수로 분리)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.16.30.59:8000';

export default function MainMapScreen() {
  const [hasFirstPlace, setHasFirstPlace] = useState(false);
  
  // API 연동을 위한 상태 관리
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedPlaces, setAnalyzedPlaces] = useState([]);
  
  // 툴팁 애니메이션 (위아래 바운스)
  const tooltipY = useSharedValue(0);
  
  useEffect(() => {
    if (!hasFirstPlace) {
      tooltipY.value = withRepeat(
        withSequence(
          withTiming(-10, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1, // infinite
        true
      );
    }
  }, [hasFirstPlace]);

  const animatedTooltipStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: tooltipY.value }],
      opacity: hasFirstPlace ? 0 : 1,
    };
  });

  // 장소 분석 API 호출
  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      Alert.alert('알림', '인스타그램 링크나 텍스트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setAnalyzedPlaces([]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: inputText }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setAnalyzedPlaces(data.data);
      } else {
        Alert.alert('분석 실패', data.message || '장소 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버와 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // 장소 저장 API 호출
  const handleSavePlace = async (place) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/save-place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: place.name,
          address: place.address || '',
          description: place.description || '',
          url: inputText, // 원본 링크 저장
          lat: place.lat || null,
          lng: place.lng || null,
          rating: place.rating || 0,
          tags: place.tags || [],
          categories: place.categories || [],
          detailed_highlights: place.detailed_highlights || '',
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        Alert.alert('성공', `'${place.name}' 장소가 저장되었습니다!`);
        setHasFirstPlace(true);
        setModalVisible(false);
        setInputText('');
        setAnalyzedPlaces([]);
        // TODO: 지도 리로드 또는 마커 업데이트 로직 추가
      } else {
        Alert.alert('저장 실패', data.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      {/* 맵뷰: 브라우저 환경 등에서 카카오 맵 API를 렌더링하도록 WebView 사용. */}
      <WebView 
        source={{ uri: API_BASE_URL }} 
        style={styles.map}
      />

      {/* 가이드 액션 툴팁 (Cold Start 방어) */}
      {!hasFirstPlace && (
        <Animated.View style={[styles.tooltipContainer, animatedTooltipStyle]}>
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>인스타에서 공유하기를 눌러{'\n'}첫 맛집을 추가해 보세요!</Text>
            <View style={styles.tooltipArrow} />
          </View>
        </Animated.View>
      )}

      {/* FAB 추가 버튼 */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setModalVisible(true)} 
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* 바텀 시트 영역 (간편 예시) */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleBar} />
        <Text style={styles.bottomSheetTitle}>나의 핫플 리스트</Text>
        {!hasFirstPlace ? (
          <Text style={styles.emptyText}>아직 핫플이 없습니다.</Text>
        ) : (
          <Text style={styles.listText}>새 핫플이 추가되었습니다!</Text>
        )}
      </View>

      {/* 핫플 추가 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새로운 핫플 추가</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>닫기</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="인스타그램 링크나 텍스트를 붙여넣으세요"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            <TouchableOpacity 
              style={[styles.analyzeButton, isLoading && styles.buttonDisabled]} 
              onPress={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.analyzeButtonText}>AI로 정보 추출하기</Text>
              )}
            </TouchableOpacity>

            {/* 분석 결과 리스트 */}
            {analyzedPlaces.length > 0 && (
              <ScrollView style={styles.resultContainer}>
                <Text style={styles.resultTitle}>추출된 장소 ({analyzedPlaces.length})</Text>
                {analyzedPlaces.map((place, index) => (
                  <View key={index} style={styles.placeCard}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    <Text style={styles.placeAddress}>{place.address}</Text>
                    <Text style={styles.placeDesc} numberOfLines={2}>{place.description}</Text>
                    <TouchableOpacity 
                      style={styles.saveButton}
                      onPress={() => handleSavePlace(place)}
                    >
                      <Text style={styles.saveButtonText}>내 지도에 저장</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  tooltipContainer: {
    position: 'absolute',
    bottom: 120, // FAB보다 위에 위치
    right: 20,
    alignItems: 'flex-end',
  },
  tooltipBubble: {
    backgroundColor: '#00D09E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'InterSemiBold',
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#00D09E',
    position: 'absolute',
    bottom: -8,
    right: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 50, // 바텀시트 위에 띄움
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF5A5F', // Primary 코랄
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5A5F',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#FFF',
    lineHeight: 34,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 100, // 최소 노출 높이
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E1E1E',
    fontFamily: 'Manrope',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#868E96',
    fontFamily: 'Inter',
  },
  listText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B4EFF',
    fontFamily: 'Inter',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E1E',
    fontFamily: 'Manrope',
  },
  closeButton: {
    fontSize: 16,
    color: '#868E96',
    fontFamily: 'Inter',
  },
  input: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#1E1E1E',
    fontFamily: 'Inter',
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: '#6B4EFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  analyzeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
  resultContainer: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1E1E1E',
    fontFamily: 'InterSemiBold',
  },
  placeCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E1E',
    marginBottom: 4,
    fontFamily: 'Manrope',
  },
  placeAddress: {
    fontSize: 14,
    color: '#868E96',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  placeDesc: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 16,
    fontFamily: 'Inter',
  },
  saveButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'InterSemiBold',
  },
});