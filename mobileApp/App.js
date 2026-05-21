import { WebView } from 'react-native-webview';
import { View, StatusBar } from 'react-native';

const WEB_URL = 'http://192.168.0.5:5173'; // ← 로컬 IP로 반드시 수정

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden />
      <WebView
        source={{ uri: WEB_URL }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

